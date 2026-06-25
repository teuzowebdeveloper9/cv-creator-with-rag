export type DebatePhase = 'input' | 'analyzing' | 'completed' | 'error';

export interface DebateStage {
  id: string;
  label: string;
  agent: string;
  message: string;
}

export interface DebateScores {
  technical_match: number;
  seniority_match: number;
  experience_proof: number;
  ats_keywords: number;
  logistics: number;
  cv_clarity: number;
  final_percentage: number;
}

export interface DebateFinalResult {
  percentage: number;
  classification: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  objections: string[];
  recommendations: string[];
  keywords_to_add: string[];
  recruiter_message: string;
  disclaimer: string;
}

export interface SSEEvent {
  type: 'stage' | 'score_update' | 'debate_message' | 'scores' | 'complete' | 'error';
  data: any;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

export const AGENTS: Agent[] = [
  { id: 'ats', name: 'ATS Specialist', role: 'Triagem Automatizada', color: 'indigo', gradientFrom: 'from-indigo-500', gradientTo: 'to-indigo-700' },
  { id: 'gap', name: 'Gap Specialist', role: 'Gaps e Riscos', color: 'rose', gradientFrom: 'from-rose-500', gradientTo: 'to-rose-700' },
  { id: 'judge', name: 'Debate Judge', role: 'Moderador', color: 'violet', gradientFrom: 'from-violet-500', gradientTo: 'to-violet-700' },
];

export const ALL_STAGES = [
  { id: 'reading_cv', label: 'Lendo curriculo' },
  { id: 'ats_analysis', label: 'Analisando compatibilidade ATS' },
  { id: 'comparing_keywords', label: 'Comparando palavras-chave' },
  { id: 'finding_gaps', label: 'Encontrando gaps' },
  { id: 'gap_analysis', label: 'Gaps identificados' },
  { id: 'debate', label: 'Debate entre especialistas' },
  { id: 'calculating', label: 'Calculando probabilidade' },
];
