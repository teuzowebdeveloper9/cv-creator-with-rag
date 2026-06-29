import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, X } from 'lucide-react';
import { Button } from './ui/Button';
import { apiClient, API_BASE_URL, jsonHeadersWithCSRF } from '../api/client';

interface GeneratedCV {
  id: number;
  file_name: string;
  job_description: string;
  created_at: string;
}

interface StatusMessage {
  type: string;
  message: string;
}

interface HistoryPageProps {
  onStatusMessage?: (msg: StatusMessage) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onStatusMessage }) => {
  const [generatedCVs, setGeneratedCVs] = useState<GeneratedCV[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewingCV, setPreviewingCV] = useState<{id: number; file_name: string; url: string} | null>(null);

  const fetchGeneratedCVs = async () => {
    setHistoryLoading(true);
    try {
      const response = await apiClient.get('/generated-cvs/');
      setGeneratedCVs(response.data);
    } catch (error) {
      console.error("Erro ao buscar CVs gerados:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteGeneratedCV = async (cvId: number) => {
    try {
      await apiClient.delete(`/generated-cvs/${cvId}/`);
      setGeneratedCVs(prev => prev.filter(cv => cv.id !== cvId));
      if (previewingCV?.id === cvId) setPreviewingCV(null);
      onStatusMessage?.({ type: 'success', message: 'CV excluído com sucesso.' });
    } catch {
      onStatusMessage?.({ type: 'error', message: 'Erro ao excluir CV.' });
    }
  };

  const previewGeneratedCV = async (cvId: number, fileName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/generated-cvs/${cvId}/serve/`, {
        credentials: 'include',
        headers: jsonHeadersWithCSRF(),
      });
      if (!response.ok) throw new Error('Falha ao carregar PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPreviewingCV({ id: cvId, file_name: fileName, url });
    } catch {
      onStatusMessage?.({ type: 'error', message: 'Erro ao visualizar PDF.' });
    }
  };

  const downloadGeneratedCV = async (cvId: number, fileName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/generated-cvs/${cvId}/serve/`, {
        credentials: 'include',
        headers: jsonHeadersWithCSRF(),
      });
      if (!response.ok) throw new Error('Falha ao baixar PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.pdf$/, '') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      onStatusMessage?.({ type: 'error', message: 'Erro ao baixar PDF.' });
    }
  };

  useEffect(() => {
    fetchGeneratedCVs();
  }, []);

  return (
    <main className="max-w-[1440px] mx-auto px-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Meus CVs Gerados</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Todos os currículos que você gerou ficam salvos aqui.</p>
        </div>
        <Button onClick={fetchGeneratedCVs} variant="secondary" loading={historyLoading}>
          Atualizar
        </Button>
      </div>

      {generatedCVs.length === 0 && !historyLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-40">
          <FileText size={56} />
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">Nenhum CV gerado ainda</p>
          <p className="text-xs font-medium text-slate-400">Gere seu primeiro currículo na aba Currículo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {generatedCVs.map(cv => (
            <motion.div
              key={cv.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 border border-slate-100/80 bg-white/70 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{cv.file_name}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {new Date(cv.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
              {cv.job_description && (
                <p className="text-xs font-medium text-slate-500 mb-4 line-clamp-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {cv.job_description}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={() => previewGeneratedCV(cv.id, cv.file_name)} variant="primary" size="sm" className="flex-1">
                  <FileText size={14} /> Visualizar
                </Button>
                <Button onClick={() => downloadGeneratedCV(cv.id, cv.file_name)} variant="secondary" size="sm" className="flex-1">
                  <Download size={14} /> Baixar
                </Button>
                <Button onClick={() => deleteGeneratedCV(cv.id)} variant="danger" size="sm">
                  <X size={14} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {previewingCV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { window.URL.revokeObjectURL(previewingCV.url); setPreviewingCV(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-indigo-600" />
                  <span className="text-sm font-bold text-slate-700">{previewingCV.file_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => downloadGeneratedCV(previewingCV.id, previewingCV.file_name)} variant="secondary" size="sm">
                    <Download size={14} /> Baixar
                  </Button>
                  <button onClick={() => { window.URL.revokeObjectURL(previewingCV.url); setPreviewingCV(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <iframe src={previewingCV.url} className="flex-1 w-full" title="PDF Preview" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
