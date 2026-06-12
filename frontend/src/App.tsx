import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  Loader2, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Edit3,
  ChevronRight,
  FolderOpen,
  FileCode,
  Save,
  Wand2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8000/api';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, loading, variant = "primary", className = "" }) => {
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-200 hover:shadow-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
    ghost: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : children}
    </button>
  );
};

interface UploadQueue {
  active: boolean;
  total: number;
  current: number;
  success: number;
  error: number;
  logs: string[];
}

interface ProviderStatus {
  [key: string]: boolean;
}

interface DocumentRecord {
  id: number;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  error_message?: string;
  created_at: string;
}

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [generatedCV, setGeneratedCV] = useState<string>('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string>('');
  const [editableCV, setEditableCV] = useState<string>('');
  const [isEditingCV, setIsEditingCV] = useState<boolean>(false);
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [updatingCV, setUpdatingCV] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: string; message: string }>({ type: '', message: '' });
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({});
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  
  const [uploadQueue, setUploadQueue] = useState<UploadQueue>({
    active: false,
    total: 0,
    current: 0,
    success: 0,
    error: 0,
    logs: []
  });

  const addLog = (msg: string) => {
    setUploadQueue(prev => ({
      ...prev,
      logs: [msg, ...prev.logs].slice(0, 5)
    }));
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
    }
  };

  useEffect(() => {
    const fetchProviderStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/providers-status/`);
        setProviderStatus(response.data);
      } catch (error) {
        console.error("Erro ao buscar status dos provedores:", error);
      }
    };
    fetchProviderStatus();
    fetchDocuments();
    const interval = setInterval(() => {
      fetchProviderStatus();
      fetchDocuments();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const createPDFBlobUrl = async (markdown: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/download-pdf/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown }),
    });

    if (!response.ok) {
      let message = 'Falha ao montar o PDF.';
      try {
        const data = await response.json();
        if (data.error) message = data.error;
      } catch {
        // Keep the generic message when the response is not JSON.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    return window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  };

  const refreshPDFPreview = async (markdown: string): Promise<string> => {
    setPdfLoading(true);
    setPdfError('');
    try {
      const url = await createPDFBlobUrl(markdown);
      setPdfPreviewUrl(url);
      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao montar o PDF.';
      setPdfError(message);
      throw error;
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedCV) return;
    setDownloading(true);
    try {
      const url = pdfPreviewUrl || (await refreshPDFPreview(generatedCV));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'curriculo.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erro ao baixar o PDF.' });
    } finally {
      setDownloading(false);
    }
  };

  const handleStartEdit = () => {
    setEditableCV(generatedCV);
    setEditInstruction('');
    setPdfError('');
    setIsEditingCV(true);
  };

  const handleCancelEdit = () => {
    setEditableCV(generatedCV);
    setEditInstruction('');
    setIsEditingCV(false);
  };

  const handleSaveEdit = async () => {
    const markdown = editableCV.trim();
    if (!markdown) return;

    setGeneratedCV(markdown);
    setIsEditingCV(false);
    setEditInstruction('');

    try {
      await refreshPDFPreview(markdown);
      setUploadStatus({ type: 'success', message: 'CV atualizado no preview.' });
    } catch {
      setUploadStatus({ type: 'error', message: 'CV editado, mas o PDF não pôde ser montado.' });
    }
  };

  const handleAIUpdateCV = async () => {
    const markdown = editableCV.trim();
    const instruction = editInstruction.trim();
    if (!markdown || !instruction) return;

    setUpdatingCV(true);
    setPdfError('');

    try {
      const response = await fetch(`${API_BASE_URL}/update-cv/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_cv: markdown,
          edit_instruction: instruction,
          job_description: jobDescription,
        }),
      });

      if (!response.ok) {
        let message = 'Falha ao atualizar o CV com IA.';
        try {
          const data = await response.json();
          if (data.error) message = data.error;
        } catch {
          // Keep the generic message when the response is not JSON.
        }
        throw new Error(message);
      }

      const data = await response.json();
      const updatedMarkdown = String(data.markdown || '').trim();
      if (!updatedMarkdown) throw new Error('A IA retornou um CV vazio.');

      setGeneratedCV(updatedMarkdown);
      setEditableCV(updatedMarkdown);
      setIsEditingCV(false);
      setEditInstruction('');
      await refreshPDFPreview(updatedMarkdown);
      setUploadStatus({ type: 'success', message: 'CV atualizado com IA.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar o CV.';
      setUploadStatus({ type: 'error', message });
    } finally {
      setUpdatingCV(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      setUploadStatus({ type: '', message: '' });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploadQueue({
      active: true,
      total: files.length,
      current: 0,
      success: 0,
      error: 0,
      logs: [`Iniciando processamento de ${files.length} arquivos...`]
    });

    setLoading(true);
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadQueue(prev => ({ ...prev, current: i + 1 }));
      addLog(`Enviando: ${file.name}`);

      const formData = new FormData();
      formData.append('files', file);

      try {
        await axios.post(`${API_BASE_URL}/upload/`, formData);
        successCount++;
        setUploadQueue(prev => ({ ...prev, success: successCount }));
      } catch (error) {
        console.error(`Erro no arquivo ${file.name}:`, error);
        errorCount++;
        setUploadQueue(prev => ({ ...prev, error: errorCount }));
        addLog(`Erro: ${file.name}`);
      }
    }

    setLoading(false);
    setFiles([]);
    
    setTimeout(() => {
      setUploadStatus({ 
        type: successCount > 0 ? 'success' : 'error', 
        message: `Finalizado: ${successCount} processados, ${errorCount} erros.` 
      });
      setUploadQueue(prev => ({ ...prev, active: false }));
    }, 3000);
  };

  const handleGenerate = async () => {
    if (!jobDescription || loading) return;
    setLoading(true);
    setGeneratedCV('');
    setEditableCV('');
    setIsEditingCV(false);
    setEditInstruction('');
    setPdfPreviewUrl('');
    setPdfError('');
    setPdfLoading(false);
    try {
      const response = await fetch(`${API_BASE_URL}/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_description: jobDescription }),
      });

      if (!response.ok) throw new Error('Falha na geração');
      if (!response.body) throw new Error('Corpo da resposta vazio');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let generatedMarkdown = '';
      let sseBuffer = '';

      const processEvent = (event: string) => {
        const dataLine = event.split('\n').find(line => line.startsWith('data: '));
        if (!dataLine) return;

        try {
          const data = JSON.parse(dataLine.slice(6));
          if (data.chunk) {
            generatedMarkdown += data.chunk;
            setGeneratedCV(prev => prev + data.chunk);
          } else if (data.error) {
            setUploadStatus({ type: 'error', message: `Erro na IA: ${data.error}` });
          }
        } catch (e) {
          console.error("Erro ao processar chunk:", e);
        }
      };

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        sseBuffer += decoder.decode(value, { stream: !doneReading });

        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() || '';
        for (const event of events) {
          processEvent(event);
        }
      }

      if (sseBuffer.trim()) {
        processEvent(sseBuffer);
      }

      if (generatedMarkdown.trim()) {
        setEditableCV(generatedMarkdown);
        try {
          await refreshPDFPreview(generatedMarkdown);
        } catch {
          setUploadStatus({ type: 'error', message: 'Currículo gerado, mas o PDF não pôde ser montado.' });
        }
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erro ao conectar com o serviço de IA.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl"></div>
      </div>

      <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-indigo-200 shadow-xl">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                RAG CV Creator
              </h1>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">AI-Powered Excellence</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 pl-6 border-l border-slate-200">
            {Object.entries(providerStatus).map(([name, available]) => (
              <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-100 shadow-sm">
                <div className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-[10px] font-bold uppercase tracking-tight ${available ? 'text-slate-700' : 'text-slate-400'}`}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <a 
            href="http://localhost:6333/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"
          >
            <Database size={16} />
            <span>Qdrant Dashboard</span>
            <ChevronRight size={14} />
          </a>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
          
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Upload size={80} />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FolderOpen size={20} />
              </div>
              <h2 className="text-xl font-bold">Base de Conhecimento</h2>
            </div>

            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Faça upload dos seus currículos antigos, portfólios ou documentos de carreira para treinar a IA.
            </p>

            <div className="space-y-4">
              <label className="group relative block cursor-pointer">
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.html"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all duration-300">
                  <Upload className="text-slate-400 group-hover:text-indigo-500" size={24} />
                  <span className="text-sm font-medium text-slate-600">Selecionar Arquivos</span>
                  <span className="text-xs text-slate-400 font-normal">PDF ou HTML suportados</span>
                </div>
              </label>

              <label className="group relative block cursor-pointer">
                <input 
                  type="file" 
                  // @ts-ignore
                  webkitdirectory="true"
                  // @ts-ignore
                  directory=""
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-full py-4 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 hover:border-indigo-200 hover:bg-slate-50 transition-all duration-300">
                  <FileCode className="text-slate-400" size={18} />
                  <span className="text-sm font-medium text-slate-600">Ou Selecionar Pasta Completa</span>
                </div>
              </label>

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 rounded-xl p-3 flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-slate-500">{files.length} arquivos prontos</span>
                    <button onClick={() => setFiles([])} className="text-xs text-rose-500 font-bold uppercase">Limpar</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                onClick={handleUpload}
                disabled={files.length === 0}
                loading={loading && uploadQueue.active}
                className="w-full"
              >
                Indexar Experiências
              </Button>

              <AnimatePresence>
                {uploadStatus.message && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border ${
                      uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                      uploadStatus.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                      'bg-indigo-50 border-indigo-100 text-indigo-700'
                    }`}
                  >
                    {uploadStatus.type === 'success' ? <CheckCircle2 size={18} /> : 
                     uploadStatus.type === 'error' ? <AlertCircle size={18} /> : 
                     <Loader2 className="animate-spin" size={18} />}
                    <span className="text-sm font-medium">{uploadStatus.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-bold">Oportunidade</h2>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Cole a descrição da vaga abaixo. O RAG buscará em sua base os fatos mais relevantes.
            </p>

            <textarea 
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Ex: Desenvolvedor Full Stack Sênior..."
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none bg-slate-50/50 text-sm"
            ></textarea>

            <Button 
              onClick={handleGenerate}
              disabled={!jobDescription}
              loading={loading && !uploadQueue.active}
              className="w-full mt-4"
            >
              Gerar Currículo Estratégico
            </Button>
          </Card>

          <Card className="max-h-[400px] overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                <Database size={20} />
              </div>
              <h2 className="text-xl font-bold">Base Local</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum documento indexado ainda.</p>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{doc.name}</span>
                      <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        doc.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                        doc.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status}
                      </div>
                    </div>
                    {doc.error_message && (
                      <p className="text-[10px] text-rose-500 leading-tight font-medium">{doc.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!generatedCV ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-200 mb-6">
                  <FileText size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-400 mb-2">Seu Currículo aparecerá aqui</h3>
                <p className="text-slate-400 max-w-sm leading-relaxed">
                  Configure sua base de conhecimento e forneça uma descrição de vaga para começar a mágica da IA.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <Card className="p-0 overflow-hidden border-none shadow-2xl">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2 rounded-lg">
                        {isEditingCV ? <Edit3 className="text-indigo-400" size={20} /> : <CheckCircle2 className="text-indigo-400" size={20} />}
                      </div>
                      <span className="text-white font-bold">{isEditingCV ? 'Editando currículo' : 'Currículo em PDF'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {isEditingCV ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={handleCancelEdit}
                            disabled={pdfLoading || updatingCV}
                            className="!py-2 !px-4 text-xs bg-white/10 text-white hover:bg-white/20 border-none"
                          >
                            <X size={14} />
                            Cancelar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleSaveEdit}
                            loading={pdfLoading}
                            disabled={!editableCV.trim() || updatingCV}
                            className="!py-2 !px-4 text-xs bg-white/10 text-white hover:bg-white/20 border-none"
                          >
                            <Save size={14} />
                            Salvar PDF
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={handleStartEdit}
                            disabled={pdfLoading || downloading}
                            className="!py-2 !px-4 text-xs bg-white/10 text-white hover:bg-white/20 border-none"
                          >
                            <Edit3 size={14} />
                            Editar CV
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleDownloadPDF}
                            loading={downloading}
                            disabled={pdfLoading}
                            className="!py-2 !px-4 text-xs bg-white/10 text-white hover:bg-white/20 border-none"
                          >
                            <FileText size={14} />
                            Baixar PDF
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedCV);
                              setUploadStatus({ type: 'success', message: 'Copiado para a área de transferência!' });
                            }}
                            className="!py-2 !px-4 text-xs bg-white/10 text-white hover:bg-white/20 border-none"
                          >
                            <Copy size={14} />
                            Copiar texto
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-100 p-4 sm:p-6">
                    {isEditingCV ? (
                      <div className="space-y-4">
                        <textarea
                          value={editableCV}
                          onChange={(event) => setEditableCV(event.target.value)}
                          className="block h-[540px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-5 font-mono text-sm leading-relaxed text-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          spellCheck={false}
                        />

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 lg:flex-row">
                            <textarea
                              value={editInstruction}
                              onChange={(event) => setEditInstruction(event.target.value)}
                              rows={3}
                              placeholder="Peça um ajuste para a IA. Ex: reescreva o resumo com foco em Python e remova qualquer frase genérica."
                              className="min-h-[88px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                            <Button
                              variant="primary"
                              onClick={handleAIUpdateCV}
                              loading={updatingCV}
                              disabled={!editableCV.trim() || !editInstruction.trim() || pdfLoading}
                              className="lg:w-44"
                            >
                              <Wand2 size={16} />
                              Aplicar IA
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : pdfLoading ? (
                      <div className="h-[720px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-700">Montando PDF</p>
                          <p className="text-xs text-slate-400 mt-1">Preparando o arquivo final.</p>
                        </div>
                      </div>
                    ) : pdfPreviewUrl ? (
                      <iframe
                        src={pdfPreviewUrl}
                        title="Currículo em PDF"
                        className="block h-[720px] w-full rounded-2xl border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="h-[720px] rounded-2xl border border-rose-100 bg-rose-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
                        <AlertCircle className="text-rose-500" size={32} />
                        <div>
                          <p className="text-sm font-bold text-rose-700">Não foi possível montar o PDF</p>
                          <p className="text-xs text-rose-500 mt-1">{pdfError || 'Tente gerar o preview novamente.'}</p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => refreshPDFPreview(generatedCV)}
                          loading={pdfLoading}
                          className="!py-2 !px-4 text-xs"
                        >
                          Gerar PDF novamente
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
                
                <div className="flex justify-center">
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Sempre revise os fatos gerados pela IA antes de enviar para uma vaga.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {uploadQueue.active && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 group"
          >
            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-1 shadow-2xl transition-all duration-500 group-hover:p-6 w-16 h-16 group-hover:w-96 group-hover:h-auto overflow-hidden">
              
              <div className="absolute inset-0 flex items-center justify-center group-hover:hidden">
                <div className="relative">
                  <Loader2 className="animate-spin text-indigo-400" size={32} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                    {Math.round((uploadQueue.current / uploadQueue.total) * 100)}%
                  </span>
                </div>
              </div>

              <div className="hidden group-hover:block space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                      Processando Contexto
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {uploadQueue.current} de {uploadQueue.total} arquivos finalizados
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-indigo-400 font-black text-2xl">
                      {Math.round((uploadQueue.current / uploadQueue.total) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(uploadQueue.current / uploadQueue.total) * 100}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <AnimatePresence mode="popLayout">
                    {uploadQueue.logs.map((log, idx) => (
                      <motion.div
                        key={log + idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 text-[11px] font-medium text-slate-300"
                      >
                        <ChevronRight size={10} className="text-indigo-500" />
                        <span className="truncate">{log}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase">
                    <CheckCircle2 size={12} /> {uploadQueue.success} Sucessos
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase">
                    <AlertCircle size={12} /> {uploadQueue.error} Erros
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

export default App;
