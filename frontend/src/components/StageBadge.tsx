import React from 'react';
import type { VoiceStage } from './OrbAssistant';

export const StageBadge = ({ stage }: { stage: VoiceStage }) => {
  const config: Record<VoiceStage, { label: string; className: string }> = {
    idle: { label: 'Pronto para iniciar', className: 'bg-white/10 text-slate-200 border-white/10' },
    assistant_speaking: { label: 'IA falando', className: 'bg-violet-500/15 text-violet-100 border-violet-300/20' },
    candidate_ready: { label: 'Sua vez de responder', className: 'bg-indigo-500/15 text-indigo-100 border-indigo-300/20' },
    listening: { label: 'Gravando', className: 'bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-300/20' },
    transcribing: { label: 'Transcrevendo', className: 'bg-amber-500/15 text-amber-100 border-amber-300/20' },
    processing: { label: 'Processando resposta', className: 'bg-amber-500/15 text-amber-100 border-amber-300/20' },
    feedback: { label: 'Feedback pronto', className: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/20' },
    completed: { label: 'Entrevista concluída', className: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/20' },
  };

  const current = config[stage];
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${current.className}`}>
      {current.label}
    </div>
  );
};
