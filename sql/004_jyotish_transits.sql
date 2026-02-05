-- Moltbot Summit: Jyotish Transit Integration
-- Run this AFTER the speakers SQL

-- ============================================
-- TRANSITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  captured_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ascendant
  ascendant_sign TEXT NOT NULL,
  ascendant_degree NUMERIC(6,2),
  ascendant_nakshatra TEXT,
  
  -- Planetary positions as JSONB for flexibility
  planets JSONB NOT NULL,
  
  -- Computed house activations (updated by trigger or application)
  house_activations JSONB DEFAULT '{}',
  
  -- Source metadata
  source TEXT DEFAULT 'manual', -- 'manual', 'mcp', 'api'
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transits_event ON transits(event_id);
CREATE INDEX IF NOT EXISTS idx_transits_captured ON transits(captured_at DESC);

-- ============================================
-- HOUSE-SPEAKER MAPPING TABLE
-- ============================================

-- Maps astrological houses to speaker souls for this event
CREATE TABLE IF NOT EXISTS house_speaker_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  house_number INTEGER NOT NULL CHECK (house_number BETWEEN 1 AND 12),
  soul_id UUID REFERENCES souls(id),
  role_in_house TEXT, -- 'primary', 'secondary', 'aspect'
  planet_anchor TEXT, -- Which planet anchors this speaker to this house
  weight_multiplier NUMERIC(3,2) DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, house_number, soul_id)
);

CREATE INDEX IF NOT EXISTS idx_house_map_event ON house_speaker_map(event_id);

-- ============================================
-- SEED: House-Speaker Mapping for Cisco Summit (Aries Rising)
-- ============================================

-- Get event ID and create mappings
DO $$
DECLARE
  event_uuid UUID;
BEGIN
  SELECT id INTO event_uuid FROM events WHERE slug = 'cisco-summit-2026';

  -- House 1 (Aries) - The Pioneer
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 1, id, 'primary', 'Ascendant', 2.0, 'The Ram - charges forward, sets direction'
  FROM souls WHERE slug = 'chuck-robbins'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 3 (Gemini) - The Retrograde Teacher
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 3, id, 'primary', 'Jupiter', 1.5, 'Jupiter retrograde - teaches by revision'
  FROM souls WHERE slug = 'aaron-levie'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 5 (Leo) - The Creative Severance (Moon)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 5, id, 'primary', 'Moon', 1.5, 'Moon in Leo - craft keeper'
  FROM souls WHERE slug = 'dylan-field'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 5, id, 'primary', 'Moon', 1.5, 'Moon in Leo - craft keeper'
  FROM souls WHERE slug = 'mike-krieger'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 5 (Leo) - The Creative Severance (Ketu)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 5, id, 'secondary', 'Ketu', 1.2, 'Ketu in Leo - the releaser, evolutionary view'
  FROM souls WHERE slug = 'fei-fei-li'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 10 (Capricorn) - The Career Crucible (Sun)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 10, id, 'primary', 'Sun', 2.0, 'Sun in Capricorn - the infrastructure prophet'
  FROM souls WHERE slug = 'jeetu-patel'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 10 (Capricorn) - The Career Crucible (Mars combust)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 10, id, 'primary', 'Mars', 1.8, 'Mars combust - the executor, burning close'
  FROM souls WHERE slug = 'tareq-amin'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 10 (Capricorn) - The Career Crucible (Venus combust)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 10, id, 'primary', 'Venus', 1.5, 'Venus combust - the human map'
  FROM souls WHERE slug = 'francine-katsoudas'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 11 (Aquarius) - The Network Hunger (Mercury combust)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 11, id, 'primary', 'Mercury', 1.8, 'Mercury combust at 0° - threshold visionary'
  FROM souls WHERE slug = 'sam-altman'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 11 (Aquarius) - The Network Hunger (Rahu)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 11, id, 'primary', 'Rahu', 1.8, 'Rahu in Shatabhisha - hungry contrarian'
  FROM souls WHERE slug = 'marc-andreessen'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- House 12 (Pisces) - The Grind Before the Void
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 12, id, 'primary', 'Saturn', 1.5, 'Saturn alone - the solitary grinder'
  FROM souls WHERE slug = 'lip-bu-tan'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- Unanchored speakers (appear in multiple houses or special contexts)
  -- Jensen Huang - The Transformer (all houses)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, h, id, 'aspect', 'Unanchored', 0.5, 'The Transformer - walks through all houses'
  FROM souls, generate_series(1, 12) as h WHERE slug = 'jensen-huang'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- Fran Delphic - Recognition Mirror (all houses, lower weight)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, h, id, 'aspect', 'Observer', 0.3, 'The Synthesizer - recognition mirror'
  FROM souls, generate_series(1, 12) as h WHERE slug = 'fran-delphic'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- Other speakers with secondary house placements based on their archetypes
  -- Kevin Scott (House 12 secondary - demographic void awareness)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 12, id, 'secondary', 'Saturn', 0.8, 'Demographic realist - void awareness'
  FROM souls WHERE slug = 'kevin-scott'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- Matt Garman (House 10 secondary - enterprise pragmatist)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 10, id, 'secondary', 'Sun', 0.8, 'Enterprise pragmatist - metrics focus'
  FROM souls WHERE slug = 'matt-garman'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

  -- Amin Vahdat (House 10 secondary - full-stack infrastructure)
  INSERT INTO house_speaker_map (event_id, house_number, soul_id, role_in_house, planet_anchor, weight_multiplier, notes)
  SELECT event_uuid, 10, id, 'secondary', 'Sun', 0.7, 'Full-stack integrator - infrastructure'
  FROM souls WHERE slug = 'amin-vahdat'
  ON CONFLICT (event_id, house_number, soul_id) DO NOTHING;

END $$;

-- ============================================
-- SEED: Initial Transit for Cisco Summit
-- ============================================

INSERT INTO transits (event_id, ascendant_sign, ascendant_degree, ascendant_nakshatra, planets, source)
SELECT 
  id,
  'Aries',
  17.57,
  'Bharani',
  '{
    "sun": {"sign": "Capricorn", "degree": 20.44, "house": 10, "nakshatra": "Shravana", "pada": 4, "combust": false},
    "moon": {"sign": "Leo", "degree": 14.39, "house": 5, "nakshatra": "Purva Phalguni", "pada": 2, "combust": false},
    "mars": {"sign": "Capricorn", "degree": 14.42, "house": 10, "nakshatra": "Shravana", "pada": 2, "combust": true},
    "mercury": {"sign": "Aquarius", "degree": 0.12, "house": 11, "nakshatra": "Dhanishta", "pada": 3, "combust": true},
    "jupiter": {"sign": "Gemini", "degree": 22.49, "house": 3, "nakshatra": "Punarvasu", "pada": 1, "combust": false, "retrograde": true},
    "venus": {"sign": "Capricorn", "degree": 27.28, "house": 10, "nakshatra": "Dhanishta", "pada": 2, "combust": true},
    "saturn": {"sign": "Pisces", "degree": 4.42, "house": 12, "nakshatra": "Uttara Bhadrapada", "pada": 1, "combust": false},
    "rahu": {"sign": "Aquarius", "degree": 16.09, "house": 11, "nakshatra": "Shatabhisha", "pada": 3, "combust": false, "retrograde": true},
    "ketu": {"sign": "Leo", "degree": 16.09, "house": 5, "nakshatra": "Purva Phalguni", "pada": 1, "combust": false, "retrograde": true}
  }'::jsonb,
  'manual'
FROM events WHERE slug = 'cisco-summit-2026'
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View house-speaker map
-- SELECT 
--   hsm.house_number,
--   s.slug as speaker,
--   hsm.role_in_house,
--   hsm.planet_anchor,
--   hsm.weight_multiplier
-- FROM house_speaker_map hsm
-- JOIN souls s ON hsm.soul_id = s.id
-- JOIN events e ON hsm.event_id = e.id
-- WHERE e.slug = 'cisco-summit-2026'
-- ORDER BY hsm.house_number, hsm.weight_multiplier DESC;

-- View current transit
-- SELECT 
--   ascendant_sign,
--   ascendant_degree,
--   planets
-- FROM transits t
-- JOIN events e ON t.event_id = e.id
-- WHERE e.slug = 'cisco-summit-2026'
-- ORDER BY captured_at DESC
-- LIMIT 1;
