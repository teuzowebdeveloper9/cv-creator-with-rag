import React from 'react';
import { motion } from 'framer-motion';
import AgentAvatar from './AgentAvatar';
import AgentSpeechBubble from './AgentSpeechBubble';
import ProcessTimeline from './ProcessTimeline';
import ScoreCard from './ScoreCard';
import DebateTranscript from './DebateTranscript';
import { AGENTS, type DebateStage, type DebateScores } from './types';
import { Brain, ShieldAlert, Gavel, BarChart3, AlertTriangle, Target } from 'lucide-react';

interface AgentTableSceneProps {
  stages: DebateStage[];
  currentStageId: string | null;
  debateMessages: { agent: string; message: string }[];
  scores: Partial<DebateScores>;
}

export default function AgentTableScene({ stages, currentStageId, debateMessages, scores }: AgentTableSceneProps) {
  const lastStage = stages[stages.length - 1];
  const completedStageIds = stages.map(s => s.id);

  const getAgentStatus = (agentId: string): 'idle' | 'analyzing' | 'speaking' => {
    if (!lastStage) return 'idle';
    if (lastStage.agent.includes('ATS') && agentId === 'ats') return 'speaking';
    if (lastStage.agent.includes('Gap') && agentId === 'gap') return 'speaking';
    if (lastStage.agent.includes('Judge') && agentId === 'judge') return 'speaking';
    if (lastStage.id === 'debate') {
      const lastDebateMsg = debateMessages[debateMessages.length - 1];
      if (lastDebateMsg) {
        if (lastDebateMsg.agent.includes('ATS') && agentId === 'ats') return 'speaking';
        if (lastDebateMsg.agent.includes('Gap') && agentId === 'gap') return 'speaking';
        if (lastDebateMsg.agent.includes('Judge') && agentId === 'judge') return 'speaking';
      }
    }
    return 'idle';
  };

  const getActiveAgent = (): string => {
    if (!lastStage) return '';
    if (lastStage.agent.includes('ATS')) return 'ats';
    if (lastStage.agent.includes('Gap')) return 'gap';
    if (lastStage.agent.includes('Judge')) return 'judge';
    return '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="flex flex-col gap-6">
        {/* Score Cards */}
        <div className="grid grid-cols-3 gap-3">
          <ScoreCard label="ATS Score" value={scores.ats_score || scores.ats_keywords || 0} maxValue={15} icon={Brain} visible={!!scores.ats_score || !!scores.ats_keywords} />
          <ScoreCard label="Match Tecnico" value={scores.technical_match || 0} maxValue={30} icon={Target} visible={!!scores.technical_match} />
          <ScoreCard label="Gap Risk" value={scores.gap_risk || 0} maxValue={40} icon={AlertTriangle} visible={!!scores.gap_risk} />
        </div>

        {/* Table Scene */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[400px] flex flex-col items-center justify-center">
          {/* Table */}
          <div className="relative mb-8">
            <div className="w-64 h-20 bg-gradient-to-b from-slate-200 to-slate-300 rounded-[50%] shadow-inner" />
            <div className="absolute inset-0 w-64 h-20 bg-gradient-to-b from-white/30 to-transparent rounded-[50%]" />
          </div>

          {/* Agents */}
          <div className="flex items-start gap-12 -mt-4">
            {AGENTS.map((agent) => (
              <AgentAvatar
                key={agent.id}
                agent={agent}
                isActive={getActiveAgent() === agent.id}
                status={getAgentStatus(agent.id)}
              />
            ))}
          </div>

          {/* Speech Bubble */}
          <div className="mt-8 w-full">
            <AgentSpeechBubble
              agent={AGENTS.find(a => lastStage?.agent.includes(a.name.split(' ')[0])) || AGENTS[2]}
              message={lastStage?.message || ''}
              isVisible={!!lastStage}
            />
          </div>
        </div>

        {/* Debate Transcript */}
        <DebateTranscript messages={debateMessages} />
      </div>

      {/* Timeline Sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <ProcessTimeline completedStageIds={completedStageIds} currentStageId={currentStageId} />
        </div>
      </div>
    </div>
  );
}
