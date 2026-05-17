import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Lock, User, KeyRound, ArrowRight, Fingerprint, Shield, AlertCircle } from 'lucide-react';

export function LockScreen() {
  const { authStatus, registerUser, loginUser, loginWithWindowsHello } = useFinanceStore();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically trigger Windows Hello when the lock screen mounts in locked state
  useEffect(() => {
    if (authStatus === 'locked') {
      setTimeout(triggerBiometrics, 600); // Give layout animation a brief moment to settle
    }
  }, [authStatus]);

  const triggerBiometrics = async () => {
    setError('');
    try {
      const success = await loginWithWindowsHello();
      if (!success) {
        console.log("[LockScreen] Biometric verification canceled or not configured on machine.");
      }
    } catch (e) {
      console.error("[LockScreen] Error triggering Windows Hello biometrics:", e);
    }
  };

  const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    
    // Auto-submit once 4 digits are typed
    if (value.length === 4) {
      setError('');
      setIsSubmitting(true);
      const success = await loginUser(value);
      setIsSubmitting(false);
      if (!success) {
        setError('PIN de acesso incorreto');
        setPin('');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !username.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (pin.length !== 4) {
      setError('O PIN deve possuir exatamente 4 dígitos.');
      return;
    }

    setIsSubmitting(true);
    const success = await registerUser(name.trim(), username.trim(), pin);
    setIsSubmitting(false);
    
    if (!success) {
      setError('Falha ao inicializar perfil criptografado. Tente novamente.');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-atlas-emerald border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest animate-pulse">Protegendo Sessão...</span>
        </div>
      </div>
    );
  }

  const isRegistering = authStatus === 'unregistered';

  return (
    <div className="fixed inset-0 bg-atlas-dark flex overflow-hidden select-none">
      {/* Esquerda: Formulário de Onboarding ou PIN-Lock */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full lg:w-[480px] bg-white h-full shadow-2xl z-10 flex flex-col justify-center px-12 relative"
      >
        <div className="absolute top-12 left-12 flex items-center gap-3">
          <div className="w-10 h-10 bg-atlas-dark rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 bg-atlas-emerald rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-black text-atlas-dark tracking-tighter uppercase italic">Atlas</span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2">
              {isRegistering ? 'Criar Perfil' : 'Atlas Protegido'}
            </h1>
            <p className="text-stone-400 text-xs font-semibold leading-relaxed">
              {isRegistering
                ? 'Defina suas credenciais locais. Seus dados financeiros serão criptografados e salvos 100% offline.'
                : 'Insira seu PIN de segurança ou utilize a autenticação nativa do Windows Hello.'}
            </p>
          </header>

          <AnimatePresence mode="wait">
            {isRegistering ? (
              <motion.form
                key="register"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all placeholder:text-stone-300"
                    placeholder="Ex: Lucas Silva"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Nome de Usuário (Username)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all placeholder:text-stone-300"
                    placeholder="@usuario"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound size={12} /> DEFINIR PIN DE ACESSO
                    </label>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">4 DÍGITOS</span>
                  </div>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    disabled={isSubmitting}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold text-2xl tracking-[1.5em] text-center focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all placeholder:text-stone-200"
                    placeholder="••••"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-rose-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={14} />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-atlas-dark hover:bg-atlas-teal text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-black/10 active:scale-[0.98] group disabled:opacity-50"
                >
                  {isSubmitting ? 'Configurando...' : 'Finalizar e Criptografar'}
                  <ArrowRight size={18} className="text-atlas-emerald group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center py-2">
                  <div className="w-16 h-16 bg-atlas-dark/5 border border-stone-200 rounded-3xl flex items-center justify-center relative mb-4">
                    <Lock className="text-stone-700" size={24} />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-atlas-emerald rounded-full flex items-center justify-center border-2 border-white">
                      <Shield size={8} className="text-white fill-white" />
                    </span>
                  </div>
                  <span className="text-[10px] text-atlas-emerald font-black uppercase tracking-[0.2em]">Banco Criptografado</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound size={12} /> INSIRA SEU PIN
                    </label>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">4 DÍGITOS</span>
                  </div>
                  <input
                    type="password"
                    required
                    autoFocus
                    maxLength={4}
                    disabled={isSubmitting}
                    value={pin}
                    onChange={handlePinChange}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold text-2xl tracking-[1.5em] text-center focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all placeholder:text-stone-200"
                    placeholder="••••"
                  />
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-stone-200"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-stone-400 font-bold uppercase tracking-widest">ou</span>
                  <div className="flex-grow border-t border-stone-200"></div>
                </div>

                <button
                  type="button"
                  onClick={triggerBiometrics}
                  disabled={isSubmitting}
                  className="w-full border border-stone-200 hover:border-atlas-emerald/40 hover:bg-atlas-emerald/5 text-stone-700 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:text-atlas-emerald disabled:opacity-50"
                >
                  <Fingerprint size={18} />
                  Usar Windows Hello
                </button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-rose-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-center"
                  >
                    <AlertCircle size={14} />
                    {error}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[10px] text-stone-300 font-bold uppercase tracking-widest">
          <span>&copy; Atlas - by porteiro62</span>
        </footer>
      </motion.div>

      {/* Direita: Branding & Detalhes de Segurança (Desktop) */}
      <div className="flex-1 bg-atlas-dark relative overflow-hidden hidden lg:flex items-center justify-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#26D0A8_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,#0F3D3E_0%,transparent_50%)]"></div>
        </div>

        <div className="relative z-10 text-center px-12 max-w-lg">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className="w-48 h-48 bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 flex items-center justify-center mb-10 mx-auto shadow-2xl overflow-hidden group relative"
          >
            <div className="w-24 h-24 bg-atlas-emerald rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-atlas-emerald/10 to-transparent"></div>
            <div className="w-16 h-16 bg-atlas-dark rounded-2xl flex items-center justify-center shadow-2xl relative z-10 border border-white/10">
              <div className="w-6 h-6 bg-atlas-emerald rounded-sm rotate-45 shadow-[0_0_20px_rgba(38,208,168,0.5)]"></div>
            </div>
            
            {/* Visual biometric pulse animation in locked state */}
            {!isRegistering && (
              <div className="absolute inset-0 border border-atlas-emerald/20 rounded-[48px] animate-ping opacity-30 pointer-events-none scale-90"></div>
            )}
          </motion.div>
          
          <h2 className="text-3xl font-black text-white tracking-tighter mb-4 leading-tight uppercase">
            {isRegistering ? 'Segurança e Controle\n100% Offline.' : 'Seus Dados Patrimoniais\nFortificados.'}
          </h2>
          <p className="text-stone-400 font-bold uppercase tracking-[0.25em] text-[10px] mb-8 leading-relaxed">
            {isRegistering 
              ? 'Uma chave mestra AES-256 de alta entropia será gerada na sua máquina e vinculada ao Windows Hello (DPAPI).' 
              : 'O banco de dados SQLite está criptografado no disco. Autentique-se para liberar a chave mestra na memória.'}
          </p>

          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-atlas-emerald animate-pulse"></span>
            <span className="text-[10px] text-atlas-emerald font-black uppercase tracking-wider">Criptografia AES-256-GCM + Windows DPAPI</span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-20 w-48 h-32 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md -rotate-12 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-10 w-40 h-40 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-md rotate-12"></div>
      </div>
    </div>
  );
}
