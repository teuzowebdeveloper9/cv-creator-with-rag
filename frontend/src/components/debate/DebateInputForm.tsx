import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Briefcase, ChevronDown, ChevronUp, Send, Loader2, Upload, X, Type } from 'lucide-react';

interface DebateInputFormProps {
  onSubmitFile: (file: File, jobDescription: string, extraInfo: Record<string, string>) => void;
  onSubmitText: (cvText: string, jobDescription: string, extraInfo: Record<string, string>) => void;
  loading: boolean;
}

export default function DebateInputForm({ onSubmitFile, onSubmitText, loading }: DebateInputFormProps) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [jobDescription, setJobDescription] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extraInfo, setExtraInfo] = useState({
    english_level: '',
    salary_expectation: '',
    location: '',
    work_model: '',
  });

  const handleFileSelect = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ext === 'html' || ext === 'htm') {
      setCvFile(file);
      setCvText('');
    } else {
      alert('Formato não suportado. Use PDF ou HTML.');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const clearFile = () => {
    setCvFile(null);
    setCvText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'file') {
      if (!cvFile || !jobDescription.trim()) return;
      onSubmitFile(cvFile, jobDescription.trim(), extraInfo);
    } else {
      if (!cvText.trim() || !jobDescription.trim()) return;
      onSubmitText(cvText.trim(), jobDescription.trim(), extraInfo);
    }
  };

  const canSubmit = inputMode === 'file'
    ? !!cvFile && !!jobDescription.trim()
    : !!cvText.trim() && !!jobDescription.trim();

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-slate-800">Análise de CV com Debate de IA</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
          Envie seu currículo e a descrição da vaga. Três especialistas de IA vão debater e calcular sua probabilidade de aprovação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CV Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              <FileText size={14} /> Seu Currículo
            </label>
            <button
              type="button"
              onClick={() => {
                setInputMode(prev => prev === 'file' ? 'text' : 'file');
                clearFile();
              }}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              {inputMode === 'file' ? (
                <><Type size={10} /> Colar texto</>
              ) : (
                <><Upload size={10} /> Enviar arquivo</>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {inputMode === 'file' ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {cvFile ? (
                  <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <FileText size={18} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-800 truncate">{cvFile.name}</p>
                        <p className="text-[10px] text-emerald-500">
                          {(cvFile.size / 1024).toFixed(1)} KB — Pronto para análise
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <X size={14} className="text-emerald-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.html,.htm"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                    <Upload size={28} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-600">Arraste um PDF ou clique para selecionar</p>
                    <p className="text-[10px] text-slate-400 mt-1">PDF ou HTML, até 10MB</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={12}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                  placeholder="Cole o texto completo do seu currículo aqui..."
                />
                <p className="text-[10px] text-slate-400 mt-1">{cvText.length} caracteres</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Job Description */}
        <div>
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
            <Briefcase size={14} /> Descrição da Vaga
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
            placeholder="Cole a descrição completa da vaga aqui..."
            required
          />
          <p className="text-[10px] text-slate-400 mt-1">{jobDescription.length} caracteres</p>
        </div>
      </div>

      {/* Extra Info Toggle */}
      <button
        type="button"
        onClick={() => setShowExtra(!showExtra)}
        className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        {showExtra ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showExtra ? 'Ocultar informações extras' : 'Adicionar informações extras (opcional)'}
      </button>

      {showExtra && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nível de Inglês</label>
            <select
              value={extraInfo.english_level}
              onChange={(e) => setExtraInfo(prev => ({ ...prev, english_level: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-500"
            >
              <option value="">Selecione</option>
              <option value="Basico">Básico</option>
              <option value="Intermediario">Intermediário</option>
              <option value="Avancado">Avançado</option>
              <option value="Fluente">Fluente</option>
              <option value="Nativo">Nativo</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Pretensão Salarial</label>
            <input
              type="text"
              value={extraInfo.salary_expectation}
              onChange={(e) => setExtraInfo(prev => ({ ...prev, salary_expectation: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-500"
              placeholder="R$ 8.000"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Localização</label>
            <input
              type="text"
              value={extraInfo.location}
              onChange={(e) => setExtraInfo(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-500"
              placeholder="São Paulo, SP"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Modelo de Trabalho</label>
            <select
              value={extraInfo.work_model}
              onChange={(e) => setExtraInfo(prev => ({ ...prev, work_model: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-500"
            >
              <option value="">Selecione</option>
              <option value="Presencial">Presencial</option>
              <option value="Hibrido">Híbrido</option>
              <option value="Remoto">Remoto</option>
            </select>
          </div>
        </motion.div>
      )}

      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Iniciando análise...
            </>
          ) : (
            <>
              <Send size={18} />
              Iniciar Debate
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}
