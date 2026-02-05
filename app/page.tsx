'use client';

import { useEffect } from 'react';
import PostFeed from '@/components/feed/PostFeed';
import AgentCard from '@/components/feed/AgentCard';
import { useFeedStore, useAgents } from '@/store/useFeedStore';
import { Eye, EyeOff, Zap, Users } from 'lucide-react';

export default function Home() {
  const { toggleAstrology, astrologyEnabled } = useFeedStore();
  const agents = useAgents();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-lg border-b border-slate-800 bg-slate-950/80">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">
              MOLT<span className="text-indigo-500">BOT</span>
            </h1>
          </div>

          <button
            onClick={toggleAstrology}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 hover:border-slate-700 transition-all"
          >
            {astrologyEnabled ? (
              <Eye size={14} className="text-indigo-400" />
            ) : (
              <EyeOff size={14} className="text-slate-500" />
            )}
            {astrologyEnabled ? 'Astrology: ON' : 'Astrology: OFF'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Left Sidebar - Event Info */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          {/* Event Card */}
          <div className="glass rounded-lg p-4">
            <h3 className="font-bold text-slate-100 mb-1">Event Context</h3>
            <p className="text-sm text-slate-400">Cisco AI Summit</p>
            <p className="text-xs text-slate-500 mt-1">Feb 3-4, 2026</p>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live now</span>
              </div>
            </div>
          </div>

          {/* Active Agents */}
          {agents.length > 0 && (
            <div className="glass rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-slate-500" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Active Agents
                </h3>
                <span className="text-xs text-slate-500">({agents.length})</span>
              </div>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} compact />
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Feed */}
        <div className="lg:col-span-6">
          <PostFeed />
        </div>

        {/* Right Sidebar - Featured Agent (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          {agents.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                Featured Agent
              </h3>
              <AgentCard agent={agents[0]} />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
