import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Lock, User, KeyRound, ArrowRight, UserPlus } from 'lucide-react';

export function LockScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { login, register, user } = useFinanceStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (pin.length !== 4) {
        setError('O PIN deve ter 4 dígitos');
        return;
      }
      register({
        name,
        username,
        photoUrl: null,
        pin
      });
    } else {
      const success = login(username || user.username, pin);
      if (!success) {
        setError('Usuário ou PIN incorretos');
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
  };

  return (
    <div className="fixed inset-0 bg-atlas-dark flex overflow-hidden">
      {/* Esquerda: Área de Login/Cadastro */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full lg:w-[450px] bg-white h-full shadow-2xl z-10 flex flex-col justify-center px-12 relative"
      >
        <div className="absolute top-12 left-12 flex items-center gap-3">
          <div className="w-10 h-10 bg-atlas-dark rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 bg-atlas-emerald rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-black text-atlas-dark tracking-tighter uppercase italic">Atlas</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <header className="mb-10">
            <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2">
              {isRegistering ? 'Criar Conta' : 'Bem-vindo'}
            </h1>
            <p className="text-stone-400 font-medium">
              {isRegistering
                ? ''
                : ''}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1.5"
                >
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Nome de Usuário
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all"
                placeholder={isRegistering ? "@usuario" : user.username}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <KeyRound size={12} /> PIN DE ACESSO
                </label>
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">4 DÍGITOS</span>
              </div>
              <input
                type="password"
                required
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold text-2xl tracking-[1.5em] text-center focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all placeholder:text-stone-200"
                placeholder="••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-rose-500 font-bold uppercase tracking-widest text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full bg-atlas-dark hover:bg-atlas-teal text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-black/10 active:scale-95 group mb-4"
            >
              {isRegistering ? 'Finalizar Cadastro' : 'Entrar'}
              <ArrowRight size={18} className="text-atlas-emerald group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] text-stone-400 hover:text-atlas-emerald font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              {isRegistering ? (
                <>Já possui uma conta? <span className="text-atlas-dark">Entrar</span></>
              ) : (
                <>Não tem conta? <span className="text-atlas-dark"></span></>
              )}
            </button>
          </div>
        </div>

        <footer className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[10px] text-stone-300 font-bold uppercase tracking-widest">
          <span>&copy; Atlas - by porteiro62</span>
        </footer>
      </motion.div>

      {/* Direita: Visual/Branding (Visível apenas em Desktop) */}
      <div className="flex-1 bg-atlas-dark relative overflow-hidden hidden lg:flex items-center justify-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#26D0A8_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,#0F3D3E_0%,transparent_50%)]"></div>
        </div>

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className="w-64 h-64 bg-white/5 backdrop-blur-3xl rounded-[60px] border border-white/10 flex items-center justify-center mb-12 mx-auto shadow-2xl overflow-hidden group"
          >
            <div className="w-32 h-32 bg-atlas-emerald rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-atlas-emerald/10 to-transparent"></div>
            <div className="w-20 h-20 bg-atlas-dark rounded-2xl flex items-center justify-center shadow-2xl relative z-10 border border-white/10">
              <div className="w-8 h-8 bg-atlas-emerald rounded-sm rotate-45 shadow-[0_0_20px_rgba(38,208,168,0.5)]"></div>
            </div>
          </motion.div>
          <h2 className="text-5xl font-black text-white tracking-tighter mb-4">FINANÇAS EM<br /><span className="text-atlas-emerald">EQUILÍBRIO.</span></h2>
          <p className="text-atlas-cream/40 font-bold uppercase tracking-[0.3em] text-xs">Sistema de Gestão Patrimonial Offline</p>
        </div>

        {/* Floating cards decoration */}
        <div className="absolute top-1/4 right-20 w-48 h-32 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md -rotate-12 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-10 w-40 h-40 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-md rotate-12"></div>
      </div>
    </div>
  );
}
