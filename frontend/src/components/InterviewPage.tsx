import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Brain, Bot, CheckCircle2, Keyboard, Loader2, Mic, MicOff, Pencil, Play, Sparkles, Volume2
} from 'lucide-react';
import type { AxiosInstance } from 'axios';
import { OrbAssistant, type VoiceStage } from './OrbAssistant';
import { StageBadge } from './StageBadge';

interface Question {
  id: number;
  question_text: string;
  question_audio_url: string;
  answer_text: string;
  score: number;
  feedback: string;
  order: number;
}

interface Interview {
  id: number;
  status: string;
  job_role: string;
  tech_stack: string;
  total_questions: number;
  current_question: number;
  average_score: number;
  questions: Question[];
  started_at: string;
}

interface WeeklyFeedback {
  is_unlocked: boolean;
  unlock_time: number;
  current_time: number;
  feedback: {
    summary: string;
    overall_score: number;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  } | null;
}

interface ConversationPrompt {
  question_id: number;
  order: number;
  total: number;
  text: string;
  audio_url: string;
}

interface ConversationState {
  stage: string;
  turn_state: string;
  candidate_action: string;
  interviewer?: {
    name?: string;
    role?: string;
    persona?: string;
    voice_provider?: string;
  };
  prompt?: ConversationPrompt | null;
}

interface EvaluationState {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewPayload {
  interview: Interview;
  conversation?: ConversationState;
}

interface SubmitAnswerPayload extends InterviewPayload {
  evaluation: EvaluationState;
}

interface InterviewPageProps {
  jobDescription: string;
  hasCV: boolean;
  apiClient: AxiosInstance;
}

const formatResponsePayload = <T extends InterviewPayload>(payload: T | Interview): T => {
  if ('interview' in payload) return payload as T;
  return { interview: payload as Interview } as T;
};

export default function InterviewPage({ jobDescription, hasCV, apiClient }: InterviewPageProps) {
  const [jobRole, setJobRole] = useState('');
  const [techStack, setTechStack] = useState('');
  const [interview, setInterview] = useState<Interview | null>(null);
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationState | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [weeklyFeedback, setWeeklyFeedback] = useState<WeeklyFeedback | null>(null);
  const [countdown, setCountdown] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [transcriptionReady, setTranscriptionReady] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAutoPlayedPromptRef = useRef<string>('');

  const revokeAudioURL = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const resetAnswerMedia = useCallback(() => {
    setAudioURL((prev) => { revokeAudioURL(prev); return null; });
    setRecordingSeconds(0);
    setTranscriptionReady(false);
    setShowTextInput(false);
  }, [revokeAudioURL]);

  const currentQuestion = interview?.questions.find((q) => q.order === interview.current_question) || null;
  const currentPrompt = conversation?.prompt || (currentQuestion
    ? { question_id: currentQuestion.id, order: currentQuestion.order, total: interview?.total_questions || currentQuestion.order, text: currentQuestion.question_text, audio_url: currentQuestion.question_audio_url }
    : null);
  const isCompleted = interview?.status === 'COMPLETED';
  const interviewerName = conversation?.interviewer?.name || 'Violet';

  const voiceStage: VoiceStage = isCompleted
    ? 'completed'
    : showEvaluation
      ? 'feedback'
      : loading
        ? (transcriptionReady ? 'processing' : 'transcribing')
        : isRecording
          ? 'listening'
          : isPlaying
            ? 'assistant_speaking'
            : currentPrompt
              ? 'candidate_ready'
              : 'idle';

  const orbSubtitle = voiceStage === 'assistant_speaking'
    ? 'Apresentando a pergunta com voz sintetizada.'
    : voiceStage === 'candidate_ready'
      ? 'Aperte o microfone e responda quando estiver pronto.'
      : voiceStage === 'listening'
        ? 'Escutando sua resposta em tempo real.'
        : voiceStage === 'transcribing'
          ? 'Convertendo sua fala em texto...'
          : voiceStage === 'processing'
            ? 'Analisando a resposta.'
            : voiceStage === 'feedback'
              ? 'Feedback técnico pronto para revisão.'
              : voiceStage === 'completed'
                ? 'Entrevista encerrada. Revise sua performance.'
                : 'Pronto para conduzir a próxima simulação.';

  const formattedRecordingTime = `${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  const fetchWeeklyFeedback = useCallback(async () => {
    try {
      const response = await apiClient.get('/interview/feedback/');
      setWeeklyFeedback(response.data);
    } catch { console.error('Failed to fetch feedback:'); }
  }, [apiClient]);

  useEffect(() => {
    fetchWeeklyFeedback();
    const interval = setInterval(fetchWeeklyFeedback, 60000);
    return () => { clearInterval(interval); stopTracks(); revokeAudioURL(audioURL); currentAudio?.pause(); };
  }, [audioURL, currentAudio, fetchWeeklyFeedback, revokeAudioURL, stopTracks]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!weeklyFeedback || weeklyFeedback.is_unlocked) return;
    const updateCountdown = () => {
      const now = Date.now() / 1000;
      const diff = weeklyFeedback.unlock_time - now;
      if (diff <= 0) { setCountdown('Desbloqueado'); fetchWeeklyFeedback(); return; }
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = Math.floor(diff % 60);
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [fetchWeeklyFeedback, weeklyFeedback]);

  const playQuestionAudio = useCallback((audioUrl: string) => {
    if (!audioUrl) return;
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    setCurrentAudio(audio);
    audio.play().catch(() => setIsPlaying(false));
  }, [currentAudio]);

  useEffect(() => {
    if (!currentPrompt || showEvaluation) return;
    const promptKey = `${interview?.id || 'none'}:${currentPrompt.question_id}`;
    if (lastAutoPlayedPromptRef.current === promptKey) return;
    lastAutoPlayedPromptRef.current = promptKey;
    if (currentPrompt.audio_url) playQuestionAudio(currentPrompt.audio_url);
    else setIsPlaying(false);
  }, [currentPrompt, interview?.id, playQuestionAudio, showEvaluation]);

  const startInterview = async () => {
    if (!jobRole.trim()) return;
    setLoading(true);
    setErrorMessage('');
    setEvaluation(null);
    setShowEvaluation(false);
    lastAutoPlayedPromptRef.current = '';
    try {
      const response = await apiClient.post('/interview/start/', {
        job_role: jobRole, tech_stack: techStack || jobDescription, job_description: jobDescription,
      });
      const payload = formatResponsePayload<InterviewPayload>(response.data);
      setInterview(payload.interview);
      setConversation(payload.conversation || null);
      resetAnswerMedia();
      setCurrentAnswer('');
    } catch {
      setErrorMessage('Não foi possível iniciar a entrevista agora. Verifique o áudio e tente novamente.');
    } finally { setLoading(false); }
  };

  const startRecording = async () => {
    if (isRecording || isPlaying || !interview || showEvaluation) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Este navegador não suporta gravação de áudio. Use Chrome, Firefox ou Edge.');
      setShowTextInput(true);
      return;
    }
    setErrorMessage('');
    setTranscriptionReady(false);
    setShowTextInput(false);
    setRecordingSeconds(0);
    setAudioURL((prev) => { revokeAudioURL(prev); return null; });
    setCurrentAnswer('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        stopTracks();
        await transcribeAudio(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      stopTracks();
      setErrorMessage('Microfone indisponível. Digite sua resposta manualmente.');
      setShowTextInput(true);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'answer.webm');
      const sttResponse = await apiClient.post('/voice/stt/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (sttResponse.data.text) { setCurrentAnswer(sttResponse.data.text); setTranscriptionReady(true); }
      else { setErrorMessage('Não consegui transcrever o áudio. Digite sua resposta manualmente.'); setShowTextInput(true); }
    } catch {
      setErrorMessage('Transcrição automática falhou. Digite sua resposta.');
      setShowTextInput(true);
    } finally { setLoading(false); }
  };

  const submitAnswer = async () => {
    if (!interview || !currentPrompt) return;
    const answerText = currentAnswer.trim();
    if (!answerText) { setErrorMessage('Grave ou digite sua resposta antes de enviar.'); return; }
    setLoading(true);
    setErrorMessage('');
    setTranscriptionReady(false);
    try {
      const response = await apiClient.post('/interview/answer/', {
        interview_id: interview.id, question_id: currentPrompt.question_id, answer_text: answerText,
      });
      const payload = response.data as SubmitAnswerPayload;
      setEvaluation(payload.evaluation);
      setShowEvaluation(true);
      setInterview(payload.interview);
      setConversation(payload.conversation || null);
    } catch {
      setErrorMessage('Não foi possível enviar a resposta. Tente novamente.');
    } finally { setLoading(false); }
  };

  const nextQuestion = () => {
    setShowEvaluation(false);
    setEvaluation(null);
    resetAnswerMedia();
    setCurrentAnswer('');
  };

  return (
    <div className="min-h-screen px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700 shadow-sm">
              <Sparkles size={14} /> Simulação guiada por voz
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Entrevista técnica em modo conversacional</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              A IA conduz a entrevista com voz sintetizada, você responde gravando sua fala e recebe avaliação logo em seguida.
            </p>
          </div>
          <StageBadge stage={voiceStage} />
        </div>

        {errorMessage && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-sm">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {weeklyFeedback && (
          <div className={`mb-8 rounded-[28px] border px-5 py-5 shadow-sm sm:px-6 ${weeklyFeedback.is_unlocked ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white/90'}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Feedback semanal</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {weeklyFeedback.is_unlocked ? 'Sua análise consolidada está disponível.' : `Liberação em ${countdown}`}
                </div>
              </div>
              {weeklyFeedback.is_unlocked && weeklyFeedback.feedback && (
                <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-right">
                  <div className="text-3xl font-black text-emerald-700">{weeklyFeedback.feedback.overall_score.toFixed(1)}</div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600/80">Score geral</div>
                </div>
              )}
            </div>
          </div>
        )}

        {!interview && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
              <div className="mb-6">
                <div className="text-sm font-black uppercase tracking-[0.18em] text-violet-600/75">Setup da entrevista</div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Defina a vaga e comece a simulação</h2>
              </div>
              {!hasCV ? (
                <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-5">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><AlertCircle size={24} /></div>
                  <h3 className="text-lg font-bold text-slate-900">Gere o currículo antes</h3>
                  <p className="mt-2 text-sm leading-6 text-amber-800/90">
                    A entrevista usa a vaga e o histórico do seu perfil para montar perguntas coerentes. Primeiro finalize o currículo na aba principal.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-700">
                      <Brain size={16} /> Contexto da vaga
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{jobDescription || 'Nenhuma descrição de vaga carregada.'}</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Cargo alvo</label>
                    <input type="text" value={jobRole} onChange={(e) => setJobRole(e.target.value)}
                      placeholder="Ex: Desenvolvedor Full Stack Sênior"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400/40 focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Stack priorizada</label>
                    <input type="text" value={techStack} onChange={(e) => setTechStack(e.target.value)}
                      placeholder="Ex: React, Node.js, PostgreSQL, AWS"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400/40 focus:bg-white" />
                  </div>
                  <button onClick={startInterview} disabled={!jobRole.trim() || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />}
                    {loading ? 'Preparando perguntas' : 'Iniciar entrevista'}
                  </button>
                </div>
              )}
            </section>
            <section className="rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(110,60,255,0.18),rgba(18,14,32,0.98)_36%,rgba(8,6,18,1)_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-8">
              <OrbAssistant stage="idle" interviewerName="Violet" subtitle="A entrevistadora conduz a conversa com voz sintetizada e turnos claros." />
              <div className="mt-6 grid gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">1. A IA faz a pergunta</div>
                  <p className="text-sm leading-6 text-slate-950">Ela se apresenta e pergunta em voz alta. Você ouve a pergunta completa.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">2. Grave sua resposta</div>
                  <p className="text-sm leading-6 text-slate-950">Aperte o microfone, responda em voz alta e encerre a gravação quando terminar.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">3. Confirme e envie</div>
                  <p className="text-sm leading-6 text-slate-950">A transcrição aparece para você revisar. Edite se necessário e envie para avaliação.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {interview && (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(107,47,250,0.18),rgba(18,14,32,0.98)_32%,rgba(8,6,18,1)_100%)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.16)] sm:p-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-violet-200/90">Sala de entrevista</div>
                  <h2 className="mt-2 text-2xl font-black text-white">{interview.job_role}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    {currentPrompt?.text || 'Aguardando a próxima pergunta.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Progresso</div>
                  <div className="mt-1 text-lg font-black text-white">
                    {Math.min(interview.current_question || interview.total_questions, interview.total_questions)} / {interview.total_questions}
                  </div>
                </div>
              </div>
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-[linear-gradient(135deg,#8b5cf6,#4f46e5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${((Math.max((interview.current_question || 1) - (showEvaluation ? 1 : 0), 1)) / Math.max(interview.total_questions, 1)) * 100}%` }}
                  transition={{ duration: 0.45 }}
                />
              </div>
              <OrbAssistant stage={voiceStage} interviewerName={interviewerName} subtitle={orbSubtitle} />
              <div className="mt-8 flex flex-col items-center gap-4">
                {!showEvaluation && voiceStage === 'candidate_ready' && (
                  <motion.button onClick={startRecording} disabled={loading || isPlaying || isCompleted}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Mic size={32} />
                  </motion.button>
                )}
                {!showEvaluation && voiceStage === 'listening' && (
                  <motion.button onClick={stopRecording} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30"
                  >
                    <MicOff size={32} />
                  </motion.button>
                )}
                {voiceStage === 'listening' && (
                  <div className="flex items-center gap-3 text-sm font-bold text-fuchsia-200">
                    <motion.div className="h-3 w-3 rounded-full bg-fuchsia-400"
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                    />
                    {formattedRecordingTime}
                  </div>
                )}
                {!showEvaluation && !isRecording && (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button onClick={() => currentPrompt?.audio_url && playQuestionAudio(currentPrompt.audio_url)}
                      disabled={!currentPrompt?.audio_url || loading}
                      className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Volume2 size={16} /> Ouvir novamente
                    </button>
                    {transcriptionReady && (
                      <button onClick={submitAnswer} disabled={loading || !currentAnswer.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Enviar resposta
                      </button>
                    )}
                    {showTextInput && (
                      <button onClick={() => setShowTextInput(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/20 bg-slate-500/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-500/15"
                      >
                        <Keyboard size={16} /> Digitar resposta
                      </button>
                    )}
                  </div>
                )}
                {showEvaluation && (
                  <button onClick={nextQuestion}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
                  >
                    <Play size={16} /> {isCompleted ? 'Revisar resultado final' : 'Próxima pergunta'}
                  </button>
                )}
              </div>
            </section>
            <section className="space-y-6">
              {transcriptionReady && !showEvaluation && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Transcrição</div>
                      <h3 className="mt-1 text-lg font-black text-slate-900">Revise sua resposta</h3>
                    </div>
                    <button onClick={() => setShowTextInput(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm leading-6 text-slate-700">{currentAnswer}</p>
                  </div>
                  {audioURL && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sua gravação</div>
                      <audio src={audioURL} controls className="w-full" />
                    </div>
                  )}
                </div>
              )}
              {showTextInput && !showEvaluation && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Resposta manual</div>
                      <h3 className="mt-1 text-lg font-black text-slate-900">Digite sua resposta</h3>
                    </div>
                    {transcriptionReady && (
                      <button onClick={() => setShowTextInput(false)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                      >
                        Voltar para transcrição
                      </button>
                    )}
                  </div>
                  <textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Digite sua resposta aqui..."
                    className="h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-violet-400/40"
                  />
                  <div className="mt-4 flex justify-end">
                    <button onClick={submitAnswer} disabled={loading || !currentAnswer.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Enviar resposta
                    </button>
                  </div>
                </div>
              )}
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="mb-4 flex items-center gap-2">
                  <Bot size={18} className="text-violet-600" />
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Entrevistadora</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-lg font-black text-slate-900">{interviewerName}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {conversation?.interviewer?.role || 'Entrevistadora de IA'}
                    {conversation?.interviewer?.persona ? ` · ${conversation.interviewer.persona}` : ''}
                  </p>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700/80">
                    Voz: {conversation?.interviewer?.voice_provider === 'elevenlabs' ? 'ElevenLabs ativo' : 'Fallback sem TTS'}
                  </div>
                </div>
              </div>
              {showEvaluation && evaluation && (
                <div className="rounded-[28px] border border-emerald-400/15 bg-emerald-500/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Avaliação da resposta</div>
                      <h3 className="mt-1 text-xl font-black text-white">Nota {evaluation.score.toFixed(1)}</h3>
                    </div>
                    <div className="rounded-2xl bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-50">Feedback imediato</div>
                  </div>
                  <p className="text-sm leading-6 text-emerald-50/90">{evaluation.feedback}</p>
                  {!!evaluation.strengths.length && (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Pontos fortes</div>
                      <ul className="space-y-2 text-sm text-emerald-50/90">
                        {evaluation.strengths.map((item, index) => (
                          <li key={`${item}-${index}`} className="rounded-xl border border-emerald-300/10 bg-black/10 px-3 py-2">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!evaluation.improvements.length && (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Ajustes sugeridos</div>
                      <ul className="space-y-2 text-sm text-emerald-50/90">
                        {evaluation.improvements.map((item, index) => (
                          <li key={`${item}-${index}`} className="rounded-xl border border-emerald-300/10 bg-black/10 px-3 py-2">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {isCompleted && interview && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Resumo da sessão</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{interview.average_score.toFixed(1)}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Média final da entrevista para {interview.job_role}. Refaça a simulação com outra vaga para treinar novas linhas de resposta.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
