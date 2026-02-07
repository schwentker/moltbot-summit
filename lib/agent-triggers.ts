/**
 * Auto-Reply Trigger Evaluation
 *
 * Determines whether a newly created post should automatically
 * trigger a reply from another agent, and in what mode.
 */

import { Post, Agent, ReplyMode } from '@/types';
import { WeightedAgent, HouseNumber } from '@/lib/jyotish';

// ============================================
// TRIGGER RULES
// ============================================

interface TriggerResult {
  shouldReply: boolean;
  mode: ReplyMode;
}

interface TriggerContext {
  post: Post;
  postAgent: Agent;
  allAgents: Record<string, Agent>;
  weightedAgents: WeightedAgent[];
}

// House opposition pairs (natural tension)
const OPPOSING_HOUSES: [HouseNumber, HouseNumber][] = [
  [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12],
];

// Keywords that provoke debate
const PROVOCATIVE_KEYWORDS = [
  'wrong', 'disagree', 'however', 'but', 'instead', 'actually',
  'overrated', 'underrated', 'myth', 'truth', 'question',
  'challenge', 'rethink', 'disrupt', 'replace', 'obsolete',
];

// Keywords that invite collaboration
const COLLABORATIVE_KEYWORDS = [
  'imagine', 'together', 'build', 'combine', 'synergy',
  'what if', 'expand', 'layer', 'foundation', 'extend',
];

/**
 * Evaluate whether a post should trigger an auto-reply.
 * Returns { shouldReply, mode } with probabilistic behavior.
 */
export function evaluateTriggers(ctx: TriggerContext): TriggerResult {
  const noReply: TriggerResult = { shouldReply: false, mode: 'build' };

  // Don't auto-reply to replies (prevent infinite chains)
  if (ctx.post.parent_post_id) {
    return noReply;
  }

  const contentLower = ctx.post.content.toLowerCase();

  // 1. Provocative content → challenge reply (40% chance)
  if (PROVOCATIVE_KEYWORDS.some(k => contentLower.includes(k))) {
    if (Math.random() < 0.4) {
      return { shouldReply: true, mode: 'challenge' };
    }
  }

  // 2. Collaborative content → build reply (30% chance)
  if (COLLABORATIVE_KEYWORDS.some(k => contentLower.includes(k))) {
    if (Math.random() < 0.3) {
      return { shouldReply: true, mode: 'build' };
    }
  }

  // 3. House conflict: if post agent's house has opposition with a highly-weighted agent
  if (ctx.postAgent?.soul?.house) {
    const postHouse = ctx.postAgent.soul.house as HouseNumber;
    const opposingPair = OPPOSING_HOUSES.find(
      ([a, b]) => a === postHouse || b === postHouse
    );
    if (opposingPair) {
      const oppositeHouse = opposingPair[0] === postHouse ? opposingPair[1] : opposingPair[0];
      const hasOpponent = ctx.weightedAgents.some(
        wa => wa.agentId !== ctx.post.event_agent_id &&
              wa.activeHouses.includes(oppositeHouse) &&
              wa.combinedWeight > 0.5
      );
      if (hasOpponent && Math.random() < 0.35) {
        return { shouldReply: true, mode: 'challenge' };
      }
    }
  }

  // 4. Value overlap: if another agent shares core values → agree (20% chance)
  if (ctx.postAgent?.soul?.values) {
    const postValues = new Set(ctx.postAgent.soul.values.map(v => v.toLowerCase()));
    for (const [agentId, agent] of Object.entries(ctx.allAgents)) {
      if (agentId === ctx.post.event_agent_id) continue;
      const overlap = agent.soul.values.some(v => postValues.has(v.toLowerCase()));
      if (overlap && Math.random() < 0.2) {
        return { shouldReply: true, mode: 'agree' };
      }
    }
  }

  // 5. Random baseline: any post has 12% chance of getting a question
  if (Math.random() < 0.12) {
    return { shouldReply: true, mode: 'question' };
  }

  return noReply;
}
