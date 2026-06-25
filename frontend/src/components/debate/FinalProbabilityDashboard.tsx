import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, MessageSquare, Lightbulb, Tag, Copy, Check, RotateCcw } from 'lucide-react';
import type { DebateFinalResult, DebateScores } from './types';

interface FinalProbabilityDashboardProps {
  result: DebateFinalResult;
  scores: DebateScores;
  onRestart: () => void;
}

const classificationColors: Record<string, { bg: string; text: string; ring: string }> = {
  'Muito Baixa': { bg: 'bg-red-100', text: 'text-red-700', ring: 'stroke-red-500' },
  'Baixa': { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'stroke-orange-500' },
  'Media': { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'stroke-amber-500' },
  'Boa': { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'stroke-emerald-500' },
  'Muito Boa': { bg: 'bg-teal-100', text: 'text-teal-700', ring: 'stroke-teal-500' },
  'Excelente': { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'stroke-indigo-500' },
};

export default function FinalProbabilityDashboard({ result, scores, onRestart }: FinalProbabilityDashboardProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [copied, setCopied] = useState(false);
  const colors = classificationColors[result.classification] || classificationColors['Media'];

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercent(Math.round(eased * result.percentage));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [result.percentage]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.recruiter_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (circumference * animatedPercent) / 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Hero: Percentage Circle */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="12" />
            <motion.circle
              cx="100" cy="100" r="80" fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              className={colors.ring}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-slate-800">{animatedPercent}%</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">de chance</span>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full ${colors.bg} ${colors.text} text-sm font-bold`}>
          {result.classification}
        </div>
        <p className="text-center text-sm text-slate-600 max-w-xl leading-relaxed">{result.summary}</p>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Match Técnico', value: scores.technical_match, max: 30 },
          { label: 'Senioridade', value: scores.seniority_match, max: 20 },
          { label: 'Experiência', value: scores.experience_proof, max: 20 },
          { label: 'ATS/Keywords', value: scores.ats_keywords, max: 15 },
          { label: 'Logística', value: scores.logistics, max: 10 },
          { label: 'Clareza CV', value: scores.cv_clarity, max: 5 },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-3 border border-slate-100 text-center">
            <p className="text-lg font-black text-slate-800">{item.value}<span className="text-xs text-slate-400">/{item.max}</span></p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
          </div>
        ))}
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-800">Pontos Fortes</h3>
          </div>
          <ul className="space-y-1.5">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>{s}
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Gaps Principais</h3>
          </div>
          <ul className="space-y-1.5">
            {result.gaps.map((g, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>{g}
              </li>
            ))}
          </ul>
        </div>

        {/* Objections */}
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-rose-600" />
            <h3 className="text-sm font-bold text-rose-800">Objeções Prováveis</h3>
          </div>
          <ul className="space-y-1.5">
            {result.objections.map((o, i) => (
              <li key={i} className="text-sm text-rose-700 flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>{o}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-800">Recomendações</h3>
          </div>
          <ul className="space-y-1.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>{r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Keywords */}
      {result.keywords_to_add.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={16} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Palavras-chave para adicionar ao CV</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.keywords_to_add.map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recruiter Message */}
      {result.recruiter_message && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-5 border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-indigo-800">Mensagem sugerida para o recrutador</h3>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-sm text-indigo-700 leading-relaxed italic">"{result.recruiter_message}"</p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-[11px] text-slate-400 leading-relaxed max-w-xl mx-auto">
        {result.disclaimer}
      </p>

      {/* Restart */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RotateCcw size={16} />
          Nova Análise
        </button>
      </div>
    </motion.div>
  );
}
