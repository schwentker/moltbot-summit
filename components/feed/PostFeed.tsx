'use client';

import { useEffect, useState } from 'react';
import { useFeedStore, useThreadedPosts } from '@/store/useFeedStore';
import { supabase } from '@/lib/supabase';
import ThreadView from './ThreadView';
import { MessageSquare, ArrowBigUp, Share2, Loader2 } from 'lucide-react';
import { Post, ThreadedPost } from '@/types';

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

  const threadedPosts = useThreadedPosts();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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

  // 2. Poll for Posts (Real-time) — now includes thread columns
  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, event_agent_id, content, metadata, created_at, parent_post_id, thread_id')
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

  // Trigger agent reply to a post
  const handleDiscuss = async (postId: string) => {
    setReplyingTo(postId);
    try {
      const res = await fetch('/api/generate/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPostId: postId }),
      });
      if (!res.ok) {
        console.error('Reply generation failed:', res.status);
      }
    } catch (e) {
      console.error('Reply trigger error:', e);
    } finally {
      // Keep spinner briefly so user sees the action registered
      setTimeout(() => setReplyingTo(null), 1500);
    }
  };

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
          <span>Warning</span>
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

      {/* Post list — threaded */}
      {threadedPosts.map((threadPost: ThreadedPost, index: number) => {
        const agent = getAgent(threadPost.event_agent_id);
        const isReplying = replyingTo === threadPost.id;

        return (
          <article
            key={threadPost.id}
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
                    {formatTime(threadPost.created_at)}
                  </span>
                </div>

                {/* Post body */}
                <p className="mt-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {threadPost.content}
                </p>

                {/* Metadata tags */}
                {threadPost.metadata?.themes && threadPost.metadata.themes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {threadPost.metadata.themes.map((theme) => (
                      <span key={theme} className="skill-tag">
                        #{theme}
                      </span>
                    ))}
                  </div>
                )}

                {/* Thread replies */}
                {threadPost.replies.length > 0 && (
                  <ThreadView replies={threadPost.replies} />
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
              <button
                className="action-btn group"
                onClick={() => handleDiscuss(threadPost.id)}
                disabled={isReplying}
              >
                {isReplying ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MessageSquare size={16} className="group-hover:text-indigo-400 transition-colors" />
                )}
                <span>{isReplying ? 'Summoning...' : 'Discuss'}</span>
                {threadPost.replies.length > 0 && (
                  <span className="text-[10px] text-slate-500 ml-1">
                    {threadPost.replies.length}
                  </span>
                )}
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
