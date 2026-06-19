import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  Mic,
  MicOff,
  Play,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { AxiosInstance } from 'axios';

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

type VoiceStage =
  | 'idle'
  | 'assistant_speaking'
  | 'candidate_ready'
  | 'listening'
  | 'processing'
  | 'feedback'
  | 'completed';

const formatResponsePayload = <T extends InterviewPayload>(payload: T | Interview): T => {
  if ('interview' in payload) {
    return payload as T;
  }

  return { interview: payload as Interview } as T;
};

const OrbAssistant = ({
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
  const isProcessing = stage === 'processing';
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

const StageBadge = ({ stage }: { stage: VoiceStage }) => {
  const config: Record<VoiceStage, { label: string; className: string }> = {
    idle: { label: 'Pronto para iniciar', className: 'bg-white/10 text-slate-200 border-white/10' },
    assistant_speaking: { label: 'IA falando', className: 'bg-violet-500/15 text-violet-100 border-violet-300/20' },
    candidate_ready: { label: 'Sua vez de responder', className: 'bg-indigo-500/15 text-indigo-100 border-indigo-300/20' },
    listening: { label: 'IA escutando', className: 'bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-300/20' },
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
  const [recordingStatus, setRecordingStatus] = useState('Quando for sua vez, clique para começar a responder.');
  const [errorMessage, setErrorMessage] = useState('');
  const [sttNotice, setSttNotice] = useState('');

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
    setAudioURL((prev) => {
      revokeAudioURL(prev);
      return null;
    });
    setRecordingSeconds(0);
    setRecordingStatus('Quando for sua vez, clique para começar a responder.');
    setSttNotice('');
  }, [revokeAudioURL]);

  const currentQuestion = interview?.questions.find((q) => q.order === interview.current_question) || null;
  const currentPrompt = conversation?.prompt || (currentQuestion
    ? {
        question_id: currentQuestion.id,
        order: currentQuestion.order,
        total: interview?.total_questions || currentQuestion.order,
        text: currentQuestion.question_text,
        audio_url: currentQuestion.question_audio_url,
      }
    : null);
  const isCompleted = interview?.status === 'COMPLETED';
  const interviewerName = conversation?.interviewer?.name || 'Violet';

  const voiceStage: VoiceStage = isCompleted
    ? 'completed'
    : showEvaluation
      ? 'feedback'
      : loading
        ? 'processing'
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
      ? 'Sua vez. Estruture a resposta como em uma entrevista real.'
      : voiceStage === 'listening'
        ? 'Escutando sua resposta em tempo real.'
        : voiceStage === 'processing'
          ? 'Analisando a resposta e preparando o próximo passo.'
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
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchWeeklyFeedback();
    const interval = setInterval(fetchWeeklyFeedback, 60000);
    return () => {
      clearInterval(interval);
      stopTracks();
      revokeAudioURL(audioURL);
      currentAudio?.pause();
    };
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
      if (diff <= 0) {
        setCountdown('Desbloqueado');
        fetchWeeklyFeedback();
        return;
      }
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
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    setCurrentAudio(audio);
    audio.play().catch((error) => {
      console.error('Failed to play interview prompt:', error);
      setIsPlaying(false);
    });
  }, [currentAudio]);

  useEffect(() => {
    if (!currentPrompt || showEvaluation) return;
    const promptKey = `${interview?.id || 'none'}:${currentPrompt.question_id}`;
    if (lastAutoPlayedPromptRef.current === promptKey) return;

    lastAutoPlayedPromptRef.current = promptKey;
    setRecordingStatus('Ouça a pergunta e comece sua resposta quando a fala terminar.');

    if (currentPrompt.audio_url) {
      playQuestionAudio(currentPrompt.audio_url);
      return;
    }

    setIsPlaying(false);
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
        job_role: jobRole,
        tech_stack: techStack || jobDescription,
        job_description: jobDescription,
      });
      const payload = formatResponsePayload<InterviewPayload>(response.data);
      setInterview(payload.interview);
      setConversation(payload.conversation || null);
      resetAnswerMedia();
      setCurrentAnswer('');
    } catch (error) {
      console.error('Failed to start interview:', error);
      setErrorMessage('Não foi possível iniciar a entrevista agora. Verifique o áudio e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || isPlaying || !interview || showEvaluation) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Este navegador não oferece captura de microfone para a simulação.');
      return;
    }

    setErrorMessage('');
    setSttNotice('');
    setRecordingSeconds(0);
    setRecordingStatus('Solicitando acesso ao microfone...');
    setAudioURL((prev) => {
      revokeAudioURL(prev);
      return null;
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setRecordingStatus('Resposta capturada. Revise o texto ou envie para avaliação.');
        stopTracks();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('Gravando sua resposta. Encerre quando concluir sua linha de raciocínio.');
    } catch (error) {
      console.error('Failed to start recording:', error);
      stopTracks();
      setRecordingStatus('Microfone indisponível. Digite sua resposta manualmente.');
      setErrorMessage('Não foi possível acessar o microfone. Libere a permissão ou responda por texto.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingStatus('Encerrando captura de áudio...');
  };

  const submitAnswer = async () => {
    if (!interview || !currentPrompt) return;

    let answerText = currentAnswer.trim();

    if (!answerText && audioURL) {
      setLoading(true);
      setSttNotice('Transcrevendo a resposta em voz antes da avaliação...');
      setErrorMessage('');
      try {
        const audioBlob = await fetch(audioURL).then((r) => r.blob());
        const formData = new FormData();
        formData.append('audio', audioBlob, 'answer.webm');
        const sttResponse = await apiClient.post('/voice/stt/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (sttResponse.data.text) {
          answerText = sttResponse.data.text;
          setCurrentAnswer(answerText);
          setSttNotice('Transcrição concluída. A resposta seguirá para avaliação.');
        }
      } catch (error) {
        console.error('STT failed:', error);
        setSttNotice('A transcrição automática falhou. Edite sua resposta manualmente antes de enviar.');
      } finally {
        setLoading(false);
      }
    }

    if (!answerText) {
      setErrorMessage('Grave ou digite sua resposta antes de enviar para avaliação.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/interview/answer/', {
        interview_id: interview.id,
        question_id: currentPrompt.question_id,
        answer_text: answerText,
      });
      const payload = response.data as SubmitAnswerPayload;
      setEvaluation(payload.evaluation);
      setShowEvaluation(true);
      setInterview(payload.interview);
      setConversation(payload.conversation || null);
      setCurrentAnswer(answerText);
      setRecordingStatus('Feedback pronto. Revise antes de avançar.');
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setErrorMessage('Não foi possível enviar a resposta. Seu texto foi preservado para tentar novamente.');
    } finally {
      setLoading(false);
    }
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
              <Sparkles size={14} />
              Simulação guiada por voz
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Entrevista técnica em modo conversacional
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              A IA conduz a entrevista com voz sintetizada, você responde em turno único, encerra sua fala e recebe avaliação logo em seguida.
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
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Gere o currículo antes</h3>
                  <p className="mt-2 text-sm leading-6 text-amber-800/90">
                    A entrevista usa a vaga e o histórico do seu perfil para montar perguntas coerentes. Primeiro finalize o currículo na aba principal.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-700">
                      <Brain size={16} />
                      Contexto da vaga
                    </div>
                    <p className="text-sm leading-6 text-slate-700">
                      {jobDescription || 'Nenhuma descrição de vaga carregada.'}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Cargo alvo
                    </label>
                    <input
                      type="text"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="Ex: Desenvolvedor Full Stack Sênior"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400/40 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Stack priorizada
                    </label>
                    <input
                      type="text"
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                      placeholder="Ex: React, Node.js, PostgreSQL, AWS"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-violet-400/40 focus:bg-white"
                    />
                  </div>

                  <button
                    onClick={startInterview}
                    disabled={!jobRole.trim() || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />}
                    {loading ? 'Preparando perguntas' : 'Iniciar entrevista'}
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(110,60,255,0.18),rgba(18,14,32,0.98)_36%,rgba(8,6,18,1)_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:p-8">
              <OrbAssistant
                stage="idle"
                interviewerName="Violet"
                subtitle="A entrevistadora conduz a conversa com voz sintetizada e turnos claros."
              />
              <div className="mt-6 grid gap-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">1. A IA abre a sessão</div>
                  <p className="text-sm leading-6 text-slate-950">Ela se apresenta, contextualiza a dinâmica e faz a pergunta em voz alta.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">2. Sua vez de falar</div>
                  <p className="text-sm leading-6 text-slate-950">Você inicia a gravação, responde em voz alta e encerra sua fala quando terminar.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950">3. Feedback imediato</div>
                  <p className="text-sm leading-6 text-slate-950">A resposta é transcrita, avaliada e a próxima pergunta entra no fluxo automaticamente.</p>
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
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(135deg,#8b5cf6,#4f46e5)]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((Math.max((interview.current_question || 1) - (showEvaluation ? 1 : 0), 1)) / Math.max(interview.total_questions, 1)) * 100}%`,
                  }}
                  transition={{ duration: 0.45 }}
                />
              </div>

              <OrbAssistant stage={voiceStage} interviewerName={interviewerName} subtitle={orbSubtitle} />

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => currentPrompt?.audio_url && playQuestionAudio(currentPrompt.audio_url)}
                  disabled={!currentPrompt?.audio_url || loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Volume2 size={16} />
                  Ouvir novamente
                </button>

                {!showEvaluation && (
                  <>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={loading || isPlaying || isCompleted}
                        className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/10 px-4 py-3 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Mic size={16} />
                        Começar resposta
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-500/15"
                      >
                        <MicOff size={16} />
                        Encerrar fala
                      </button>
                    )}

                    <button
                      onClick={submitAnswer}
                      disabled={loading || isRecording || (!currentAnswer.trim() && !audioURL)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      Enviar para avaliação
                    </button>
                  </>
                )}

                {showEvaluation && (
                  <button
                    onClick={nextQuestion}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#4f46e5)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110"
                  >
                    <Play size={16} />
                    {isCompleted ? 'Revisar resultado final' : 'Próxima pergunta'}
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Turno atual</div>
                    <h3 className="mt-1 text-lg font-black text-slate-900">Resposta do candidato</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                    <Clock size={16} className="text-violet-300" />
                    {formattedRecordingTime}
                  </div>
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Estado da captura</div>
                  <p className="text-sm leading-6 text-slate-700">{recordingStatus}</p>
                  {sttNotice && <p className="mt-2 text-xs font-semibold text-violet-200/85">{sttNotice}</p>}
                </div>

                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Sua transcrição aparece aqui. Você pode editar antes de enviar."
                  className="h-48 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-violet-400/40"
                />

                {audioURL && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Prévia do áudio</div>
                    <audio src={audioURL} controls className="w-full" />
                  </div>
                )}
              </div>

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
                <div className="rounded-2xl bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-50">
                      Feedback imediato
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-emerald-50/90">{evaluation.feedback}</p>

                  {!!evaluation.strengths.length && (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Pontos fortes</div>
                      <ul className="space-y-2 text-sm text-emerald-50/90">
                        {evaluation.strengths.map((item, index) => (
                          <li key={`${item}-${index}`} className="rounded-xl border border-emerald-300/10 bg-black/10 px-3 py-2">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!evaluation.improvements.length && (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">Ajustes sugeridos</div>
                      <ul className="space-y-2 text-sm text-emerald-50/90">
                        {evaluation.improvements.map((item, index) => (
                          <li key={`${item}-${index}`} className="rounded-xl border border-emerald-300/10 bg-black/10 px-3 py-2">
                            {item}
                          </li>
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
