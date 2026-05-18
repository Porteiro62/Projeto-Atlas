import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import { Lock, User, KeyRound, ArrowRight, Fingerprint, Shield, AlertCircle } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import logoImg from '../../assets/logo.png';

export function LockScreen() {
  const { authStatus, registerUser, loginUser, loginWithWindowsHello } = useFinanceStore();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canUseWindowsHello, setCanUseWindowsHello] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAvailability = async () => {
      const isAvailable =
        browserSupportsWebAuthn() &&
        (await platformAuthenticatorIsAvailable()) &&
        Boolean(window.electronAPI) &&
        (await window.electronAPI.safeStorageIsAvailable());

      if (mounted) {
        setCanUseWindowsHello(isAvailable);
      }
    };

    checkAvailability().catch(() => {
      if (mounted) {
        setCanUseWindowsHello(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [authStatus]);

  const handleManualUnlock = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const success = await loginWithWindowsHello();
      if (!success) {
        setError('Falha ao validar o Windows Hello. Use o PIN ou tente novamente.');
      }
    } catch (e) {
      setError('Falha no Windows Hello. Use o PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);

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
      setError('Preencha todos os campos.');
      return;
    }

    if (pin.length !== 4) {
      setError('O PIN deve possuir exatamente 4 digitos.');
      return;
    }

    if (!canUseWindowsHello) {
      setError('Windows Hello indisponivel neste dispositivo.');
      return;
    }

    setIsSubmitting(true);
    const success = await registerUser(name.trim(), username.trim(), pin);
    setIsSubmitting(false);

    if (!success) {
      setError('Falha ao registrar a credencial do Windows Hello.');
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="fixed inset-0 bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-atlas-emerald border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest animate-pulse">Protegendo sessao...</span>
        </div>
      </div>
    );
  }

  const isRegistering = authStatus === 'unregistered';

  return (
    <div className="fixed inset-0 bg-atlas-dark flex overflow-hidden select-none">
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full lg:w-[480px] bg-white h-full shadow-2xl z-10 flex flex-col justify-center px-12 relative"
      >
        <div className="absolute top-12 left-12 flex items-center gap-3">
          <span className="text-xl font-black tracking-tighter uppercase italic" style={{ color: '#030712' }}></span>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2">
              {isRegistering ? 'Criar Perfil' : 'ATLAS'}
            </h1>
            <p className="text-stone-400 text-xs font-semibold leading-relaxed">
              {isRegistering
                ? 'Defina suas credenciais locais. O cadastro exigira Windows Hello e mantera seus dados offline.'
                : 'Financieiro'}
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
                    <User size={12} /> Nome completo
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
                    <User size={12} /> Nome de usuario
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
                      <KeyRound size={12} /> Definir PIN de acesso
                    </label>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">4 DIGITOS</span>
                  </div>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    disabled={isSubmitting}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 text-stone-900 font-bold text-2xl tracking-[1.5em] text-center focus:ring-2 focus:ring-atlas-emerald/20 border-focus:border-atlas-emerald outline-none transition-all placeholder:text-stone-200"
                    placeholder="...."
                  />
                </div>

                {!canUseWindowsHello && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-semibold text-amber-800">
                    Windows Hello nao esta disponivel. Configure biometria ou PIN do Windows para concluir o cadastro.
                  </div>
                )}

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
                  disabled={isSubmitting || !canUseWindowsHello}
                  className="w-full text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-black/10 active:scale-[0.98] group disabled:opacity-50 hover:opacity-90"
                  style={{ background: '#030712' }}
                >
                  {isSubmitting ? 'Configurando...' : 'Vincular ao Windows Hello'}
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
                  <div className="w-16 h-16 border border-stone-200 rounded-3xl flex items-center justify-center relative mb-4" style={{ background: 'rgba(2, 9, 30, 0.05)' }}>
                    <Lock className="text-stone-700" size={24} />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-atlas-emerald rounded-full flex items-center justify-center border-2 border-white">
                      <Shield size={8} className="text-white fill-white" />
                    </span>
                  </div>
                  <span className="text-[10px] text-atlas-emerald font-black uppercase tracking-[0.2em]"> criptografado</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <KeyRound size={12} /> Insira seu PIN
                    </label>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">4 DIGITOS</span>
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
                    placeholder="...."
                  />
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-stone-200"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-stone-400 font-bold uppercase tracking-widest">ou</span>
                  <div className="flex-grow border-t border-stone-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleManualUnlock}
                  disabled={isSubmitting || !canUseWindowsHello}
                  className="w-full border border-stone-200 hover:border-atlas-emerald/40 hover:bg-atlas-emerald/5 text-stone-700 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:text-atlas-emerald disabled:opacity-50"
                >
                  <Fingerprint size={18} />
                  {canUseWindowsHello ? 'Windows Hello' : 'Windows Hello indisponivel'}
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

      <div className="flex-1 relative overflow-hidden hidden lg:flex items-center justify-center" style={{ background: '#030712' }}>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(38,208,168,0.12)_0%,transparent_40%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_45%,rgba(38,208,168,0.04)_100%)]"></div>
        </div>

        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9 }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <div className="w-[28rem] max-w-[80%]">
            <img src={logoImg} alt="Atlas" className="w-full h-auto" />
          </div>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.45em] text-stone-400">financeiro</p>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.45em] text-stone-400">by - porteiro62</p>
        </motion.div>
      </div>
    </div>
  );
}
