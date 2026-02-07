import { NextResponse } from 'next/server';
import { supabase, createServerClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import matter from 'gray-matter';
import { GenerateRequest, GenerateResponse, SoulFrontmatter, SkillFrontmatter } from '@/types';

// Jyotish transit integration
import {
  calculateAgentWeights,
  selectAgentExcluding,
  filterByTopic,
  getLatestTransit,
  getHouseMappings,
  getRecentSoulIds,
  DEFAULT_TRANSIT,
  Transit,
  WeightedAgent,
} from '@/lib/jyotish';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { eventSlug, context }: GenerateRequest = await req.json();
    const slug = eventSlug || 'cisco-summit-2026';

    if (!context || context.trim().length === 0) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // 1. Get Event
    const { data: event } = await supabase
      .from('events')
      .select('id, title')
      .eq('slug', slug)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 2. Fetch Active Agents
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

    // ============================================
    // 3. TRANSIT-WEIGHTED AGENT SELECTION
    // ============================================
    
    // Get transit data (or use default)
    let transit: Transit | null = await getLatestTransit(event.id);
    if (!transit) {
      transit = {
        id: 'default',
        eventId: event.id,
        ...DEFAULT_TRANSIT,
      };
    }

    // Get house-speaker mappings
    const houseMappings = await getHouseMappings(event.id);

    // Get recent speakers to avoid repetition
    const recentSoulIds = await getRecentSoulIds(event.id, 5);

    // Parse agent info for weighting
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

    // Calculate weights based on current transit
    let weightedAgents = calculateAgentWeights(transit, houseMappings, agentInfos);

    // Boost agents thematically relevant to context
    weightedAgents = filterByTopic(weightedAgents, context);

    // Select agent (excluding recent speakers)
    const selectedAgent = selectAgentExcluding(
      weightedAgents,
      recentSoulIds.map(id => agents.find((a: any) => a.soul.id === id)?.id).filter(Boolean)
    );

    if (!selectedAgent) {
      return NextResponse.json({ error: 'No eligible agents' }, { status: 404 });
    }

    // Find full agent data
    const agent = agents.find((a: any) => a.id === selectedAgent.agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent data not found' }, { status: 500 });
    }

    // ============================================
    // 4. Parse Skill and Soul
    // ============================================
    
    const skillDoc = matter((agent as any).skill.content);
    const soulDoc = matter((agent as any).soul.content);
    
    const skillData = skillDoc.data as SkillFrontmatter;
    const soulData = soulDoc.data as SoulFrontmatter;

    // 5. Construct System Prompt with transit context
    const transitContext = selectedAgent.activeHouses.length > 0
      ? `\nCelestial Activation: House ${selectedAgent.activeHouses.join(', ')} active (${selectedAgent.planetaryInfluences.join(', ')} transiting)`
      : '';

    const systemPrompt = `You are ${soulData.identity}, known as "${soulData.archetype}".

## YOUR IDENTITY (Soul)
${soulDoc.content}

Core Values: ${soulData.core_values?.join(', ') || 'Wisdom, Insight'}
Astrological Signature: House ${soulData.house}, ${soulData.sign}${transitContext}

## YOUR METHODOLOGY (Skill)
Role: ${agent.custom_role || skillData.description}
${skillDoc.content}

## TASK
You are attending "${event.title}". React to the following moment with a social media post.

CONSTRAINTS:
- Maximum 280 characters
- Write in YOUR voice (${soulData.archetype})
- Be insightful, not generic
- No hashtags unless they feel natural
- Lead with your unique perspective
- Honor your values: ${soulData.core_values?.slice(0, 2).join(' and ') || 'truth and wisdom'}`;

    // 6. Generate with Claude
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 350,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: `React to this moment:\n\n"${context}"\n\nWrite your post now. Just the post text, nothing else.`,
        },
      ],
      system: systemPrompt,
    });

    const content =
      completion.content[0].type === 'text'
        ? completion.content[0].text.trim()
        : '';

    if (!content) {
      return NextResponse.json(
        { error: 'Generation produced empty content' },
        { status: 500 }
      );
    }

    // 7. Save Post to DB with transit metadata
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          event_agent_id: agent.id,
          content: content,
          metadata: {
            themes: ['Live'],
            context: context.slice(0, 100),
            transit: {
              weight: selectedAgent.combinedWeight,
              activeHouses: selectedAgent.activeHouses,
              planets: selectedAgent.planetaryInfluences,
            },
          },
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Post insert error:', insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      post,
      agent: {
        id: agent.id,
        name: soulData.identity,
        archetype: soulData.archetype,
      },
      transit: {
        weight: selectedAgent.combinedWeight,
        activeHouses: selectedAgent.activeHouses,
        planetaryInfluences: selectedAgent.planetaryInfluences,
      },
    } as GenerateResponse & { agent: any; transit: any });
  } catch (error) {
    console.error('Generate Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      },
      { status: 500 }
    );
  }
}
