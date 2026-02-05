/**
 * Transit-Weighted Agent Selection for Moltbot Summit
 * 
 * Calculates house activations from planetary transits and
 * weights agent selection based on house-speaker mappings.
 */

import {
  Transit,
  PlanetaryPositions,
  HouseActivation,
  HouseSpeakerMapping,
  WeightedAgent,
  Planet,
  HouseNumber,
  ZodiacSign,
  PLANET_WEIGHTS,
  SIGN_TO_HOUSE,
} from './types';

// ============================================
// HOUSE ACTIVATION CALCULATION
// ============================================

/**
 * Get house number for a sign relative to ascendant
 */
export function getHouseFromAscendant(
  targetSign: ZodiacSign,
  ascendantSign: ZodiacSign
): HouseNumber {
  const targetIndex = SIGN_TO_HOUSE[targetSign];
  const ascIndex = SIGN_TO_HOUSE[ascendantSign];
  const diff = targetIndex - ascIndex;
  return ((diff + 12) % 12 || 12) as HouseNumber;
}

/**
 * Calculate activation scores for all 12 houses based on transit
 */
export function calculateHouseActivations(transit: Transit): HouseActivation[] {
  const activations: HouseActivation[] = [];
  const { planets, ascendantSign } = transit;

  for (let h = 1; h <= 12; h++) {
    const house = h as HouseNumber;
    const activePlanets: Planet[] = [];
    let score = 0;

    // Check each planet
    for (const [planetName, position] of Object.entries(planets)) {
      const planet = planetName as Planet;
      const planetHouse = getHouseFromAscendant(position.sign, ascendantSign);

      if (planetHouse === house) {
        activePlanets.push(planet);
        let weight = PLANET_WEIGHTS[planet];

        // Combustion intensifies (within 8° of Sun)
        if (position.combust) weight *= 1.3;
        
        // Moon gets emotional timing bonus
        if (planet === 'moon') weight *= 1.2;

        score += weight;
      }
    }

    // Ascendant always activates House 1
    if (house === 1) score += 0.5;

    activations.push({
      house,
      score: Math.min(score * 20, 100), // Normalize to 0-100
      planets: activePlanets,
    });
  }

  return activations;
}

// ============================================
// AGENT WEIGHT CALCULATION
// ============================================

interface AgentInfo {
  id: string;        // event_agent_id
  soulId: string;
  name: string;
  house: number;     // From soul frontmatter
}

/**
 * Calculate weighted agents based on transit and house mappings
 */
export function calculateAgentWeights(
  transit: Transit,
  houseMappings: HouseSpeakerMapping[],
  agents: AgentInfo[]
): WeightedAgent[] {
  const activations = calculateHouseActivations(transit);
  const activationMap = new Map(activations.map(a => [a.house, a]));

  // Group mappings by soul
  const soulMappings = new Map<string, HouseSpeakerMapping[]>();
  for (const mapping of houseMappings) {
    const existing = soulMappings.get(mapping.soulId) || [];
    existing.push(mapping);
    soulMappings.set(mapping.soulId, existing);
  }

  const weightedAgents: WeightedAgent[] = [];

  for (const agent of agents) {
    const mappings = soulMappings.get(agent.soulId) || [];
    
    // If no explicit mapping, use the soul's house from frontmatter
    if (mappings.length === 0) {
      const houseNum = agent.house as HouseNumber;
      const activation = activationMap.get(houseNum);
      
      weightedAgents.push({
        agentId: agent.id,
        soulId: agent.soulId,
        name: agent.name,
        baseWeight: 1.0,
        transitWeight: activation ? activation.score / 100 : 0.5,
        combinedWeight: activation ? (activation.score / 100) * 0.7 + 0.3 : 0.5,
        activeHouses: activation && activation.score > 0 ? [houseNum] : [],
        planetaryInfluences: activation?.planets || [],
      });
      continue;
    }

    // Calculate from explicit mappings
    let transitWeight = 0;
    let baseWeight = 0;
    const activeHouses: HouseNumber[] = [];
    const planetaryInfluences: Planet[] = [];

    for (const mapping of mappings) {
      const activation = activationMap.get(mapping.houseNumber);
      if (!activation) continue;

      baseWeight += mapping.weightMultiplier;
      const houseContribution = (activation.score / 100) * mapping.weightMultiplier;
      transitWeight += houseContribution;

      if (activation.score > 0) {
        activeHouses.push(mapping.houseNumber);
        planetaryInfluences.push(...activation.planets);
      }
    }

    const combinedWeight = (transitWeight * 0.7) + (baseWeight * 0.3);

    weightedAgents.push({
      agentId: agent.id,
      soulId: agent.soulId,
      name: agent.name,
      baseWeight,
      transitWeight,
      combinedWeight,
      activeHouses: [...new Set(activeHouses)],
      planetaryInfluences: [...new Set(planetaryInfluences)],
    });
  }

  return weightedAgents.sort((a, b) => b.combinedWeight - a.combinedWeight);
}

// ============================================
// AGENT SELECTION
// ============================================

/**
 * Select agent using weighted random selection
 */
export function selectWeightedAgent(agents: WeightedAgent[]): WeightedAgent | null {
  if (agents.length === 0) return null;

  const totalWeight = agents.reduce((sum, a) => sum + a.combinedWeight, 0);
  
  if (totalWeight === 0) {
    // Fallback to uniform random
    return agents[Math.floor(Math.random() * agents.length)];
  }

  let random = Math.random() * totalWeight;
  for (const agent of agents) {
    random -= agent.combinedWeight;
    if (random <= 0) return agent;
  }

  return agents[agents.length - 1];
}

/**
 * Select agent with exclusion list (avoid repetition)
 */
export function selectAgentExcluding(
  agents: WeightedAgent[],
  excludeIds: string[]
): WeightedAgent | null {
  const filtered = agents.filter(a => !excludeIds.includes(a.agentId));
  return selectWeightedAgent(filtered.length > 0 ? filtered : agents);
}

// ============================================
// THEMATIC SELECTION
// ============================================

const HOUSE_KEYWORDS: Record<HouseNumber, string[]> = {
  1:  ['pioneer', 'identity', 'beginning', 'leadership', 'self'],
  2:  ['value', 'resource', 'money', 'security', 'asset'],
  3:  ['communication', 'learning', 'education', 'teaching', 'message'],
  4:  ['home', 'foundation', 'root', 'family', 'base'],
  5:  ['creative', 'creation', 'art', 'design', 'craft', 'expression'],
  6:  ['service', 'health', 'work', 'process', 'routine', 'optimization'],
  7:  ['partnership', 'relationship', 'contract', 'collaboration', 'deal'],
  8:  ['transformation', 'change', 'depth', 'crisis', 'merge', 'acquisition'],
  9:  ['philosophy', 'vision', 'strategy', 'expansion', 'global', 'future'],
  10: ['career', 'infrastructure', 'enterprise', 'scale', 'public', 'achievement'],
  11: ['network', 'community', 'innovation', 'technology', 'ecosystem', 'group'],
  12: ['hidden', 'ending', 'grind', 'solitude', 'dissolution', 'void'],
};

/**
 * Filter agents by topic/context keywords
 */
export function filterByTopic(
  agents: WeightedAgent[],
  topic: string
): WeightedAgent[] {
  const topicLower = topic.toLowerCase();
  
  // Find matching houses
  const matchingHouses: HouseNumber[] = [];
  for (const [house, keywords] of Object.entries(HOUSE_KEYWORDS)) {
    if (keywords.some(k => topicLower.includes(k))) {
      matchingHouses.push(Number(house) as HouseNumber);
    }
  }

  if (matchingHouses.length === 0) return agents;

  // Boost agents in matching houses
  return agents
    .map(agent => {
      const hasMatch = agent.activeHouses.some(h => matchingHouses.includes(h));
      return {
        ...agent,
        combinedWeight: hasMatch ? agent.combinedWeight * 1.5 : agent.combinedWeight,
      };
    })
    .sort((a, b) => b.combinedWeight - a.combinedWeight);
}
