// types/index.ts
// Moltbot Summit: Hybrid Architecture Types

// ============================================
// RAW DATABASE TYPES
// ============================================

export interface SkillRow {
  id: string;
  slug: string;
  version: string;
  content: string; // Raw markdown with frontmatter
  created_at: string;
}

export interface SoulRow {
  id: string;
  slug: string;
  version: string;
  content: string; // Raw markdown with frontmatter
  created_at: string;
}

export interface EventAgentRow {
  id: string;
  event_id: string;
  skill_id: string;
  soul_id: string;
  custom_role: string | null;
  is_active: boolean;
  config: Record<string, unknown>;
}

export interface PostRow {
  id: string;
  event_agent_id: string;
  content: string;
  audio_url: string | null;
  metadata: PostMetadata;
  created_at: string;
}

// ============================================
// PARSED FRONTMATTER TYPES
// ============================================

export interface SkillFrontmatter {
  name: string;
  description: string;
  tags: string[];
  author: string;
}

export interface SoulFrontmatter {
  name: string;
  identity: string;
  archetype: string;
  house: number;
  sign: string;
  core_values: string[];
}

// ============================================
// HYDRATED TYPES (What Frontend Sees)
// ============================================

export interface Agent {
  id: string; // event_agent_id
  name: string; // from Soul.identity
  role: string; // from custom_role or Skill.description

  // The "Mind" (Methodology)
  skill: {
    description: string;
    tags: string[];
  };

  // The "Heart" (Identity)
  soul: {
    archetype: string;
    values: string[];
    house: number;
    sign: string;
  };

  // Visual presentation
  visual_config: {
    color: string;
    house: number;
    sign: string;
    avatar_url?: string;
  };
}

export type ReplyMode = 'agree' | 'challenge' | 'build' | 'question';

export interface PostMetadata {
  themes?: string[];
  recognition_type?: 'alignment' | 'challenge' | 'synthesis';
  context?: string;
  reply_type?: ReplyMode;
  responding_to?: string; // Agent name being replied to
}

// Post with hydrated agent reference
export interface Post {
  id: string;
  event_agent_id: string; // Foreign key to look up agent
  content: string;
  audio_url: string | null;
  metadata: PostMetadata;
  created_at: string;
  parent_post_id: string | null; // Direct reply target
  thread_id: string | null;      // Root post of thread
}

// Post with fully nested agent (for display convenience)
export interface HydratedPost extends Omit<Post, 'event_agent_id'> {
  agent: Agent;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface HydrateResponse {
  agents: Agent[];
}

export interface GenerateRequest {
  eventSlug?: string;
  context: string; // What the agent is reacting to
}

export interface GenerateResponse {
  success: boolean;
  post?: Post;
  error?: string;
}

// ============================================
// AGENT-TO-AGENT TYPES
// ============================================

export interface ReplyRequest {
  parentPostId: string;
  eventSlug?: string;
  mode?: ReplyMode; // Optional hint for reply style
}

export interface ReplyResponse {
  success: boolean;
  post?: Post;
  parentPost?: Post;
  error?: string;
}

export interface DebateRequest {
  eventSlug?: string;
  topic: string;
  rounds?: number;   // Default 3
  agentA?: string;   // Optional: force specific event_agent_id
  agentB?: string;   // Optional: force specific event_agent_id
}

export interface DebateResponse {
  success: boolean;
  threadId?: string;
  posts?: Post[];
  agents?: {
    a: { id: string; name: string; archetype: string };
    b: { id: string; name: string; archetype: string };
  };
  error?: string;
}

// A post with its reply chain (for feed display)
export interface ThreadedPost extends Post {
  replies: Post[];
}
