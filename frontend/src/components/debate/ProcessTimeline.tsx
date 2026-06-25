import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { ALL_STAGES } from './types';

interface ProcessTimelineProps {
  completedStageIds: string[];
  currentStageId: string | null;
}

export default function ProcessTimeline({ completedStageIds, currentStageId }: ProcessTimelineProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Processo</p>
      {ALL_STAGES.map((stage, index) => {
        const isCompleted = completedStageIds.includes(stage.id);
        const isCurrent = currentStageId === stage.id;
        const isPending = !isCompleted && !isCurrent;

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              {isCompleted ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : isCurrent ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={16} className="text-indigo-500" />
                </motion.div>
              ) : (
                <Circle size={16} className="text-slate-300" />
              )}
              {index < ALL_STAGES.length - 1 && (
                <div className={`absolute left-[7px] top-[16px] w-[2px] h-4 ${
                  isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                }`} />
              )}
            </div>
            <span className={`text-xs font-medium ${
              isCompleted ? 'text-emerald-600' : isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}>
              {stage.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
