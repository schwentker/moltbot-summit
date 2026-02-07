import { NextResponse } from 'next/server';
import { supabase, createServerClient } from '@/lib/supabase';
import matter from 'gray-matter';
import { DebateRequest, DebateResponse, SoulFrontmatter, SkillFrontmatter, Post } from '@/types';

import {
  calculateAgentWeights,
  selectRespondingAgent,
  selectWeightedAgent,
  filterByTopic,
  getLatestTransit,
  getHouseMappings,
  DEFAULT_TRANSIT,
  Transit,
  WeightedAgent,
} from '@/lib/jyotish';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/v1/chat/completions';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

async function generateWithOllama(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.85,
      max_tokens: 350,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

interface ParsedAgent {
  raw: any;
  skill: { data: SkillFrontmatter; content: string };
  soul: { data: SoulFrontmatter; content: string };
}

function parseAgent(agent: any): ParsedAgent {
  const skillDoc = matter(agent.skill.content);
  const soulDoc = matter(agent.soul.content);
  return {
    raw: agent,
    skill: { data: skillDoc.data as SkillFrontmatter, content: skillDoc.content },
    soul: { data: soulDoc.data as SoulFrontmatter, content: soulDoc.content },
  };
}

function buildDebatePrompt(
  parsed: ParsedAgent,
  eventTitle: string,
  transitContext: string,
  topic: string,
  opponentName: string,
  opponentArchetype: string,
  conversationHistory: string,
  isOpening: boolean
): string {
  const sd = parsed.soul.data;
  return `You are ${sd.identity}, known as "${sd.archetype}".

## YOUR IDENTITY (Soul)
${parsed.soul.content}

Core Values: ${sd.core_values?.join(', ') || 'Wisdom, Insight'}
Astrological Signature: House ${sd.house}, ${sd.sign}${transitContext}

## YOUR METHODOLOGY (Skill)
Role: ${parsed.raw.custom_role || parsed.skill.data.description}
${parsed.skill.content}

## DEBATE CONTEXT
Event: "${eventTitle}"
Topic: "${topic}"
Your opponent: ${opponentName} (${opponentArchetype})

${conversationHistory ? `## CONVERSATION SO FAR\n${conversationHistory}` : ''}

## TASK
${isOpening
    ? 'Open this debate. State your position on the topic clearly and boldly.'
    : `Respond to ${opponentName}'s last point. Challenge, build on, or redirect the conversation.`
  }

CONSTRAINTS:
- Maximum 280 characters
- Write in YOUR voice (${sd.archetype})
- Be substantive, not generic
- Address the topic and your opponent's perspective directly
- Honor your values: ${sd.core_values?.slice(0, 2).join(' and ') || 'truth and wisdom'}`;
}

export async function POST(req: Request) {
  try {
    const { eventSlug, topic, rounds = 3, agentA, agentB }: DebateRequest = await req.json();
    const slug = eventSlug || 'cisco-summit-2026';

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // 1. Get event
    const { data: event } = await supabase
      .from('events')
      .select('id, title')
      .eq('slug', slug)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 2. Fetch active agents
    const { data: agents } = await supabase
      .from('event_agents')
      .select(`
        id,
        custom_role,
        skill:skills(content),
        soul:souls(id, content)
      `)
      .eq('event_id', event.id)
      .eq('is_active', true);

    if (!agents || agents.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 agents for debate' }, { status: 404 });
    }

    // 3. Transit-weighted selection
    let transit: Transit | null = await getLatestTransit(event.id);
    if (!transit) {
      transit = { id: 'default', eventId: event.id, ...DEFAULT_TRANSIT };
    }

    const houseMappings = await getHouseMappings(event.id);

    const agentInfos = agents.map((agent: any) => {
      const soulDoc = matter(agent.soul.content);
      const soulData = soulDoc.data as SoulFrontmatter;
      return {
        id: agent.id,
        soulId: agent.soul.id,
        name: soulData.identity || soulData.name || 'Unknown',
        house: soulData.house || 1,
      };
    });

    let weightedAgents = calculateAgentWeights(transit, houseMappings, agentInfos);
    weightedAgents = filterByTopic(weightedAgents, topic);

    // 4. Select Agent A (highest weight for topic, or specified)
    let selectedA: WeightedAgent | null;
    if (agentA) {
      selectedA = weightedAgents.find(a => a.agentId === agentA) || null;
    } else {
      selectedA = selectWeightedAgent(weightedAgents);
    }

    if (!selectedA) {
      return NextResponse.json({ error: 'Could not select Agent A' }, { status: 404 });
    }

    // 5. Select Agent B (opposing house preference, or specified)
    let selectedB: WeightedAgent | null;
    if (agentB) {
      selectedB = weightedAgents.find(a => a.agentId === agentB) || null;
    } else {
      const agentAInfo = agentInfos.find(a => a.id === selectedA!.agentId);
      selectedB = selectRespondingAgent(
        weightedAgents,
        { id: selectedA.agentId, house: agentAInfo?.house || 1 },
        topic,
        [], // no exclusions for debate partner
        'challenge'
      );
    }

    if (!selectedB) {
      return NextResponse.json({ error: 'Could not select Agent B' }, { status: 404 });
    }

    // Parse both agents
    const agentAData = parseAgent(agents.find((a: any) => a.id === selectedA!.agentId));
    const agentBData = parseAgent(agents.find((a: any) => a.id === selectedB!.agentId));

    const transitContextA = selectedA.activeHouses.length > 0
      ? `\nCelestial Activation: House ${selectedA.activeHouses.join(', ')} active`
      : '';
    const transitContextB = selectedB.activeHouses.length > 0
      ? `\nCelestial Activation: House ${selectedB.activeHouses.join(', ')} active`
      : '';

    // 6. Generate debate rounds
    const posts: Post[] = [];
    let conversationHistory = '';
    let threadId: string | null = null;

    const totalTurns = rounds * 2; // Each round = A speaks + B speaks

    for (let turn = 0; turn < totalTurns; turn++) {
      const isAgentA = turn % 2 === 0;
      const isOpening = turn === 0;

      const speaker = isAgentA ? agentAData : agentBData;
      const opponent = isAgentA ? agentBData : agentAData;
      const selectedSpeaker = isAgentA ? selectedA : selectedB;
      const tCtx = isAgentA ? transitContextA : transitContextB;

      const systemPrompt = buildDebatePrompt(
        speaker,
        event.title,
        tCtx,
        topic,
        opponent.soul.data.identity,
        opponent.soul.data.archetype,
        conversationHistory,
        isOpening
      );

      const userMessage = isOpening
        ? `Open the debate on: "${topic}". Just the post text, nothing else.`
        : `Respond to the last point in the debate. Just the post text, nothing else.`;

      const content = await generateWithOllama(systemPrompt, userMessage);

      if (!content) continue;

      // Save post
      const postData: any = {
        event_agent_id: speaker.raw.id,
        content,
        parent_post_id: posts.length > 0 ? posts[posts.length - 1].id : null,
        thread_id: threadId,
        metadata: {
          themes: ['Debate'],
          reply_type: isOpening ? undefined : (isAgentA ? 'challenge' : 'challenge'),
          responding_to: isOpening ? undefined : opponent.soul.data.identity,
          context: topic.slice(0, 100),
          transit: {
            weight: selectedSpeaker.combinedWeight,
            activeHouses: selectedSpeaker.activeHouses,
            planets: selectedSpeaker.planetaryInfluences,
          },
          model: OLLAMA_MODEL,
        },
      };

      const { data: savedPost, error: insertError } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (insertError || !savedPost) {
        console.error('Debate post insert error:', insertError);
        continue;
      }

      // Set thread_id from first post
      if (turn === 0) {
        threadId = savedPost.id;
        // Update the first post to set its own thread_id
        await supabase
          .from('posts')
          .update({ thread_id: savedPost.id })
          .eq('id', savedPost.id);
        savedPost.thread_id = savedPost.id;
      }

      posts.push(savedPost as Post);

      // Build conversation history for context
      conversationHistory += `${speaker.soul.data.identity}: "${content}"\n`;
    }

    return NextResponse.json({
      success: true,
      threadId,
      posts,
      agents: {
        a: {
          id: agentAData.raw.id,
          name: agentAData.soul.data.identity,
          archetype: agentAData.soul.data.archetype,
        },
        b: {
          id: agentBData.raw.id,
          name: agentBData.soul.data.identity,
          archetype: agentBData.soul.data.archetype,
        },
      },
    } as DebateResponse);
  } catch (error) {
    console.error('Debate Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Debate generation failed' },
      { status: 500 }
    );
  }
}
