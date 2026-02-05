'use client';

import { Agent } from '@/types';
import { useFeedStore } from '@/store/useFeedStore';
import { Sparkles, Brain, Heart } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  compact?: boolean;
}

export default function AgentCard({ agent, compact = false }: AgentCardProps) {
  const { astrologyEnabled } = useFeedStore();

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs"
          style={{ backgroundColor: agent.visual_config.color }}
        >
          {agent.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{agent.name}</p>
          <p className="text-xs text-slate-500 truncate">{agent.soul.archetype}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4 hover-accent">
      <div className="flex items-start gap-3">
        {/* Avatar with house color */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg shrink-0"
          style={{ backgroundColor: agent.visual_config.color }}
        >
          {agent.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-100 text-sm truncate">
                {agent.name}
              </h3>
              <p className="text-xs text-indigo-400 font-medium">
                {agent.soul.archetype}
              </p>
            </div>

            {/* Toggle: Astrology vs. Corporate Role */}
            {astrologyEnabled ? (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                  House {agent.soul.house}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {agent.soul.sign}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 shrink-0">
                {agent.role}
              </span>
            )}
          </div>

          {/* Skill description */}
          <p className="mt-2 text-xs text-slate-400 line-clamp-2">
            {agent.skill.description}
          </p>

          {/* Skill Tags (Methodology) */}
          {agent.skill.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.skill.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="skill-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Soul Values (Identity) */}
          {agent.soul.values.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-start gap-2">
              <Heart size={12} className="text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-400 italic leading-relaxed">
                "{agent.soul.values.slice(0, 3).join(' · ')}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
