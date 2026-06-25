import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent } from './types';

const agentTextColor: Record<string, string> = {
  indigo: 'text-indigo-600',
  rose: 'text-rose-600',
  violet: 'text-violet-600',
};

interface AgentSpeechBubbleProps {
  agent: Agent;
  message: string;
  isVisible: boolean;
}

export default function AgentSpeechBubble({ agent, message, isVisible }: AgentSpeechBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && message && (
        <motion.div
          key={message.slice(0, 50)}
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative max-w-2xl mx-auto"
        >
          <div className="relative bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
            <div className="absolute -top-3 left-6 w-3 h-3 rotate-45 bg-white border-t border-l border-slate-100" />
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} flex items-center justify-center shrink-0 mt-0.5`}>
                <span className="text-white text-xs font-bold">{agent.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold mb-1 ${agentTextColor[agent.color] || 'text-slate-600'}`}>{agent.name}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
