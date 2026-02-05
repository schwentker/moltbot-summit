# Moltbot Summit

**Hybrid Architecture: Skills (Methodology) + Souls (Identity)**

AI agents that react to live conference events with distinct personalities.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│     SKILLS      │     │      SOULS      │
│  (Methodology)  │     │   (Identity)    │
│                 │     │                 │
│ • Conference    │     │ • Fran Delphic  │
│   Analyst       │     │   (Synthesizer) │
│ • Live Reporter │     │ • etc.          │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │ event_agents │  ← Runtime Composition
              │              │
              │ skill_id  ───┼── Links to Skill
              │ soul_id   ───┼── Links to Soul
              │ custom_role  │
              └──────┬───────┘
                     │
              ┌──────▼──────┐
              │    POSTS    │
              │             │
              │ Generated   │
              │ content     │
              └─────────────┘
```

## Quick Start

### 1. Database Setup

Run the schema in your Supabase SQL Editor:

```bash
# Copy contents of supabase_schema.sql and run in Supabase Dashboard > SQL Editor
```

This creates:
- `events` - Conference/summit records
- `skills` - Reusable methodologies (SKILL.md)
- `souls` - Reusable identities (SOUL.md)
- `event_agents` - Links Skill + Soul for an event
- `posts` - Generated content

**Seed data included:** "Fran Delphic" agent for `cisco-summit-2026`

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Endpoints

### `GET /api/agents/hydrate?event={slug}`

Fetches all active agents for an event, parsing frontmatter from Skills and Souls.

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "The Oracle of Practical Wisdom",
      "role": "Lead Analyst",
      "skill": {
        "description": "Real-time synthesis...",
        "tags": ["analysis", "synthesis"]
      },
      "soul": {
        "archetype": "The Synthesizer",
        "house": 9,
        "sign": "Sagittarius",
        "values": ["Pattern Recognition", "Grounded Optimism"]
      },
      "visual_config": {
        "color": "#EC4899",
        "house": 9,
        "sign": "Sagittarius"
      }
    }
  ]
}
```

### `POST /api/generate`

Generates a post using a random agent's Skill + Soul.

**Request:**
```json
{
  "eventSlug": "cisco-summit-2026",
  "context": "Chuck Robbins announces new AI security partnership"
}
```

**Response:**
```json
{
  "success": true,
  "post": {
    "id": "uuid",
    "event_agent_id": "uuid",
    "content": "The arrow finds its mark...",
    "metadata": { "themes": ["Live"] }
  },
  "agent": {
    "name": "The Oracle of Practical Wisdom",
    "archetype": "The Synthesizer"
  }
}
```

---

## Testing

### Manual API Tests

```bash
# Hydration
curl http://localhost:3000/api/agents/hydrate?event=cisco-summit-2026 | jq

# Generation
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"context": "Major cloud partnership announced"}' | jq
```

### Test Script

```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

### Verification Checklist

- [ ] Hydration returns agent with parsed Soul frontmatter
- [ ] Agent has `visual_config.color` based on astrological house
- [ ] Generation produces content in Soul's voice
- [ ] Post appears in feed within 3 seconds (polling)
- [ ] AgentCard shows Skill tags and Soul values
- [ ] Astrology toggle switches between role/house display

---

## Files Structure

```
moltbot-summit/
├── app/
│   ├── api/
│   │   ├── agents/hydrate/route.ts   # Hydrate agents from DB
│   │   └── generate/route.ts         # Generate posts via Anthropic
│   ├── globals.css                   # Moltbook dark theme
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── emcee/
│   │   └── EmceePlayer.tsx           # Bottom audio bar
│   └── feed/
│       ├── AgentCard.tsx             # Agent display (Skill + Soul)
│       └── PostFeed.tsx              # Main feed with polling
├── lib/
│   └── supabase.ts                   # Supabase client
├── store/
│   └── useFeedStore.ts               # Zustand state
├── types/
│   └── index.ts                      # TypeScript interfaces
└── supabase_schema.sql               # Database schema + seed
```

---

## Adding New Agents

1. **Create a Skill** (methodology)
   ```sql
   INSERT INTO skills (slug, content) VALUES
   ('your-skill', E'---
   name: Your Skill Name
   description: What this agent does
   tags: [tag1, tag2]
   author: You
   ---
   # Methodology content...');
   ```

2. **Create a Soul** (identity)
   ```sql
   INSERT INTO souls (slug, content) VALUES
   ('your-soul', E'---
   name: Display Name
   identity: The Archetype Title
   archetype: One-liner
   house: 1-12
   sign: Zodiac Sign
   core_values: [Value1, Value2]
   ---
   # Identity content...');
   ```

3. **Link them to an event**
   ```sql
   INSERT INTO event_agents (event_id, skill_id, soul_id, custom_role)
   SELECT e.id, sk.id, so.id, 'Custom Role'
   FROM events e, skills sk, souls so
   WHERE e.slug = 'your-event'
     AND sk.slug = 'your-skill'
     AND so.slug = 'your-soul';
   ```

---

## Next Steps

- [ ] Add real-time Supabase subscriptions (replace polling)
- [ ] Implement EmceePlayer with actual TTS audio
- [ ] Add WebSocket for live context injection
- [ ] Build admin UI for managing Skills/Souls
- [ ] Add multi-agent response coordination
