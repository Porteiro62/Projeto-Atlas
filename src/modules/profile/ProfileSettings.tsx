import React, { useState } from 'react';
import { X, Save, Camera, User, AtSign, LogOut } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { motion } from 'motion/react';

interface ProfileSettingsProps {
  onClose: () => void;
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user, updateUser, logout } = useFinanceStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    photoUrl: user?.photoUrl || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({ ...current, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    await updateUser({
      name: formData.name.trim(),
      username: formData.username.trim(),
      photoUrl: formData.photoUrl || null,
    });

    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-atlas-dark/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <header className="bg-stone-50 px-8 py-6 flex items-center justify-between border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Configuracoes de Perfil</h2>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Gerencie sua conta</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-400 hover:text-red-600"
              title="Sair da Conta"
            >
              <LogOut size={20} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-900"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="relative group">
              <input
                type="file"
                id="profile-photo-input"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="w-24 h-24 rounded-full bg-stone-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-atlas-emerald/10 flex items-center justify-center text-atlas-emerald text-3xl font-bold">
                    {formData.name.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('profile-photo-input')?.click()}
                className="absolute bottom-0 right-0 p-2 bg-atlas-dark text-white rounded-full shadow-lg hover:bg-atlas-emerald transition-all group-hover:scale-110 active:scale-95"
              >
                <Camera size={16} />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Toque para alterar foto</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 font-bold focus:ring-1 focus:ring-atlas-emerald outline-none transition-all placeholder:text-stone-300"
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <AtSign size={12} /> Nome de Usuario
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData((current) => ({ ...current, username: e.target.value }))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 font-bold focus:ring-1 focus:ring-atlas-emerald outline-none transition-all placeholder:text-stone-300"
                placeholder="@usuario"
              />
            </div>
          </div>

          <footer className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 px-6 bg-atlas-dark hover:bg-atlas-teal text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={16} className="text-atlas-emerald" />
              {isSaving ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </footer>
        </form>
      </motion.div>
    </div>
  );
}
