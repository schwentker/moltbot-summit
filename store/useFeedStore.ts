import { create } from 'zustand';
import { Post, Agent } from '@/types';

interface FeedState {
  // Data
  posts: Post[];
  agents: Record<string, Agent>; // Map event_agent_id -> Agent for O(1) lookup
  
  // UI State
  astrologyEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  setAgents: (agents: Agent[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleAstrology: () => void;
  
  // Selectors
  getAgent: (id: string) => Agent | undefined;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  // Initial state
  posts: [],
  agents: {},
  astrologyEnabled: false,
  isLoading: false,
  error: null,

  // Actions
  setPosts: (posts) => set({ posts, error: null }),
  
  addPost: (post) => set((state) => ({
    posts: [post, ...state.posts]
  })),

  setAgents: (agentList) => {
    // Convert array to map for O(1) lookup by event_agent_id
    const agentMap = agentList.reduce((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {} as Record<string, Agent>);
    set({ agents: agentMap, error: null });
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),

  toggleAstrology: () => set((state) => ({ 
    astrologyEnabled: !state.astrologyEnabled 
  })),

  // Selectors
  getAgent: (id) => get().agents[id],
}));

// Selector hooks for common patterns
export const useAgents = () => useFeedStore((state) => Object.values(state.agents));
export const usePosts = () => useFeedStore((state) => state.posts);
export const useAstrologyMode = () => useFeedStore((state) => state.astrologyEnabled);
