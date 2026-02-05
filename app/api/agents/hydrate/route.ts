import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import matter from 'gray-matter';
import { Agent, SoulFrontmatter, SkillFrontmatter } from '@/types';

// House colors based on astrological houses (1-12)
const HOUSE_COLORS = [
  '#EF4444', // 1 - Aries - Red
  '#F97316', // 2 - Taurus - Orange
  '#F59E0B', // 3 - Gemini - Amber
  '#10B981', // 4 - Cancer - Emerald
  '#06B6D4', // 5 - Leo - Cyan
  '#3B82F6', // 6 - Virgo - Blue
  '#6366F1', // 7 - Libra - Indigo
  '#8B5CF6', // 8 - Scorpio - Violet
  '#EC4899', // 9 - Sagittarius - Pink
  '#64748B', // 10 - Capricorn - Slate
  '#71717A', // 11 - Aquarius - Zinc
  '#A1A1AA', // 12 - Pisces - Gray
];

function getHouseColor(house: number): string {
  return HOUSE_COLORS[(house - 1) % 12] || '#64748B';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventSlug = searchParams.get('event') || 'cisco-summit-2026';

  try {
    // 1. Get Event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', eventSlug)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: `Event not found: ${eventSlug}` },
        { status: 404 }
      );
    }

    // 2. Fetch Event Agents with joined Skills and Souls
    const { data: rawAgents, error: agentsError } = await supabase
      .from('event_agents')
      .select(`
        id,
        custom_role,
        is_active,
        skill:skills(id, slug, content),
        soul:souls(id, slug, content)
      `)
      .eq('event_id', event.id)
      .eq('is_active', true);

    if (agentsError) {
      console.error('Agent fetch error:', agentsError);
      throw agentsError;
    }

    if (!rawAgents || rawAgents.length === 0) {
      return NextResponse.json(
        { error: 'No active agents found for this event' },
        { status: 404 }
      );
    }

    // 3. Hydrate agents by parsing frontmatter
    const hydratedAgents: Agent[] = rawAgents.map((agent: any) => {
      // Parse markdown frontmatter
      const skillDoc = matter(agent.skill.content);
      const soulDoc = matter(agent.soul.content);

      const skillData = skillDoc.data as SkillFrontmatter;
      const soulData = soulDoc.data as SoulFrontmatter;

      return {
        id: agent.id,
        name: soulData.identity || soulData.name || 'Unknown Soul',
        role: agent.custom_role || skillData.description || 'Agent',

        skill: {
          description: skillData.description || '',
          tags: skillData.tags || [],
        },

        soul: {
          archetype: soulData.archetype || 'Observer',
          house: soulData.house || 1,
          sign: soulData.sign || 'Unknown',
          values: soulData.core_values || [],
        },

        visual_config: {
          color: getHouseColor(soulData.house || 1),
          house: soulData.house || 1,
          sign: soulData.sign || 'Unknown',
        },
      };
    });

    return NextResponse.json({ agents: hydratedAgents });
  } catch (error) {
    console.error('Hydration Error:', error);
    return NextResponse.json(
      { error: 'Failed to hydrate agents' },
      { status: 500 }
    );
  }
}
