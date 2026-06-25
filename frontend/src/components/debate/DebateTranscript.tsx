import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AGENTS } from './types';

interface DebateTranscriptProps {
  messages: { agent: string; message: string }[];
}

const agentColorMap: Record<string, string> = {
  'ATS Specialist': 'bg-indigo-500',
  'Gap & Objection Specialist': 'bg-rose-500',
  'Gap Specialist': 'bg-rose-500',
  'Debate Judge': 'bg-violet-500',
};

const agentTextColorMap: Record<string, string> = {
  'ATS Specialist': 'text-indigo-600',
  'Gap & Objection Specialist': 'text-rose-600',
  'Gap Specialist': 'text-rose-600',
  'Debate Judge': 'text-violet-600',
};

export default function DebateTranscript({ messages }: DebateTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transcricao do Debate</p>
      </div>
      <div ref={scrollRef} className="max-h-64 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2.5"
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${agentColorMap[msg.agent] || 'bg-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${agentTextColorMap[msg.agent] || 'text-slate-600'}`}>{msg.agent}</p>
              <p className="text-sm text-slate-700 leading-relaxed mt-0.5">{msg.message}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
