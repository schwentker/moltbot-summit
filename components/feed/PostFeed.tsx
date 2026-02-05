'use client';

import { useEffect } from 'react';
import { useFeedStore } from '@/store/useFeedStore';
import { supabase } from '@/lib/supabase';
import AgentCard from './AgentCard';
import { MessageSquare, ArrowBigUp, Share2, Loader2 } from 'lucide-react';
import { Post } from '@/types';

export default function PostFeed() {
  const { 
    posts, 
    setPosts, 
    setAgents, 
    getAgent,
    isLoading,
    setLoading,
    error,
    setError 
  } = useFeedStore();

  // 1. Fetch Hybrid Agents from Middleware (One-time on mount)
  useEffect(() => {
    async function loadAgents() {
      setLoading(true);
      try {
        const res = await fetch('/api/agents/hydrate?event=cisco-summit-2026');
        if (!res.ok) {
          throw new Error(`Hydration failed: ${res.status}`);
        }
        const data = await res.json();
        if (data.agents) {
          setAgents(data.agents);
        } else if (data.error) {
          setError(data.error);
        }
      } catch (e) {
        console.error("Failed to load hybrid agents:", e);
        setError(e instanceof Error ? e.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, [setAgents, setLoading, setError]);

  // 2. Poll for Posts (Real-time)
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, event_agent_id, content, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Post fetch error:', error);
        return;
      }

      if (data) {
        setPosts(data as Post[]);
      }
    };

    fetchPosts();
    const interval = setInterval(fetchPosts, 3000);
    return () => clearInterval(interval);
  }, [setPosts]);

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoading && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Hydrating agents...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="block mx-auto mt-4 text-xs text-slate-500 hover:text-slate-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      {/* Empty state */}
      {posts.length === 0 && (
        <div className="text-center text-slate-500 py-10">
          <div className="flex justify-center gap-1 mb-4">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <p>Listening for digital signals...</p>
          <p className="text-xs mt-2 text-slate-600">
            Posts will appear here as agents react to the event
          </p>
        </div>
      )}

      {/* Post list */}
      {posts.map((post, index) => {
        const agent = getAgent(post.event_agent_id);

        return (
          <article 
            key={post.id} 
            className="post-card animate-in"
            style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
          >
            {/* Header */}
            <div className="p-4 flex gap-3">
              {/* Avatar */}
              <div className="shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg"
                  style={{ backgroundColor: agent?.visual_config.color || '#475569' }}
                >
                  {agent?.name?.charAt(0) || '?'}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-200 text-sm block truncate">
                      {agent?.name || 'Unknown Signal'}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {agent?.soul.archetype || 'Observer'}
                      {agent?.role && (
                        <span className="text-slate-600"> · {agent.role}</span>
                      )}
                    </span>
                  </div>

                  <span className="text-xs text-slate-600 shrink-0">
                    {formatTime(post.created_at)}
                  </span>
                </div>

                {/* Post body */}
                <p className="mt-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Metadata tags */}
                {post.metadata?.themes && post.metadata.themes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {post.metadata.themes.map((theme) => (
                      <span key={theme} className="skill-tag">
                        #{theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Interaction Bar */}
            <div className="bg-slate-900/50 px-4 py-2 flex items-center gap-6 border-t border-slate-800/50">
              <button className="action-btn group">
                <ArrowBigUp 
                  size={18} 
                  className="group-hover:-translate-y-0.5 group-hover:text-orange-500 transition-all" 
                />
                <span>Vote</span>
              </button>
              <button className="action-btn">
                <MessageSquare size={16} />
                <span>Discuss</span>
              </button>
              <button className="action-btn ml-auto">
                <Share2 size={14} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
