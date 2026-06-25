import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ShieldAlert, Gavel } from 'lucide-react';
import type { Agent } from './types';

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  ats: Brain,
  gap: ShieldAlert,
  judge: Gavel,
};

const statusLabels: Record<string, string> = {
  idle: 'Aguardando',
  analyzing: 'Analisando...',
  speaking: 'Falando...',
};

const statusColorMap: Record<string, Record<string, string>> = {
  idle: { bg: 'bg-slate-100', text: 'text-slate-400' },
  analyzing: { bg: 'bg-amber-100', text: 'text-amber-700' },
  speaking: {
    ats: 'bg-indigo-100 text-indigo-700',
    gap: 'bg-rose-100 text-rose-700',
    judge: 'bg-violet-100 text-violet-700',
  },
};

interface AgentAvatarProps {
  agent: Agent;
  isActive: boolean;
  status?: 'idle' | 'analyzing' | 'speaking';
}

export default function AgentAvatar({ agent, isActive, status = 'idle' }: AgentAvatarProps) {
  const Icon = iconMap[agent.id] || Brain;

  const getStatusClasses = () => {
    if (status === 'speaking') {
      return statusColorMap.speaking[agent.id] || 'bg-slate-100 text-slate-400';
    }
    const base = statusColorMap[status] || statusColorMap.idle;
    return `${base.bg} ${base.text}`;
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative">
        {isActive && (
          <motion.div
            className={`absolute -inset-2 rounded-full bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} opacity-30`}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.div
          className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${agent.gradientFrom} ${agent.gradientTo} flex items-center justify-center shadow-lg`}
          animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={32} className="text-white" />
        </motion.div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">{agent.name}</p>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{agent.role}</p>
        <motion.span
          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusClasses()}`}
          animate={status === 'analyzing' ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {statusLabels[status]}
        </motion.span>
      </div>
    </motion.div>
  );
}
