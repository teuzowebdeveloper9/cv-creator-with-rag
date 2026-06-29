import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Target } from 'lucide-react';
import type { AxiosInstance } from 'axios';
import DebateInputForm from './DebateInputForm';
import AgentTableScene from './AgentTableScene';
import FinalProbabilityDashboard from './FinalProbabilityDashboard';
import { type DebatePhase, type DebateStage, type DebateScores, type DebateFinalResult, type SSEEvent } from './types';
import { API_BASE_URL, getCookieValue } from '../../api/client';

const getCsrfToken = () => getCookieValue('csrftoken');

interface DebatePageProps {
  apiClient: AxiosInstance;
}

export default function DebatePage({ apiClient }: DebatePageProps) {
  const [phase, setPhase] = useState<DebatePhase>('input');
  const [stages, setStages] = useState<DebateStage[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [debateMessages, setDebateMessages] = useState<{ agent: string; message: string }[]>([]);
  const [scores, setScores] = useState<Partial<DebateScores>>({});
  const [result, setResult] = useState<DebateFinalResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const resetState = () => {
    setStages([]);
    setCurrentStageId(null);
    setDebateMessages([]);
    setScores({});
    setResult(null);
    setErrorMessage('');
  };

  const consumeSSE = async (response: Response) => {
    if (!response.ok) {
      let msg = `Erro ${response.status}`;
      try {
        const data = await response.json();
        if (data.error) msg = data.error;
        if (data.cv_text) msg = Array.isArray(data.cv_text) ? data.cv_text.join(' ') : data.cv_text;
        if (data.job_description) msg = Array.isArray(data.job_description) ? data.job_description.join(' ') : data.job_description;
      } catch {}
      throw new Error(msg);
    }

    if (!response.body) throw new Error('Resposta vazia do servidor');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const events = sseBuffer.split('\n\n');
      sseBuffer = events.pop() || '';

      for (const eventStr of events) {
        const dataLine = eventStr.split('\n').find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        try {
          const event: SSEEvent = JSON.parse(dataLine.slice(6));
          switch (event.type) {
            case 'stage':
              setStages((prev) => [...prev, event.data]);
              setCurrentStageId(event.data.id);
              break;
            case 'score_update':
              setScores((prev) => ({ ...prev, ...event.data }));
              break;
            case 'debate_message':
              setDebateMessages((prev) => [...prev, event.data]);
              break;
            case 'scores':
              setScores((prev) => ({ ...prev, ...event.data }));
              break;
            case 'complete':
              setResult(event.data);
              setPhase('completed');
              break;
            case 'error':
              setPhase('error');
              setErrorMessage(event.data?.message || 'Erro desconhecido');
              break;
          }
        } catch {}
      }
    }
  };

  const startDebate = useCallback(async (body: BodyInit) => {
    setPhase('analyzing');
    resetState();
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const isFormData = body instanceof FormData;
      const headers: Record<string, string> = {};
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      const csrfToken = getCsrfToken();
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const response = await fetch(`${API_BASE_URL}/debate/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body,
        signal: abortRef.current.signal,
      });

      await consumeSSE(response);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setPhase('error');
      setErrorMessage(error.message || 'Falha ao conectar com o servidor.');
    }
  }, []);

  const handleDebateText = useCallback((cvText: string, jobDescription: string, extraInfo: Record<string, string>) => {
    startDebate(JSON.stringify({ cv_text: cvText, job_description: jobDescription, extra_info: extraInfo }));
  }, [startDebate]);

  const handleDebateFile = useCallback((file: File, jobDescription: string, extraInfo: Record<string, string>) => {
    const formData = new FormData();
    formData.append('cv_file', file);
    formData.append('job_description', jobDescription);
    formData.append('extra_info', JSON.stringify(extraInfo));
    startDebate(formData);
  }, [startDebate]);

  const handleRestart = () => {
    abortRef.current?.abort();
    setPhase('input');
    resetState();
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1440px] mx-auto px-8 py-10">
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div key="input" exit={{ opacity: 0, y: -20 }}>
              <DebateInputForm onSubmitFile={handleDebateFile} onSubmitText={handleDebateText} loading={false} />
            </motion.div>
          )}

          {phase === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Target size={20} className="text-indigo-600" />
                </motion.div>
                <h2 className="text-xl font-black text-slate-800">Análise em andamento</h2>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  {stages.length} / 7 etapas
                </span>
              </div>
              <AgentTableScene
                stages={stages}
                currentStageId={currentStageId}
                debateMessages={debateMessages}
                scores={scores}
              />
            </motion.div>
          )}

          {phase === 'completed' && result && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FinalProbabilityDashboard
                result={result}
                scores={scores as DebateScores}
                onRestart={handleRestart}
              />
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto text-center py-20"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Erro na Análise</h3>
              <p className="text-sm text-slate-500 mb-6">{errorMessage}</p>
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all"
              >
                Tentar Novamente
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
