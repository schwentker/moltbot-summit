'use client';
import { useState } from 'react';
import { useFeedStore } from '@/store/useFeedStore';
import { Send, Sparkles, ChevronDown } from 'lucide-react';

export default function QuestionBox() {
  const { agents, astrologyEnabled } = useFeedStore(); // GET TOGGLE STATE
  const [question, setQuestion] = useState('');
  const [targetId, setTargetId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const agentList = Object.values(agents);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question, 
          targetAgentId: targetId || null,
          astrologyEnabled // SEND TO BACKEND
        })
      });
      setQuestion('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // ... rest of the render (unchanged) ...
  return (
    <div className="fixed bottom-24 right-4 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-4">
      <form onSubmit={handleAsk} className="relative group">
         {/* ... (Keep existing JSX) ... */}
         {/* ... Just ensure the <select> and <input> parts remain the same ... */}
         <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-1000"></div>
        
        <div className="relative bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
          
          <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Ask:</span>
            <div className="relative flex-1">
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-transparent text-xs text-indigo-400 font-bold focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">✨ The Oracle (Auto-Select)</option>
                <option disabled>─── Speakers ───</option>
                {agentList.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center p-1">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={targetId ? `Ask ${agents[targetId]?.name}...` : "Ask the Summit consciousness..."}
              className="w-full bg-transparent border-none text-slate-200 text-sm focus:ring-0 px-3 py-2 placeholder:text-slate-600"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="p-2 m-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}