import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  Send, 
  Loader2, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ChevronRight,
  FolderOpen,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8000/api';

const Card = ({ children, className = "" }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ children, onClick, disabled, loading, variant = "primary", className = "" }) => {
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

function App() {
  const [files, setFiles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [generatedCV, setGeneratedCV] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setUploadStatus({ type: '', message: '' });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setUploadStatus({ type: 'info', message: 'Processando seus documentos...' });
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      await axios.post(`${API_BASE_URL}/upload/`, formData);
      setUploadStatus({ type: 'success', message: `Mágica feita! ${files.length} arquivos processados.` });
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Opa, algo deu errado no processamento.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/generate/`, {
        job_description: jobDescription
      });
      setGeneratedCV(response.data.cv);
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erro ao gerar o currículo com IA.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl"></div>
      </div>

      <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-indigo-200 shadow-xl">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              RAG CV Creator
            </h1>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">AI-Powered Excellence</p>
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
        
        {/* Left Column - Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Step 1: Context */}
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
                  webkitdirectory="true"
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
                loading={loading && uploadStatus.type === 'info'}
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

          {/* Step 2: Job Description */}
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
              rows="6"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Ex: Desenvolvedor Full Stack Sênior..."
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none bg-slate-50/50 text-sm"
            ></textarea>

            <Button 
              onClick={handleGenerate}
              disabled={!jobDescription}
              loading={loading && !uploadStatus.type}
              className="w-full mt-4"
            >
              Gerar Currículo Estratégico
            </Button>
          </Card>
        </div>

        {/* Right Column - Results */}
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
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/10 p-2 rounded-lg">
                        <CheckCircle2 className="text-indigo-400" size={20} />
                      </div>
                      <span className="text-white font-bold">Resultado Final Gerado</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCV);
                        setUploadStatus({ type: 'success', message: 'Copiado para a área de transferência!' });
                      }}
                      className="!py-2 !px-4 text-xs bg-white/10 text-white hover:bg-white/20 border-none"
                    >
                      <Copy size={14} />
                      Copiar Markdown
                    </Button>
                  </div>
                  <div className="p-8 max-h-[800px] overflow-y-auto custom-scrollbar">
                    <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-4xl prose-h2:text-2xl prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-indigo-600">
                      <div className="whitespace-pre-wrap font-sans leading-relaxed text-lg">
                        {generatedCV}
                      </div>
                    </div>
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

      <style jsx global>{`
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
