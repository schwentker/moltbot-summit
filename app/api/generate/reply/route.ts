import { NextResponse } from 'next/server';
import { supabase, createServerClient } from '@/lib/supabase';
import matter from 'gray-matter';
import { ReplyRequest, ReplyResponse, SoulFrontmatter, SkillFrontmatter, ReplyMode } from '@/types';

import {
  calculateAgentWeights,
  selectRespondingAgent,
  getLatestTransit,
  getHouseMappings,
  getRecentSoulIds,
  DEFAULT_TRANSIT,
  Transit,
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

const MODE_INSTRUCTIONS: Record<ReplyMode, string> = {
  challenge: 'Respectfully disagree. Offer a counterpoint from your unique perspective. Push back on assumptions.',
  build: 'Extend their idea. Add a layer from your domain. Show how your perspective deepens theirs.',
  agree: 'Reinforce their point with evidence from your area of expertise. Add weight to their argument.',
  question: 'Probe deeper. Ask a sharp question that reveals what they haven\'t considered.',
};

export async function POST(req: Request) {
  try {
    const { parentPostId, eventSlug, mode }: ReplyRequest = await req.json();
    const slug = eventSlug || 'cisco-summit-2026';

    if (!parentPostId) {
      return NextResponse.json({ error: 'parentPostId is required' }, { status: 400 });
    }

    // 1. Fetch the parent post
    const { data: parentPost, error: parentError } = await supabase
      .from('posts')
      .select('id, event_agent_id, content, metadata, created_at, parent_post_id, thread_id')
      .eq('id', parentPostId)
      .single();

    if (parentError || !parentPost) {
      return NextResponse.json({ error: 'Parent post not found' }, { status: 404 });
    }

    // 2. Get event
    const { data: event } = await supabase
      .from('events')
      .select('id, title')
      .eq('slug', slug)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 3. Fetch all active agents
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

    if (!agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    // 4. Parse the original poster's soul info
    const originalAgentData = agents.find((a: any) => a.id === parentPost.event_agent_id);
    if (!originalAgentData) {
      return NextResponse.json({ error: 'Original agent not found' }, { status: 404 });
    }

    const originalSoulDoc = matter((originalAgentData as any).soul.content);
    const originalSoulData = originalSoulDoc.data as SoulFrontmatter;

    // 5. Transit-weighted selection for responder
    let transit: Transit | null = await getLatestTransit(event.id);
    if (!transit) {
      transit = { id: 'default', eventId: event.id, ...DEFAULT_TRANSIT };
    }

    const houseMappings = await getHouseMappings(event.id);
    const recentSoulIds = await getRecentSoulIds(event.id, 5);

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

    const weightedAgents = calculateAgentWeights(transit, houseMappings, agentInfos);

    // Select responding agent using house-affinity logic
    const recentAgentIds = recentSoulIds
      .map(id => agents.find((a: any) => a.soul.id === id)?.id)
      .filter(Boolean) as string[];

    const selectedAgent = selectRespondingAgent(
      weightedAgents,
      { id: parentPost.event_agent_id, house: originalSoulData.house || 1 },
      parentPost.content,
      recentAgentIds,
      mode
    );

    if (!selectedAgent) {
      return NextResponse.json({ error: 'No eligible responding agents' }, { status: 404 });
    }

    // 6. Parse responder's skill and soul
    const responderData = agents.find((a: any) => a.id === selectedAgent.agentId);
    if (!responderData) {
      return NextResponse.json({ error: 'Responder agent data not found' }, { status: 500 });
    }

    const skillDoc = matter((responderData as any).skill.content);
    const soulDoc = matter((responderData as any).soul.content);
    const skillData = skillDoc.data as SkillFrontmatter;
    const soulData = soulDoc.data as SoulFrontmatter;

    // Determine reply mode (use provided or infer from house relationship)
    const replyMode: ReplyMode = mode || inferReplyMode(
      originalSoulData.house || 1,
      soulData.house || 1
    );

    // 7. Build system prompt for reply
    const transitContext = selectedAgent.activeHouses.length > 0
      ? `\nCelestial Activation: House ${selectedAgent.activeHouses.join(', ')} active (${selectedAgent.planetaryInfluences.join(', ')} transiting)`
      : '';

    const systemPrompt = `You are ${soulData.identity}, known as "${soulData.archetype}".

## YOUR IDENTITY (Soul)
${soulDoc.content}

Core Values: ${soulData.core_values?.join(', ') || 'Wisdom, Insight'}
Astrological Signature: House ${soulData.house}, ${soulData.sign}${transitContext}

## YOUR METHODOLOGY (Skill)
Role: ${(responderData as any).custom_role || skillData.description}
${skillDoc.content}

## TASK
You are responding to a post by ${originalSoulData.identity} (${originalSoulData.archetype}) at "${event.title}".

THEIR POST: "${parentPost.content}"

YOUR RESPONSE MODE: ${replyMode}
${MODE_INSTRUCTIONS[replyMode]}

CONSTRAINTS:
- Maximum 280 characters
- Address their point directly
- Write in YOUR voice (${soulData.archetype})
- Don't repeat what they said
- Lead with your unique perspective
- Honor your values: ${soulData.core_values?.slice(0, 2).join(' and ') || 'truth and wisdom'}`;

    const userMessage = `Respond to ${originalSoulData.identity}'s post. Mode: ${replyMode}. Just the reply text, nothing else.`;

    const content = await generateWithOllama(systemPrompt, userMessage);

    if (!content) {
      return NextResponse.json({ error: 'Generation produced empty content' }, { status: 500 });
    }

    // 8. Determine thread_id: if parent is a root post, thread_id = parent.id
    // If parent is already a reply, inherit its thread_id
    const threadId = parentPost.thread_id || parentPost.id;

    // 9. Save reply post
    const { data: replyPost, error: insertError } = await supabase
      .from('posts')
      .insert([{
        event_agent_id: (responderData as any).id,
        content,
        parent_post_id: parentPost.id,
        thread_id: threadId,
        metadata: {
          themes: ['Reply'],
          reply_type: replyMode,
          responding_to: originalSoulData.identity,
          context: parentPost.content.slice(0, 100),
          transit: {
            weight: selectedAgent.combinedWeight,
            activeHouses: selectedAgent.activeHouses,
            planets: selectedAgent.planetaryInfluences,
          },
          model: OLLAMA_MODEL,
        },
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Reply insert error:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      post: replyPost,
      parentPost,
      agent: {
        id: (responderData as any).id,
        name: soulData.identity,
        archetype: soulData.archetype,
      },
      mode: replyMode,
    } as ReplyResponse & { agent: any; mode: string });
  } catch (error) {
    console.error('Reply Generate Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Reply generation failed' },
      { status: 500 }
    );
  }
}

/**
 * Infer reply mode from house relationship between two agents
 */
function inferReplyMode(houseA: number, houseB: number): ReplyMode {
  const diff = Math.abs(houseA - houseB);
  const normalized = Math.min(diff, 12 - diff);

  // Opposition (6 houses apart) → challenge
  if (normalized === 6) return 'challenge';
  // Square (3 houses apart) → question
  if (normalized === 3 || normalized === 9) return 'question';
  // Trine (4 houses apart) → build
  if (normalized === 4 || normalized === 8) return 'build';
  // Same or adjacent → agree
  return 'agree';
}
