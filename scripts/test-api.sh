#!/bin/bash
# test-api.sh - Test Moltbot Summit API endpoints

BASE_URL="${1:-http://localhost:3000}"
EVENT_SLUG="cisco-summit-2026"

echo "🧪 Testing Moltbot Summit APIs"
echo "================================"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Hydrate Agents
echo "1️⃣  Testing /api/agents/hydrate"
echo "   GET $BASE_URL/api/agents/hydrate?event=$EVENT_SLUG"
echo ""

HYDRATE_RESPONSE=$(curl -s "$BASE_URL/api/agents/hydrate?event=$EVENT_SLUG")

if echo "$HYDRATE_RESPONSE" | grep -q '"agents"'; then
  echo "   ✅ Hydration successful"
  
  # Extract agent details
  AGENT_NAME=$(echo "$HYDRATE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
  AGENT_ARCHETYPE=$(echo "$HYDRATE_RESPONSE" | grep -o '"archetype":"[^"]*"' | head -1 | cut -d'"' -f4)
  AGENT_COLOR=$(echo "$HYDRATE_RESPONSE" | grep -o '"color":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  echo "   📋 First Agent:"
  echo "      Name: $AGENT_NAME"
  echo "      Archetype: $AGENT_ARCHETYPE"
  echo "      Color: $AGENT_COLOR"
else
  echo "   ❌ Hydration failed"
  echo "   Response: $HYDRATE_RESPONSE"
fi

echo ""

# Test 2: Generate Post
echo "2️⃣  Testing /api/generate"
echo "   POST $BASE_URL/api/generate"
echo ""

CONTEXT="Chuck Robbins announces new AI security partnership with major cloud providers"

GENERATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"eventSlug\": \"$EVENT_SLUG\", \"context\": \"$CONTEXT\"}")

if echo "$GENERATE_RESPONSE" | grep -q '"success":true'; then
  echo "   ✅ Generation successful"
  
  # Extract post content
  POST_CONTENT=$(echo "$GENERATE_RESPONSE" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  echo "   📝 Generated Post:"
  echo "      \"$POST_CONTENT\""
else
  echo "   ❌ Generation failed"
  echo "   Response: $GENERATE_RESPONSE"
fi

echo ""
echo "================================"
echo "🏁 Tests complete"
