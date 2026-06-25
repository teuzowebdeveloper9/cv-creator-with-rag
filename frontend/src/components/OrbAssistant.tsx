import React from 'react';
import { motion } from 'framer-motion';

export type VoiceStage =
  | 'idle'
  | 'assistant_speaking'
  | 'candidate_ready'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'feedback'
  | 'completed';

export const OrbAssistant = ({
  stage,
  interviewerName,
  subtitle,
}: {
  stage: VoiceStage;
  interviewerName: string;
  subtitle: string;
}) => {
  const isListening = stage === 'listening';
  const isSpeaking = stage === 'assistant_speaking';
  const isProcessing = stage === 'processing' || stage === 'transcribing';
  const isFeedback = stage === 'feedback';
  const isCompleted = stage === 'completed';

  const coreClasses = isCompleted
    ? 'from-emerald-300 via-violet-400 to-indigo-600'
    : isFeedback
      ? 'from-fuchsia-300 via-violet-400 to-indigo-600'
      : isProcessing
        ? 'from-violet-300 via-violet-500 to-indigo-700'
        : isListening
          ? 'from-fuchsia-200 via-violet-400 to-purple-700'
          : isSpeaking
            ? 'from-violet-200 via-fuchsia-400 to-indigo-700'
            : 'from-violet-300 via-violet-500 to-indigo-700';

  return (
    <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center">
      <motion.div
        className="absolute inset-0 -z-10 rounded-full bg-violet-500/20 blur-3xl"
        animate={{
          scale: isListening ? [1, 1.18, 1.02] : isSpeaking ? [1, 1.1, 1] : [1, 1.04, 1],
          opacity: isProcessing ? [0.45, 0.8, 0.45] : [0.35, 0.6, 0.35],
        }}
        transition={{ duration: isListening ? 1.4 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="relative flex aspect-square w-[280px] items-center justify-center rounded-full border border-white/10 bg-[#090612]"
        animate={{
          rotate: isProcessing ? 360 : 0,
          y: isListening ? [0, -10, 4, -6, 0] : 0,
          scale: isListening ? [1, 1.04, 0.98, 1.03, 1] : isSpeaking ? [1, 1.03, 1] : 1,
        }}
        transition={{
          duration: isProcessing ? 6 : isListening ? 2.2 : 2.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <motion.div
          className={`absolute inset-5 rounded-full bg-gradient-to-br ${coreClasses} opacity-90 blur-sm`}
          animate={{
            scale: isListening ? [1, 1.06, 0.98, 1] : isSpeaking ? [1, 1.04, 1] : [1, 1.02, 1],
          }}
          transition={{ duration: isListening ? 1 : 2, repeat: Infinity }}
        />
        <div className="absolute inset-8 rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),rgba(121,37,255,0.22)_36%,rgba(11,8,22,0.98)_72%)]" />
        <motion.div
          className="absolute inset-[30%] rounded-full border border-white/10 bg-white/10 backdrop-blur-md"
          animate={{
            scale: isSpeaking ? [0.92, 1.04, 0.92] : isListening ? [0.96, 1.08, 0.94] : [1, 1.02, 1],
            opacity: isProcessing ? [0.35, 0.75, 0.35] : [0.55, 0.8, 0.55],
          }}
          transition={{ duration: isListening ? 0.9 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <div className="rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100">
            {interviewerName}
          </div>
          <div className="flex items-end gap-1.5">
            {[0, 1, 2, 3, 4].map((bar) => (
              <motion.span
                key={bar}
                className="w-2 rounded-full bg-white/90"
                animate={{
                  height: isSpeaking || isListening
                    ? [14 + bar * 2, 34 - ((bar + 1) % 3) * 6, 12 + ((bar + 2) % 4) * 5]
                    : [10, 16, 10],
                  opacity: isProcessing ? [0.45, 0.9, 0.45] : [0.5, 1, 0.5],
                }}
                transition={{
                  duration: isListening ? 0.7 : isSpeaking ? 1 : 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: bar * 0.08,
                }}
              />
            ))}
          </div>
          <div className="max-w-[180px] text-xs font-semibold leading-5 text-violet-100/90">
            {subtitle}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
