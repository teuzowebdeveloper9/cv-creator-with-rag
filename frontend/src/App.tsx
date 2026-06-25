import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, CheckCircle2, ChevronRight, Copy, Database, Download,
  Edit3, FileCode, FileText, FolderOpen, History, Info, LayoutDashboard,
  Loader2, Save, Sparkles, Upload, Wand2, X
} from 'lucide-react';
import { apiClient, API_BASE_URL, jsonHeadersWithCSRF, extractErrorMessage, extractJsonErrorMessage, requestFirstAvailable, authEndpointCandidates } from './api/client';
import type { AuthState, ProfileData, ProviderStatus, UploadQueue, DocumentRecord } from './api/client';
import { Button, Card } from './components/ui';
import { AuthShell } from './components/AuthShell';
import { Header } from './components/Header';
import { ProfileModal } from './components/ProfileModal';
import { HistoryPage } from './components/HistoryPage';
import InterviewPage from './components/InterviewPage';
import DebatePage from './components/debate/DebatePage';

function App() {
  const [auth, setAuth] = useState<AuthState>({ user: null, checked: false, loading: true, error: '' });
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
  const [downloading, setDownloading] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<'cv' | 'interview' | 'debate' | 'history'>('cv');
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '', email: '', phone: '', linkedin: '', github: '',
    portfolio: '', city: '', summary: '', photo_url: ''
  });
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueue>({
    active: false, total: 0, current: 0, success: 0, error: 0, logs: []
  });

  const recoverSession = async () => {
    setAuth(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await requestFirstAvailable<{ user?: { id?: number; username?: string; email?: string; full_name?: string } } | { id?: number; username?: string; email?: string; full_name?: string } | null>(
        authEndpointCandidates.session,
        { allowNotFound: true },
      );
      const user = data && 'user' in data ? data.user || null : data;
      setAuth({ user: user || null, checked: true, loading: false, error: '' });
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      setAuth({
        user: null, checked: true, loading: false,
        error: status === 401 ? '' : extractErrorMessage(error, 'Não foi possível recuperar sua sessão.'),
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await requestFirstAvailable<{ user?: { id?: number; username?: string; email?: string; full_name?: string } } | { id?: number; username?: string; email?: string; full_name?: string }>(authEndpointCandidates.login, {
        method: 'post', data: { email, username: email, password },
      });
      const user = data && 'user' in data ? data.user : data;
      setAuth({ user: user || { email }, checked: true, loading: false, error: '' });
    } catch (error) {
      setAuth(prev => ({ ...prev, loading: false, error: extractErrorMessage(error, 'Não foi possível entrar. Verifique suas credenciais.') }));
    }
  };

  const handleRegister = async (email: string, password: string, fullName: string) => {
    setAuth(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await requestFirstAvailable<{ user?: { id?: number; username?: string; email?: string; full_name?: string } } | { id?: number; username?: string; email?: string; full_name?: string }>(authEndpointCandidates.register, {
        method: 'post', data: { email, username: email, password, full_name: fullName, name: fullName },
      });
      const user = data && 'user' in data ? data.user : data;
      setAuth({ user: user || { email, full_name: fullName }, checked: true, loading: false, error: '' });
    } catch (error) {
      setAuth(prev => ({ ...prev, loading: false, error: extractErrorMessage(error, 'Não foi possível criar sua conta.') }));
    }
  };

  const handleLogout = async () => {
    setAuth(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await requestFirstAvailable(authEndpointCandidates.logout, { method: 'post', allowNotFound: true });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuth({ user: null, checked: true, loading: false, error: '' });
      setGeneratedCV(''); setEditableCV(''); setPdfPreviewUrl('');
      setDocuments([]); setActivePage('cv');
    }
  };

  const addLog = (msg: string) => {
    setUploadQueue(prev => ({ ...prev, logs: [msg, ...prev.logs].slice(0, 5) }));
  };

  const fetchDocuments = async () => {
    try {
      const response = await apiClient.get('/documents/');
      setDocuments(response.data);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      setUploadStatus({ type: 'error', message: 'Não foi possível carregar o histórico de documentos.' });
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/profile/');
      const data = response.data;
      if (data.photo_url) {
        if (data.photo_url.startsWith('http')) {
          const match = data.photo_url.match(/\/api\/api\/profile\/photo\/file\/(.+)$/);
          if (match) data.photo_url = `/api/profile/photo/file/${match[1]}`;
        } else if (!data.photo_url.startsWith('/')) {
          data.photo_url = `/api/profile/photo/file/${data.photo_url}`;
        }
      }
      setProfile(data);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      setUploadStatus({ type: 'error', message: 'Não foi possível carregar seu perfil.' });
    }
  };

  const saveProfile = async () => {
    try {
      await apiClient.put('/profile/', profile);
      setUploadStatus({ type: 'success', message: 'Perfil salvo com sucesso!' });
    } catch (error) {
      setUploadStatus({ type: 'error', message: extractErrorMessage(error, 'Erro ao salvar perfil.') });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const response = await apiClient.post('/profile/photo/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, photo_url: response.data.photo_url }));
      setUploadStatus({ type: 'success', message: 'Foto uploaded com sucesso!' });
    } catch (error) {
      setUploadStatus({ type: 'error', message: extractErrorMessage(error, 'Erro ao upload foto.') });
    } finally {
      setPhotoUploading(false);
    }
  };

  useEffect(() => { recoverSession(); }, []);

  useEffect(() => {
    if (!auth.user) return;
    fetchProfile();
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user) return;
    const fetchProviderStatus = async () => {
      try {
        const response = await apiClient.get('/providers-status/');
        setProviderStatus(response.data);
      } catch (error) {
        console.error("Erro ao buscar status dos provedores:", error);
        setUploadStatus({ type: 'error', message: 'Não foi possível carregar o status dos provedores.' });
      }
    };
    fetchProviderStatus();
    fetchDocuments();
    const interval = setInterval(() => { fetchProviderStatus(); fetchDocuments(); }, 5000);
    return () => clearInterval(interval);
  }, [auth.user]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const createPDFBlobUrl = async (markdown: string): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/download-pdf/`, {
      method: 'POST', credentials: 'include',
      headers: jsonHeadersWithCSRF(),
      body: JSON.stringify({ markdown, photo_url: profile.photo_url || '', job_description: jobDescription }),
    });
    if (!response.ok) {
      let message = 'Falha ao montar o PDF.';
      try { const data = await response.json(); if (data.error) message = data.error; } catch { }
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
      a.href = url; a.download = 'curriculo.pdf';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
    } catch {
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
        method: 'POST', credentials: 'include',
        headers: jsonHeadersWithCSRF(),
        body: JSON.stringify({ current_cv: markdown, edit_instruction: instruction, job_description: jobDescription }),
      });
      if (!response.ok) {
        let message = 'Falha ao atualizar o CV com IA.';
        try { const data = await response.json(); if (data.error) message = data.error; } catch { }
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
      setFiles(Array.from(e.target.files));
      setUploadStatus({ type: '', message: '' });
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploadQueue({ active: true, total: files.length, current: 0, success: 0, error: 0, logs: [`Iniciando processamento de ${files.length} arquivos...`] });
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
        await apiClient.post('/upload/', formData);
        successCount++;
        setUploadQueue(prev => ({ ...prev, success: successCount }));
      } catch {
        errorCount++;
        setUploadQueue(prev => ({ ...prev, error: errorCount }));
        addLog(`Erro: ${file.name}`);
      }
    }
    setLoading(false);
    setFiles([]);
    setTimeout(() => {
      setUploadStatus({ type: successCount > 0 ? 'success' : 'error', message: `Finalizado: ${successCount} processados, ${errorCount} erros.` });
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
        method: 'POST', credentials: 'include',
        headers: jsonHeadersWithCSRF(),
        body: JSON.stringify({ job_description: jobDescription, profile_data: { ...profile, photo_url: profile.photo_url || '' } }),
      });
      if (!response.ok) {
        const message = await extractJsonErrorMessage(response, `Falha na geração (${response.status})`);
        throw new Error(message);
      }
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
        } catch { }
      };
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        sseBuffer += decoder.decode(value, { stream: !doneReading });
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() || '';
        for (const event of events) { processEvent(event); }
      }
      if (sseBuffer.trim()) { processEvent(sseBuffer); }
      if (generatedMarkdown.trim()) {
        setEditableCV(generatedMarkdown);
        try { await refreshPDFPreview(generatedMarkdown); } catch {
          setUploadStatus({ type: 'error', message: 'Currículo gerado, mas o PDF não pôde ser montado.' });
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setUploadStatus({ type: 'error', message: `Erro ao conectar com o serviço de IA: ${msg}` });
    } finally {
      setLoading(false);
    }
  };

  if (!auth.checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="mr-3 animate-spin text-indigo-600" />
        <span className="text-sm font-black uppercase tracking-widest">Recuperando sessão</span>
      </div>
    );
  }

  if (!auth.user) {
    return <AuthShell auth={auth} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-violet-200/30 rounded-full blur-[100px] animate-float-delayed"></div>
        <div className="absolute top-[30%] left-[60%] w-[20%] h-[20%] bg-blue-100/40 rounded-full blur-[80px]"></div>
      </div>

      <Header
        providerStatus={providerStatus}
        activePage={activePage}
        onPageChange={setActivePage}
        auth={auth}
        profile={profile}
        onProfileToggle={() => setShowProfile(!showProfile)}
        onLogout={handleLogout}
      />

      <ProfileModal
        show={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onProfileChange={setProfile}
        onSave={saveProfile}
        onPhotoUpload={handlePhotoUpload}
        photoUploading={photoUploading}
      />

      {activePage === 'interview' ? (
        <InterviewPage jobDescription={jobDescription} hasCV={!!generatedCV} apiClient={apiClient} />
      ) : activePage === 'debate' ? (
        <DebatePage apiClient={apiClient} />
      ) : activePage === 'history' ? (
        <HistoryPage onStatusMessage={setUploadStatus} />
      ) : (
        <main className="max-w-[1440px] mx-auto px-8 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-8">
            <Card className="relative group">
              <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Upload size={160} />
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <FolderOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Knowledge Base</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Training Data</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                Upload your career history. The AI will learn your unique style, achievements, and impact.
              </p>
              <div className="space-y-4">
                <label className="group/drop relative block cursor-pointer">
                  <input type="file" multiple accept=".pdf,.html" onChange={handleFileChange} className="hidden" />
                  <div className="w-full py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 group-hover/drop:border-indigo-400 group-hover/drop:bg-indigo-50/50 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute inset-0 bg-indigo-600/5 translate-y-full group-hover/drop:translate-y-0 transition-transform duration-500"></div>
                    <Upload className="text-slate-300 group-hover/drop:text-indigo-500 group-hover/drop:scale-110 transition-all" size={32} />
                    <div className="text-center relative z-10">
                      <span className="block text-sm font-black text-slate-700">Drop files here</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PDF or HTML preferred</span>
                    </div>
                  </div>
                </label>
                <label className="group/dir relative block cursor-pointer">
                  <input type="file"
                    webkitdirectory="true"
                    directory="" onChange={handleFileChange} className="hidden" />
                  <div className="w-full py-4 px-6 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:border-indigo-200 hover:bg-slate-50 transition-all duration-300">
                    <FileCode className="text-slate-400" size={18} />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Select Complete Folder</span>
                  </div>
                </label>
                <AnimatePresence>
                  {files.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-indigo-600 text-white rounded-[1.25rem] p-4 flex items-center justify-between shadow-lg shadow-indigo-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg"><FileText size={16} /></div>
                        <span className="text-xs font-black">{files.length} Files Ready</span>
                      </div>
                      <button onClick={() => setFiles([])} className="p-1 hover:bg-white/20 rounded-md transition-colors"><X size={16} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button onClick={handleUpload} disabled={files.length === 0} loading={loading && uploadQueue.active} className="w-full" size="lg">
                  Index Experiences
                </Button>
                <AnimatePresence>
                  {uploadStatus.message && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-3 p-5 rounded-[1.5rem] border-2 ${
                        uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        uploadStatus.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                        'bg-indigo-50 border-indigo-100 text-indigo-700'
                      }`}
                    >
                      {uploadStatus.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> :
                       uploadStatus.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> :
                       <Loader2 className="animate-spin shrink-0" size={20} />}
                      <span className="text-xs font-black leading-tight uppercase tracking-tight">{uploadStatus.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner">
                  <LayoutDashboard size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Target Role</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Optimization Goal</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-6">
                Paste the job description. RAG will extract the key competencies required.
              </p>
              <div className="relative group">
                <textarea rows={8} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Ex: Senior Full Stack Developer - Focus on Scalability..."
                  className="w-full p-6 border-2 border-slate-100 rounded-3xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none resize-none bg-slate-50/50 text-sm font-medium text-slate-700 placeholder:text-slate-300 placeholder:font-bold"
                ></textarea>
                <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-300 uppercase">Input Required</div>
              </div>
              <Button onClick={handleGenerate} disabled={!jobDescription} loading={loading && !uploadQueue.active} className="w-full mt-6" size="lg">
                <Sparkles size={18} /> Craft Strategic Resume
              </Button>
            </Card>

            <Card className="max-h-[480px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">History</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Indexed Items</p>
                  </div>
                </div>
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">{documents.length}</div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
                    <Database size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Empty Index</p>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-sm transition-all group">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-xs font-black text-slate-700 truncate">{doc.name}</span>
                        <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                          doc.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                          doc.status === 'FAILED' ? 'bg-rose-50 text-rose-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {doc.status}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-slate-400 font-bold">{new Date(doc.created_at).toLocaleDateString()}</p>
                        {doc.error_message && (
                          <div className="group/err relative">
                            <Info size={12} className="text-rose-400" />
                            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] rounded-lg opacity-0 group-hover/err:opacity-100 transition-opacity pointer-events-none z-50">
                              {doc.error_message}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!generatedCV ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full min-h-[600px] border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center p-16 text-center bg-white/30 backdrop-blur-sm"
                >
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100 flex items-center justify-center text-indigo-100 mb-10">
                    <FileText size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-300 mb-4 tracking-tight">Your Resume Awaits</h3>
                  <p className="text-slate-400 max-w-sm leading-relaxed font-medium">
                    Once generated, your strategic resume will be displayed here in high-fidelity PDF format.
                  </p>
                  <div className="mt-12 flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-full bg-slate-50 border-4 border-white"></div>)}
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Join 500+ professionals</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                  <Card className="p-0 overflow-hidden border-none shadow-[0_32px_80px_rgba(0,0,0,0.08)] bg-white">
                    <div className="bg-slate-900 px-8 py-6 flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-center">
                      <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-3 rounded-2xl">
                          {isEditingCV ? <Edit3 className="text-indigo-400" size={24} /> : <CheckCircle2 className="text-emerald-400" size={24} />}
                        </div>
                        <div>
                          <span className="text-white text-lg font-black block leading-none">
                            {isEditingCV ? 'Refining Content' : 'Strategic Output'}
                          </span>
                          <span className="text-indigo-400/60 text-[10px] font-black uppercase tracking-[0.2em]">Ready for Submission</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {isEditingCV ? (
                          <>
                            <Button variant="ghost" onClick={handleCancelEdit} disabled={pdfLoading || updatingCV} className="!bg-white/5 !text-white hover:!bg-white/10" size="sm">
                              <X size={14} /> Cancel
                            </Button>
                            <Button variant="success" onClick={handleSaveEdit} loading={pdfLoading} disabled={!editableCV.trim() || updatingCV} size="sm">
                              <Save size={14} /> Commit Changes
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="secondary" onClick={handleStartEdit} disabled={pdfLoading || downloading} className="!bg-white/5 !text-white !border-white/10 hover:!bg-white/10" size="sm">
                              <Edit3 size={14} /> Edit Source
                            </Button>
                            <Button variant="primary" onClick={handleDownloadPDF} loading={downloading} disabled={pdfLoading} size="sm">
                              <Download size={14} /> Get PDF
                            </Button>
                            <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(generatedCV); setUploadStatus({ type: 'success', message: 'Content Copied!' }); }} className="!bg-white/5 !text-white hover:!bg-white/10" size="sm">
                              <Copy size={14} /> Copy
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-100 p-8">
                      {isEditingCV ? (
                        <div className="space-y-6">
                          <div className="relative group">
                            <textarea value={editableCV} onChange={(event) => setEditableCV(event.target.value)}
                              className="block h-[600px] w-full resize-none rounded-[2rem] border-2 border-slate-200 bg-white p-8 font-mono text-xs leading-relaxed text-slate-800 outline-none transition-all focus:border-indigo-500 shadow-inner"
                              spellCheck={false}
                            />
                            <div className="absolute top-4 right-4 bg-slate-50 px-3 py-1 rounded-full text-[9px] font-black text-slate-400 uppercase">Markdown Editor</div>
                          </div>
                          <div className="rounded-[2.5rem] border-2 border-indigo-100 bg-indigo-50/30 p-8">
                            <div className="flex flex-col gap-6 lg:flex-row">
                              <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-1">AI Instruction</label>
                                <textarea value={editInstruction} onChange={(event) => setEditInstruction(event.target.value)}
                                  rows={3} placeholder="Tell the AI what to change..."
                                  className="w-full resize-none rounded-2xl border-2 border-white bg-white/80 p-5 text-sm font-medium outline-none transition-all focus:border-indigo-500 shadow-sm"
                                />
                              </div>
                              <div className="lg:w-56 flex flex-col justify-end">
                                <Button variant="primary" onClick={handleAIUpdateCV} loading={updatingCV} disabled={!editableCV.trim() || !editInstruction.trim() || pdfLoading} className="w-full shadow-indigo-200">
                                  <Wand2 size={18} /> Apply AI Magic
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : pdfLoading ? (
                        <div className="h-[800px] rounded-[2rem] border-2 border-slate-200 bg-white flex flex-col items-center justify-center gap-6">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center"><FileText className="text-indigo-600" size={24} /></div>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-800">Rendering high-fidelity PDF</p>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Polishing layout and fonts...</p>
                          </div>
                        </div>
                      ) : pdfPreviewUrl ? (
                        <iframe src={pdfPreviewUrl} title="Resume PDF" className="block h-[840px] w-full rounded-[2rem] border-2 border-slate-200 bg-white shadow-2xl" />
                      ) : (
                        <div className="h-[800px] rounded-[2rem] border-2 border-rose-100 bg-rose-50 flex flex-col items-center justify-center gap-6 px-12 text-center">
                          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-500"><AlertCircle size={40} /></div>
                          <div>
                            <p className="text-xl font-black text-rose-800">Preview Generation Failed</p>
                            <p className="text-sm font-medium text-rose-500 mt-2">{pdfError || 'The PDF engine encountered an unexpected error.'}</p>
                          </div>
                          <Button variant="secondary" onClick={() => refreshPDFPreview(generatedCV)} loading={pdfLoading} className="!border-rose-200 !text-rose-700 hover:!bg-rose-100">
                            Retry Rendering
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                  <div className="flex justify-center">
                    <div className="flex items-center gap-3 px-6 py-3 bg-white/50 rounded-full border border-white shadow-sm backdrop-blur-sm">
                      <AlertCircle size={14} className="text-indigo-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Final quality control is advised before official submission.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      )}

      <AnimatePresence>
        {uploadQueue.active && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
            <div className="glass-card-dark rounded-[2.5rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.3)] w-[480px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_12px_rgba(79,70,229,0.8)]"></div>
                    Engine Ingesting...
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                    Progress: {uploadQueue.current} / {uploadQueue.total} Objects
                  </p>
                </div>
                <div className="text-indigo-400 font-black text-4xl italic">
                  {Math.round((uploadQueue.current / uploadQueue.total) * 100)}%
                </div>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden mb-6 p-1">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(uploadQueue.current / uploadQueue.total) * 100}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] rounded-full"
                />
              </div>
              <div className="space-y-3 mb-6">
                {uploadQueue.logs.map((log, idx) => (
                  <motion.div key={log + idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 text-xs font-bold text-slate-400"
                  >
                    <ChevronRight size={14} className="text-indigo-500 shrink-0" />
                    <span className="truncate opacity-80">{log}</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  <CheckCircle2 size={16} /> {uploadQueue.success} Valid
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest">
                  <AlertCircle size={16} /> {uploadQueue.error} Errors
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}

export default App;
