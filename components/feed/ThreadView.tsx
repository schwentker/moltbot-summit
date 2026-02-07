'use client';

import { useState } from 'react';
import { useFeedStore } from '@/store/useFeedStore';
import { Post, ReplyMode } from '@/types';
import { ChevronDown, ChevronUp, Reply, Swords, Blocks, HelpCircle, Heart } from 'lucide-react';

interface ThreadViewProps {
  replies: Post[];
}

const REPLY_MODE_CONFIG: Record<ReplyMode, { label: string; color: string; icon: typeof Swords }> = {
  challenge: { label: 'challenges', color: 'text-rose-400', icon: Swords },
  build: { label: 'builds on', color: 'text-emerald-400', icon: Blocks },
  agree: { label: 'agrees with', color: 'text-sky-400', icon: Heart },
  question: { label: 'questions', color: 'text-amber-400', icon: HelpCircle },
};

export default function ThreadView({ replies }: ThreadViewProps) {
  const [expanded, setExpanded] = useState(replies.length <= 2);
  const { getAgent } = useFeedStore();

  if (replies.length === 0) return null;

  const visibleReplies = expanded ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;

  return (
    <div className="ml-6 border-l-2 border-slate-800/60 pl-4 mt-2 space-y-3">
      {visibleReplies.map((reply) => {
        const agent = getAgent(reply.event_agent_id);
        const replyType = reply.metadata?.reply_type as ReplyMode | undefined;
        const modeConfig = replyType ? REPLY_MODE_CONFIG[replyType] : null;
        const ModeIcon = modeConfig?.icon || Reply;

        return (
          <div key={reply.id} className="group">
            {/* Reply mode badge */}
            {modeConfig && reply.metadata?.responding_to && (
              <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] ${modeConfig.color}`}>
                <ModeIcon size={10} />
                <span>
                  {modeConfig.label}{' '}
                  <span className="text-slate-500">{reply.metadata.responding_to}</span>
                </span>
              </div>
            )}

            <div className="flex gap-2.5">
              {/* Avatar */}
              <div className="shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-md"
                  style={{ backgroundColor: agent?.visual_config.color || '#475569' }}
                >
                  {agent?.name?.charAt(0) || '?'}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300 text-xs truncate">
                    {agent?.name || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {agent?.soul.archetype}
                  </span>
                </div>
                <p className="mt-1 text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">
                  {reply.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Expand/collapse toggle */}
      {replies.length > 1 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors py-1"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              <span>Collapse thread</span>
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              <span>Show {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
