/**
 * Transit Data Queries for Supabase
 */

import { createServerClient } from '@/lib/supabase';
import { Transit, HouseSpeakerMapping, ZodiacSign, HouseNumber, PlanetaryPositions } from './types';

/**
 * Get the latest transit for an event
 */
export async function getLatestTransit(eventId: string): Promise<Transit | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('transits')
    .select('*')
    .eq('event_id', eventId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log('No transit data found, using defaults');
    return null;
  }

  return {
    id: data.id,
    eventId: data.event_id,
    capturedAt: new Date(data.captured_at),
    ascendantSign: data.ascendant_sign as ZodiacSign,
    ascendantDegree: data.ascendant_degree,
    planets: data.planets as PlanetaryPositions,
    source: data.source,
  };
}

/**
 * Get house-speaker mappings for an event
 */
export async function getHouseMappings(eventId: string): Promise<HouseSpeakerMapping[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('house_speaker_map')
    .select('*')
    .eq('event_id', eventId);

  if (error || !data) {
    console.log('No house mappings found');
    return [];
  }

  return data.map(row => ({
    id: row.id,
    eventId: row.event_id,
    houseNumber: row.house_number as HouseNumber,
    soulId: row.soul_id,
    roleInHouse: row.role_in_house,
    planetAnchor: row.planet_anchor,
    weightMultiplier: parseFloat(row.weight_multiplier),
    notes: row.notes,
  }));
}

/**
 * Get recent post soul IDs to avoid repetition
 */
export async function getRecentSoulIds(eventId: string, limit: number = 5): Promise<string[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('posts')
    .select(`
      event_agent_id,
      event_agents!inner(soul_id, event_id)
    `)
    .eq('event_agents.event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  
  return data.map((p: any) => p.event_agents.soul_id);
}

// ============================================
// DEFAULT TRANSIT (Cisco Summit 2026)
// ============================================

/**
 * Default transit when DB has no data
 * Based on Performance Score v2.0 - Aries Rising
 */
export const DEFAULT_TRANSIT: Omit<Transit, 'id' | 'eventId'> = {
  capturedAt: new Date('2026-02-04T17:00:00Z'),
  ascendantSign: 'Aries',
  ascendantDegree: 17.57,
  source: 'manual',
  planets: {
    sun: { sign: 'Capricorn', degree: 20.44, house: 10, combust: false },
    moon: { sign: 'Leo', degree: 14.39, house: 5, combust: false },
    mars: { sign: 'Capricorn', degree: 14.42, house: 10, combust: true },
    mercury: { sign: 'Aquarius', degree: 0.12, house: 11, combust: true },
    jupiter: { sign: 'Gemini', degree: 22.49, house: 3, retrograde: true, combust: false },
    venus: { sign: 'Capricorn', degree: 27.28, house: 10, combust: true },
    saturn: { sign: 'Pisces', degree: 4.42, house: 12, combust: false },
    rahu: { sign: 'Aquarius', degree: 16.09, house: 11, retrograde: true, combust: false },
    ketu: { sign: 'Leo', degree: 16.09, house: 5, retrograde: true, combust: false },
  },
};
