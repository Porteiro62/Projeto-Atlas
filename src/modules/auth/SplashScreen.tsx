import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 500); // Give a small gap before finishing
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-atlas-dark flex flex-col items-center justify-center z-[1000]">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-12"
      >
        <div className="w-24 h-24 bg-atlas-emerald/10 rounded-[32px] flex items-center justify-center relative">
          <motion.div 
            animate={{ 
              rotate: [45, 225, 45],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="w-10 h-10 bg-atlas-emerald rounded-sm rotate-45 shadow-[0_0_30px_rgba(38,208,168,0.4)]"
          ></motion.div>
          
          {/* Pulsing ring */}
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-[32px] border-2 border-atlas-emerald/30"
          ></motion.div>
        </div>
      </motion.div>

      <div className="text-center space-y-6 max-w-xs w-full px-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Atlas</h1>
          <p className="text-[10px] text-atlas-cream/40 font-bold uppercase tracking-[0.3em] mt-1">Sincronizando Módulos</p>
        </div>

        <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-atlas-emerald shadow-[0_0_10px_rgba(38,208,168,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-bold text-stone-500 uppercase tracking-widest">
            <span>Iniciando Banco Offline</span>
            <span>{progress}%</span>
        </div>
      </div>

      <footer className="absolute bottom-12 text-[10px] text-stone-600 font-bold uppercase tracking-widest flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-atlas-emerald animate-pulse"></div>
        Ambiente Seguro e Criptografado
      </footer>
    </div>
  );
}
