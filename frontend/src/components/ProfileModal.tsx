import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Save, X } from 'lucide-react';
import { Button } from './ui/Button';
import type { ProfileData } from '../api/client';

interface ProfileModalProps {
  show: boolean;
  onClose: () => void;
  profile: ProfileData;
  onProfileChange: (profile: ProfileData) => void;
  onSave: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  photoUploading: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  show, onClose, profile, onProfileChange, onSave, onPhotoUpload, photoUploading
}) => {
  const update = (field: keyof ProfileData, value: string) => {
    onProfileChange({ ...profile, [field]: value });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-800">Meu Perfil</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl">
              <div className="relative">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt="Photo" className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-600">
                      {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={20} />
                  </div>
                )}
              </div>
              <div>
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors">
                    {profile.photo_url ? 'Trocar foto' : 'Adicionar foto'}
                  </span>
                  <input type="file" accept="image/*" onChange={onPhotoUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">JPG, PNG ou WEBP (max 5MB)</p>
              </div>
            </div>

            <div className="space-y-5 mt-2">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                <input type="text" value={profile.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="João da Silva" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input type="email" value={profile.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone</label>
                  <input type="tel" value={profile.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="(85) 99999-9999" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cidade</label>
                <input type="text" value={profile.city}
                  onChange={(e) => update('city', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Fortaleza, CE" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">LinkedIn</label>
                  <input type="url" value={profile.linkedin}
                    onChange={(e) => update('linkedin', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="linkedin.com/in/..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GitHub</label>
                  <input type="url" value={profile.github}
                    onChange={(e) => update('github', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="github.com/..." />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio</label>
                <input type="url" value={profile.portfolio}
                  onChange={(e) => update('portfolio', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="https://..." />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resumo Profissional</label>
                <textarea value={profile.summary}
                  onChange={(e) => update('summary', e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="Desenvolvedor Full Stack com X anos de experiência..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={onClose} variant="secondary" className="flex-1">Cancelar</Button>
              <Button onClick={onSave} variant="primary" className="flex-1">
                <Save size={16} /> Salvar Perfil
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
