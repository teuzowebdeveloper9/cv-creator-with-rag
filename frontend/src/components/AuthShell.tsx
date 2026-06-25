import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from './ui/Button';
import RagCvLogo from './RagCvLogo';
import type { AuthState } from '../api/client';

interface AuthShellProps {
  auth: AuthState;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
}

export const AuthShell: React.FC<AuthShellProps> = ({ auth, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register') {
      await onRegister(email.trim(), password, fullName.trim());
      return;
    }
    await onLogin(email.trim(), password);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-8">
          <RagCvLogo size={52} showText />
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-black uppercase text-indigo-600 shadow-sm">
              <ShieldCheck size={16} />
              Sessão protegida
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Entre para gerar CVs e treinar entrevistas com seu histórico salvo.
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-500">
              A sessão é recuperada no refresh e todas as chamadas da aplicação usam credenciais para manter seus documentos, perfil e entrevistas vinculados ao usuário autenticado.
            </p>
          </div>
        </section>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8"
        >
          <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <LogIn size={16} />
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all ${mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              <UserPlus size={16} />
              Cadastro
            </button>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-400">Nome</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="voce@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase text-slate-400">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Minimo 8 caracteres"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          {auth.error && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span>{auth.error}</span>
            </div>
          )}

          <Button type="submit" loading={auth.loading} className="mt-6 w-full" size="lg">
            {mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
            {mode === 'register' ? 'Criar conta' : 'Entrar'}
          </Button>
        </motion.form>
      </div>
    </div>
  );
};
