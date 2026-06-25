import React from 'react';
import { motion } from 'framer-motion';
import { FileText, History, Loader2, LogOut, Mic, Target } from 'lucide-react';
import RagCvLogo from './RagCvLogo';
import type { AuthState, ProfileData, ProviderStatus } from '../api/client';

interface HeaderProps {
  providerStatus: ProviderStatus;
  activePage: 'cv' | 'interview' | 'debate' | 'history';
  onPageChange: (page: 'cv' | 'interview' | 'debate' | 'history') => void;
  auth: AuthState;
  profile: ProfileData;
  onProfileToggle: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  providerStatus, activePage, onPageChange,
  auth, profile, onProfileToggle, onLogout
}) => {
  const tabs = [
    { key: 'cv' as const, label: 'Currículo', icon: FileText },
    { key: 'interview' as const, label: 'Entrevista', icon: Mic },
    { key: 'debate' as const, label: 'Debate', icon: Target },
    { key: 'history' as const, label: 'Meus CVs', icon: History },
  ];

  return (
    <header className="max-w-[1440px] mx-auto px-8 py-10 flex justify-between items-center">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-8"
      >
        <div className="flex items-center gap-4">
          <RagCvLogo size={44} showText />
        </div>

        <div className="hidden lg:flex items-center gap-4 pl-8 border-l border-slate-200">
          {Object.entries(providerStatus).map(([name, available]) => (
            <div key={name} className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/50 border border-white/60 shadow-sm backdrop-blur-sm">
              <div className={`w-2 h-2 rounded-full ${available ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-300'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${available ? 'text-slate-700' : 'text-slate-400'}`}>
                {name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-2xl p-1 border border-white/60 shadow-sm"
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onPageChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activePage === tab.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:text-indigo-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        <div className="hidden text-right sm:block">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sessão</p>
          <p className="max-w-[180px] truncate text-xs font-bold text-slate-700">
            {auth.user?.full_name || auth.user?.email || auth.user?.username || 'Usuário autenticado'}
          </p>
        </div>
        <button
          onClick={onProfileToggle}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-all font-bold text-xs bg-white/50 px-5 py-3 rounded-2xl shadow-sm border border-white/60 backdrop-blur-sm group"
        >
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-[8px] font-bold text-indigo-600">
                {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
              </span>
            </div>
          )}
          <span>{profile.full_name || 'Meu Perfil'}</span>
        </button>
        <button
          onClick={onLogout}
          disabled={auth.loading}
          className="flex items-center gap-2 text-slate-600 hover:text-rose-600 transition-all font-bold text-xs bg-white/50 px-4 py-3 rounded-2xl shadow-sm border border-white/60 backdrop-blur-sm disabled:opacity-50"
        >
          {auth.loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          <span className="hidden sm:inline">Sair</span>
        </button>
      </motion.div>
    </header>
  );
};
