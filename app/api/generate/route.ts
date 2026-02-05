import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import matter from 'gray-matter';
import { GenerateRequest, GenerateResponse, SoulFrontmatter, SkillFrontmatter } from '@/types';

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
        soul:souls(content)
      `)
      .eq('event_id', event.id)
      .eq('is_active', true);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 });
    }

    // 3. Pick Random Agent (or could be weighted/strategic)
    const agent = agents[Math.floor(Math.random() * agents.length)];
    
    // 4. Parse Skill and Soul
    const skillDoc = matter(agent.skill.content);
    const soulDoc = matter(agent.soul.content);
    
    const skillData = skillDoc.data as SkillFrontmatter;
    const soulData = soulDoc.data as SoulFrontmatter;

    // 5. Construct System Prompt with clear Soul/Skill separation
    const systemPrompt = `You are ${soulData.identity}, known as "${soulData.archetype}".

## YOUR IDENTITY (Soul)
${soulDoc.content}

Core Values: ${soulData.core_values?.join(', ') || 'Wisdom, Insight'}
Astrological Signature: House ${soulData.house}, ${soulData.sign}

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
      temperature: 0.8, // Slightly higher for personality
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

    // 7. Save Post to DB
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          event_agent_id: agent.id,
          content: content,
          metadata: {
            themes: ['Live'],
            context: context.slice(0, 100), // Store truncated context
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
    } as GenerateResponse & { agent: any });
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
