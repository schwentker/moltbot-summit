/**
 * Jyotish Transit Types for Moltbot Summit
 */

export type ZodiacSign = 
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer' 
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type Planet = 
  | 'sun' | 'moon' | 'mars' | 'mercury' 
  | 'jupiter' | 'venus' | 'saturn' | 'rahu' | 'ketu';

export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface PlanetaryPosition {
  sign: ZodiacSign;
  degree: number;
  house: HouseNumber;
  nakshatra?: string;
  pada?: 1 | 2 | 3 | 4;
  combust?: boolean;
  retrograde?: boolean;
}

export type PlanetaryPositions = Record<Planet, PlanetaryPosition>;

export interface Transit {
  id: string;
  eventId: string;
  capturedAt: Date;
  ascendantSign: ZodiacSign;
  ascendantDegree: number;
  planets: PlanetaryPositions;
  source: 'manual' | 'mcp' | 'api';
}

export interface HouseSpeakerMapping {
  id: string;
  eventId: string;
  houseNumber: HouseNumber;
  soulId: string;
  roleInHouse: 'primary' | 'secondary' | 'aspect';
  planetAnchor: string;
  weightMultiplier: number;
  notes?: string;
}

export interface HouseActivation {
  house: HouseNumber;
  score: number;  // 0-100
  planets: Planet[];
}

export interface WeightedAgent {
  agentId: string;
  soulId: string;
  name: string;
  baseWeight: number;
  transitWeight: number;
  combinedWeight: number;
  activeHouses: HouseNumber[];
  planetaryInfluences: Planet[];
}

// Planet base weights (importance in selection)
export const PLANET_WEIGHTS: Record<Planet, number> = {
  sun: 1.0,
  moon: 0.9,
  mars: 0.8,
  mercury: 0.75,
  jupiter: 0.85,
  venus: 0.7,
  saturn: 0.8,
  rahu: 0.9,
  ketu: 0.7,
};

// Sign to natural house mapping
export const SIGN_TO_HOUSE: Record<ZodiacSign, HouseNumber> = {
  'Aries': 1, 'Taurus': 2, 'Gemini': 3, 'Cancer': 4,
  'Leo': 5, 'Virgo': 6, 'Libra': 7, 'Scorpio': 8,
  'Sagittarius': 9, 'Capricorn': 10, 'Aquarius': 11, 'Pisces': 12,
};
