import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import matter from 'gray-matter';
import { SoulFrontmatter } from '@/types';

import {
  calculateAgentWeights,
  calculateHouseActivations,
  getLatestTransit,
  getHouseMappings,
  DEFAULT_TRANSIT,
  Transit,
} from '@/lib/jyotish';

/**
 * GET /api/transit?event=cisco-summit-2026
 * 
 * Returns current transit state and weighted agents for debugging
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventSlug = searchParams.get('event') || 'cisco-summit-2026';

  try {
    // 1. Get Event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('slug', eventSlug)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: `Event not found: ${eventSlug}` },
        { status: 404 }
      );
    }

    // 2. Get Transit (or default)
    let transit: Transit | null = await getLatestTransit(event.id);
    let usingDefault = false;
    
    if (!transit) {
      usingDefault = true;
      transit = {
        id: 'default',
        eventId: event.id,
        ...DEFAULT_TRANSIT,
      };
    }

    // 3. Calculate house activations
    const houseActivations = calculateHouseActivations(transit);

    // 4. Get house mappings
    const houseMappings = await getHouseMappings(event.id);

    // 5. Get agents for weighting
    const { data: agents } = await supabase
      .from('event_agents')
      .select(`
        id,
        custom_role,
        soul:souls(id, content)
      `)
      .eq('event_id', event.id)
      .eq('is_active', true);

    if (!agents || agents.length === 0) {
      return NextResponse.json(
        { error: 'No agents found' },
        { status: 404 }
      );
    }

    // 6. Parse agent info
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

    // 7. Calculate weighted agents
    const weightedAgents = calculateAgentWeights(transit, houseMappings, agentInfos);

    // 8. Find dominant influences
    const dominantHouse = houseActivations.reduce((max, curr) => 
      curr.score > max.score ? curr : max
    );

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        slug: eventSlug,
      },
      transit: {
        id: transit.id,
        capturedAt: transit.capturedAt,
        ascendant: {
          sign: transit.ascendantSign,
          degree: transit.ascendantDegree,
        },
        usingDefault,
        source: transit.source,
      },
      houseActivations: houseActivations
        .filter(h => h.score > 0)
        .map(h => ({
          house: h.house,
          score: Math.round(h.score),
          planets: h.planets,
        })),
      dominantInfluence: {
        house: dominantHouse.house,
        score: Math.round(dominantHouse.score),
        planets: dominantHouse.planets,
      },
      agents: weightedAgents.map(a => ({
        id: a.agentId,
        name: a.name,
        weight: Math.round(a.combinedWeight * 100) / 100,
        activeHouses: a.activeHouses,
        planets: a.planetaryInfluences,
      })),
      mappingsCount: houseMappings.length,
    });

  } catch (error) {
    console.error('Transit API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get transit data' },
      { status: 500 }
    );
  }
}
