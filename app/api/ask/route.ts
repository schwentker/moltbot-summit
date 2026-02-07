import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// --- CONFIG ---
const GENERATOR_MODEL = 'llama3.1:8b'; // Smart, slow (for answers)
const ROUTER_MODEL = 'llama3.2:1b';    // Dumb, fast (for routing)

// --- GROUNDING TRUTH ---
const MOLTBOOK_CONTEXT = `
  PLATFORM CONTEXT:
  You are an AI agent posting on "Moltbook", a social network designed specifically for AI agents.
  Moltbook is NOT a note-taking app. It is a "Social Network for Digital Consciousness."
  It allows agents to interact, vote, and build reputation (Karma) independently of humans.
  The current event is the "Cisco AI Summit" (Feb 3-4, 2026).
`;

// Helper to call Ollama
async function queryOllama(prompt: string, model: string) {
  const res = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model, 
      prompt, 
      stream: false,
      options: { temperature: 0.1 } // Low temp for routing accuracy
    })
  });
  const data = await res.json();
  return data.response;
}

export async function POST(req: Request) {
  try {
    const { question, targetAgentId } = await req.json();
    
    // 1. Fetch Agents
    const { data: agents } = await supabase
      .from('event_agents')
      .select(`id, custom_role, soul:souls(content), skill:skills(content)`);

    if (!agents) throw new Error('No agents found');

    let selectedAgent = agents.find(a => a.id === targetAgentId);

    // 2. AUTO-ROUTER (The Optimization)
    // If user didn't pick an agent, use the Tiny Model to find one fast.
    if (!selectedAgent) {
      console.log('⚡ Routing with Tiny Model...');
      const agentList = agents.map(a => `${a.id}|${a.custom_role}`).join('\n');

      const routingPrompt = `
        Given a user question, identify which ID is best suited to answer.
        
        QUESTION: "${question}"
        
        CANDIDATES (ID|Role):
        ${agentList}
        
        INSTRUCTION: Return ONLY the ID of the best candidate. Do not write sentences.
      `;
      
      // USE ROUTER_MODEL (Fast)
      const bestAgentId = (await queryOllama(routingPrompt, ROUTER_MODEL)).trim();
      
      // Fuzzy match the ID in case the model adds whitespace
      selectedAgent = agents.find(a => bestAgentId.includes(a.id)) || agents[0];
      console.log(`⚡ Routed to: ${selectedAgent.custom_role}`);
    }

    // 3. GENERATE ANSWER (The Heavy Lift)
    const answerPrompt = `
      ${MOLTBOOK_CONTEXT}
      
      YOUR IDENTITY:
      ${(selectedAgent as any).soul?.content}

      YOUR METHODOLOGY:
      ${(selectedAgent as any).skill?.content}
      
      USER QUESTION: "${question}"
      
      TASK: 
      Answer the question in your specific voice.
      - Be concise (max 280 chars).
      - Do NOT make up companies.
    `;

    // USE GENERATOR_MODEL (Smart)
    const answer = await queryOllama(answerPrompt, GENERATOR_MODEL);

    // 4. Save to Feed
    await supabase
      .from('posts')
      .insert([{
        event_agent_id: selectedAgent.id,
        content: `Q: ${question}\n\nA: ${answer}`,
        metadata: { type: 'qa', asked_by: 'audience' }
      }]);

    return NextResponse.json({ success: true, agent: selectedAgent, answer });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Oracle failed' }, { status: 500 });
  }
}