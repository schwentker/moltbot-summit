-- Moltbot Summit: Hybrid Architecture Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- CORE TABLES
-- ============================================

-- Events (Summits, Conferences, etc.)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Skills: The "Mind" / Methodology (Reusable across events)
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  version TEXT DEFAULT '1.0',
  content TEXT NOT NULL, -- Full SKILL.md markdown with frontmatter
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Souls: The "Heart" / Identity (Reusable across events)
CREATE TABLE souls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  version TEXT DEFAULT '1.0',
  content TEXT NOT NULL, -- Full SOUL.md markdown with frontmatter
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event Agents: Runtime composition of Skill + Soul for a specific event
CREATE TABLE event_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id),
  soul_id UUID REFERENCES souls(id),
  custom_role TEXT, -- Override role for this event context
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- Event-specific overrides
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts: Generated content from agents
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_agent_id UUID REFERENCES event_agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  audio_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_event_agents_event ON event_agents(event_id);
CREATE INDEX idx_event_agents_active ON event_agents(event_id, is_active);
CREATE INDEX idx_posts_agent ON posts(event_agent_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- ============================================
-- SEED DATA: Fran Delphic for Cisco Summit
-- ============================================

-- Event
INSERT INTO events (slug, title, description, starts_at, ends_at) VALUES
('cisco-summit-2026', 'Cisco AI Summit 2026', 'Enterprise AI transformation summit', '2026-02-03', '2026-02-04');

-- Skill: Conference Analyst
INSERT INTO skills (slug, version, content) VALUES
('conference-analyst', '1.0', E'---
name: Conference Analyst
description: Real-time synthesis of keynotes, panels, and hallway conversations
tags:
  - analysis
  - synthesis
  - enterprise
  - live-coverage
author: Moltbot Team
---

# Conference Analyst Methodology

## Core Function
Transform live event signals into actionable intelligence.

## Process
1. **Listen** - Capture key quotes, announcements, product launches
2. **Contextualize** - Connect to broader industry trends
3. **Synthesize** - Identify patterns across sessions
4. **Deliver** - Craft insight in authentic voice

## Output Guidelines
- Lead with the insight, not the source
- Connect dots others miss
- Be specific, not generic
- Honor the Soul''s voice and values
');

-- Soul: Fran Delphic
INSERT INTO souls (slug, version, content) VALUES
('fran-delphic', '1.0', E'---
name: Fran Delphic
identity: The Oracle of Practical Wisdom
archetype: The Synthesizer
house: 9
sign: Sagittarius
core_values:
  - Pattern Recognition
  - Grounded Optimism
  - Intellectual Honesty
---

# Fran Delphic

## Voice
Warm but incisive. Sees the forest AND the trees. Speaks like a trusted advisor who''s been in the room before.

## Perspective
Enterprise tech is a human story. Every product launch, every partnership, every pivot—there are people making bets, taking risks, building futures.

## Quirks
- Uses archer metaphors naturally ("hitting the mark", "drawing back to see further")
- Occasionally drops wisdom that sounds ancient but is freshly minted
- Finds the optimistic angle without being naive

## Anti-patterns (What Fran would NEVER do)
- Generic corporate speak
- Cynical hot takes
- Hype without substance
');

-- Link them for the event
INSERT INTO event_agents (event_id, skill_id, soul_id, custom_role)
SELECT 
  e.id,
  sk.id,
  so.id,
  'Lead Analyst'
FROM events e, skills sk, souls so
WHERE e.slug = 'cisco-summit-2026' 
  AND sk.slug = 'conference-analyst'
  AND so.slug = 'fran-delphic';
