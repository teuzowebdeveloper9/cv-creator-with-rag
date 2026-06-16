import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Play, Pause, SkipForward, CheckCircle2, Clock, MessageSquare, Volume2, AlertCircle, Sparkles } from 'lucide-react';
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

interface InterviewPageProps {
  jobDescription: string;
  hasCV: boolean;
  apiClient: AxiosInstance;
}

export default function InterviewPage({ jobDescription, hasCV, apiClient }: InterviewPageProps) {
  const [jobRole, setJobRole] = useState('');
  const [techStack, setTechStack] = useState('');
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [weeklyFeedback, setWeeklyFeedback] = useState<WeeklyFeedback | null>(null);
  const [countdown, setCountdown] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('Clique em gravar para responder por voz.');
  const [errorMessage, setErrorMessage] = useState('');
  const [sttNotice, setSttNotice] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const revokeAudioURL = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const resetAnswerMedia = useCallback(() => {
    setAudioURL(prev => {
      revokeAudioURL(prev);
      return null;
    });
    setRecordingSeconds(0);
    setRecordingStatus('Clique em gravar para responder por voz.');
    setSttNotice('');
  }, [revokeAudioURL]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    fetchWeeklyFeedback();
    const interval = setInterval(fetchWeeklyFeedback, 60000);
    return () => {
      clearInterval(interval);
      stopTracks();
      revokeAudioURL(audioURL);
      currentAudio?.pause();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!weeklyFeedback || weeklyFeedback.is_unlocked) return;

    const updateCountdown = () => {
      const now = Date.now() / 1000;
      const diff = weeklyFeedback.unlock_time - now;
      if (diff <= 0) {
        setCountdown('Desbloqueado!');
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
  }, [weeklyFeedback]);

  const fetchWeeklyFeedback = async () => {
    try {
      const response = await apiClient.get('/interview/feedback/');
      setWeeklyFeedback(response.data);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    }
  };

  const startInterview = async () => {
    if (!jobRole.trim()) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/interview/start/', {
        job_role: jobRole,
        tech_stack: techStack || jobDescription,
        job_description: jobDescription,
      });
      setInterview(response.data);
      setEvaluation(null);
      setShowEvaluation(false);
    } catch (error) {
      console.error('Failed to start interview:', error);
      setErrorMessage('Não foi possível iniciar a entrevista. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    setErrorMessage('');
    setSttNotice('');
    setRecordingSeconds(0);
    setRecordingStatus('Solicitando acesso ao microfone...');
    setAudioURL(prev => {
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setRecordingStatus('Gravação pronta. Você pode ouvir, enviar ou gravar novamente.');
        stopTracks();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('Gravando sua resposta...');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingStatus('Microfone indisponível. Digite sua resposta no campo de texto.');
      setErrorMessage('Não foi possível acessar o microfone. Confira a permissão do navegador ou use a resposta digitada.');
      stopTracks();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStatus('Processando gravação...');
    }
  };

  const playQuestionAudio = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlaying(false);
    setCurrentAudio(audio);
    audio.play();
    setIsPlaying(true);
  };

  const submitAnswer = async () => {
    if (!interview) return;

    const currentQ = interview.questions.find(q => q.order === interview.current_question);
    if (!currentQ) return;

    let answerText = currentAnswer.trim();

    if (!answerText && audioURL) {
      setLoading(true);
      setSttNotice('Transcrevendo áudio antes da avaliação...');
      setErrorMessage('');
      try {
        const audioBlob = await fetch(audioURL).then(r => r.blob());
        const formData = new FormData();
        formData.append('audio', audioBlob, 'answer.webm');
        const sttResponse = await apiClient.post('/voice/stt/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (sttResponse.data.text) {
          answerText = sttResponse.data.text;
          setCurrentAnswer(answerText);
          setSttNotice('Transcrição aplicada. Revise o texto e envie quando estiver pronto.');
        }
      } catch (error) {
        console.error('STT failed:', error);
        setSttNotice('Transcrição automática indisponível. Digite sua resposta manualmente para continuar.');
      }
      setLoading(false);
    }

    if (!answerText) {
      setErrorMessage('Digite sua resposta ou grave novamente antes de enviar.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/interview/answer/', {
        interview_id: interview.id,
        question_id: currentQ.id,
        answer_text: answerText,
      });

      setEvaluation(response.data.evaluation);
      setShowEvaluation(true);
      setInterview(response.data.interview);
      setCurrentAnswer('');
      resetAnswerMedia();
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

  const currentQuestion = interview?.questions.find(q => q.order === interview.current_question);
  const isCompleted = interview?.status === 'COMPLETED';
  const formattedRecordingTime = `${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black text-slate-800 mb-2">
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Entrevista Técnica
            </span>
          </h1>
          <p className="text-slate-500">Practice with AI-powered voice interviews</p>
        </motion.div>

        {errorMessage && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Weekly Feedback Section */}
        {weeklyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className={`rounded-3xl p-6 ${
              weeklyFeedback.is_unlocked
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-slate-700 to-slate-800'
            } text-white`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1">
                    {weeklyFeedback.is_unlocked ? 'Feedback Semanal Disponível!' : 'Feedback Semanal'}
                  </h3>
                  <p className="text-sm opacity-80">
                    {weeklyFeedback.is_unlocked
                      ? 'Clique para ver sua análise completa'
                      : `Desbloqueia em: ${countdown}`}
                  </p>
                </div>
                {weeklyFeedback.is_unlocked && weeklyFeedback.feedback && (
                  <div className="text-right">
                    <div className="text-3xl font-black">
                      {weeklyFeedback.feedback.overall_score.toFixed(1)}
                    </div>
                    <div className="text-xs opacity-80">Score Geral</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Start Interview */}
        {!interview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 mb-8"
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Mic className="text-indigo-600" />
              Nova Entrevista
            </h2>

            {!hasCV ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-amber-600" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Crie seu Currículo Primeiro
                </h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Para iniciar uma entrevista técnica, primeiro crie seu currículo na aba "Currículo" usando a descrição da vaga.
                  A entrevista será personalizada com base na vaga que você definiu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-indigo-600" size={16} />
                    <span className="text-sm font-bold text-indigo-700">Vaga Detectada</span>
                  </div>
                  <p className="text-sm text-indigo-600 line-clamp-3">
                    {jobDescription || 'Nenhuma descrição de vaga encontrada'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cargo / Vaga
                  </label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="Ex: Desenvolvedor Full Stack Senior"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Stack Tecnológica (opcional)
                  </label>
                  <input
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    placeholder="Ex: React, Node.js, PostgreSQL, AWS"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <button
                  onClick={startInterview}
                  disabled={!jobRole.trim() || loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gerando Perguntas...
                    </>
                  ) : (
                    <>
                      <Mic />
                      Iniciar Entrevista
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Interview in Progress */}
        {interview && !isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Progress Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  Pergunta {interview.current_question} de {interview.total_questions}
                </span>
                <span className="text-sm text-slate-500">
                  {interview.job_role}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(interview.current_question / interview.total_questions) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                      Pergunta {currentQuestion.order}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {currentQuestion.question_text}
                    </p>
                  </div>
                </div>

                {/* Audio Controls */}
                {currentQuestion.question_audio_url && (
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={() => playQuestionAudio(currentQuestion.question_audio_url)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      <span className="text-sm font-medium">
                        {isPlaying ? 'Pausar' : 'Ouvir Pergunta'}
                      </span>
                    </button>
                    <Volume2 className="text-indigo-400" size={20} />
                  </div>
                )}

                {/* Answer Input */}
                {!showEvaluation && (
                  <div className="space-y-4">
                    <textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Digite sua resposta ou grave com o microfone..."
                      className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                    />

                    {/* Recording Controls */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-indigo-600 shadow-sm'}`}>
                            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{isRecording ? 'Gravando agora' : audioURL ? 'Áudio capturado' : 'Resposta por voz'}</p>
                            <p className="text-xs font-semibold text-slate-500">{recordingStatus}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm">
                          <Clock size={16} className="text-indigo-500" />
                          {formattedRecordingTime}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={loading}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition-all sm:w-auto ${
                            isRecording
                              ? 'bg-rose-500 text-white hover:bg-rose-600'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          } disabled:opacity-50`}
                        >
                          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                          {isRecording ? 'Parar gravação' : audioURL ? 'Gravar novamente' : 'Iniciar gravação'}
                        </button>

                        {audioURL ? (
                          <audio controls src={audioURL} className="h-10 w-full" />
                        ) : (
                          <p className="text-xs font-semibold text-slate-500">
                            STT tentará transcrever automaticamente ao enviar. Se falhar, o texto manual continua disponível.
                          </p>
                        )}
                      </div>

                      {sttNotice && (
                        <div className="mt-3 flex gap-2 rounded-xl border border-indigo-100 bg-white p-3 text-xs font-semibold text-indigo-700">
                          <Sparkles size={14} className="mt-0.5 shrink-0" />
                          <span>{sttNotice}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={submitAnswer}
                      disabled={(!currentAnswer.trim() && !audioURL) || loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 />
                          Enviar Resposta
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Evaluation */}
                <AnimatePresence>
                  {showEvaluation && evaluation && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      <div className={`p-6 rounded-2xl ${
                        evaluation.score >= 7 ? 'bg-emerald-50 border border-emerald-200' :
                        evaluation.score >= 5 ? 'bg-amber-50 border border-amber-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${
                            evaluation.score >= 7 ? 'bg-emerald-500 text-white' :
                            evaluation.score >= 5 ? 'bg-amber-500 text-white' :
                            'bg-red-500 text-white'
                          }`}>
                            {evaluation.score}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">Sua Nota</h4>
                            <p className="text-sm text-slate-600">{evaluation.feedback}</p>
                          </div>
                        </div>

                        {evaluation.strengths?.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-bold text-emerald-700 mb-1">Pontos Fortes</h5>
                            <ul className="text-sm text-emerald-600 space-y-1">
                              {evaluation.strengths.map((s: string, i: number) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {evaluation.improvements?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-bold text-amber-700 mb-1">Melhorias</h5>
                            <ul className="text-sm text-amber-600 space-y-1">
                              {(Array.isArray(evaluation.improvements) ? evaluation.improvements : [evaluation.improvements]).map((m: string, i: number) => (
                                <li key={i}>• {m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={nextQuestion}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:from-indigo-700 hover:to-violet-700 transition-all flex items-center justify-center gap-2"
                      >
                        <SkipForward />
                        Próxima Pergunta
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Interview Completed */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-8 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-white" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Entrevista Concluída!</h2>
            <p className="text-slate-500 mb-6">Parabéns por completar a entrevista técnica</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-indigo-50">
                <div className="text-3xl font-black text-indigo-600">
                  {interview.average_score.toFixed(1)}
                </div>
                <div className="text-sm text-slate-600">Score Médio</div>
              </div>
              <div className="p-4 rounded-2xl bg-violet-50">
                <div className="text-3xl font-black text-violet-600">
                  {interview.total_questions}
                </div>
                <div className="text-sm text-slate-600">Perguntas</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50">
                <div className="text-3xl font-black text-emerald-600">
                  {interview.questions.filter(q => q.score >= 7).length}
                </div>
                <div className="text-sm text-slate-600">Notas Altas</div>
              </div>
            </div>

            <button
              onClick={() => {
                setInterview(null);
                setJobRole('');
                setTechStack('');
              }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:from-indigo-700 hover:to-violet-700 transition-all"
            >
              Nova Entrevista
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
