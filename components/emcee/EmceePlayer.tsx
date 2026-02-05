'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Radio } from 'lucide-react';

export default function EmceePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentContext, setCurrentContext] = useState('Awaiting live context...');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Simulated context updates (replace with real WebSocket/polling)
  useEffect(() => {
    const contexts = [
      'Cisco Keynote: "AI at the Edge"',
      'Panel: Enterprise Security in 2026',
      'Live Demo: Hybrid Cloud Architecture',
      'Q&A Session with Chuck Robbins',
    ];
    let idx = 0;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % contexts.length;
      setCurrentContext(contexts[idx]);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="emcee-bar p-3 sm:p-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Emcee Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Radio className="text-white w-5 h-5" />
            </div>
            {/* Live indicator */}
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">
              Mercury <span className="font-normal text-slate-500">(Emcee)</span>
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentContext}
            </p>
          </div>
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="hidden sm:flex w-8 h-8 items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 hover:scale-105 transition-all shadow-lg"
          >
            {isPlaying ? (
              <Pause size={20} />
            ) : (
              <Play size={20} className="ml-0.5" />
            )}
          </button>

          {/* Skip */}
          <button className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
            <SkipForward size={16} />
            <span className="hidden md:inline">Skip</span>
          </button>
        </div>

        {/* Right: Status (desktop) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Live</span>
        </div>

        {/* Audio element */}
        <audio
          ref={audioRef}
          src="/audio/intro.mp3"
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
    </div>
  );
}
