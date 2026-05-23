import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import logoImg from '../../assets/logo.png';

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
    <div className="fixed inset-0 bg-atlas-dark flex flex-col items-center justify-center z-[1000] overflow-hidden select-none">
      {/* Background gradients for premium aesthetic */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_35%,rgba(38,208,168,0.15)_0%,transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.01)_0%,transparent_50%,rgba(38,208,168,0.03)_100%)]"></div>
      </div>

      {/* Logo Container with Entrance and Hovering animations */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.0, ease: "easeOut" }}
        className="relative mb-12 max-w-[280px] w-full px-6 flex flex-col items-center"
      >
        {/* Ambient glow behind logo */}
        <div className="absolute w-48 h-48 bg-atlas-emerald/10 blur-3xl rounded-full scale-75 animate-pulse pointer-events-none z-0"></div>
        
        <motion.img 
          src={logoImg} 
          alt="Atlas Logo" 
          className="w-full h-auto relative z-10"
          animate={{
            y: [0, -6, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      <div className="text-center space-y-6 max-w-xs w-full px-8 relative z-10">
        <div>
          <p className="text-[10px] text-atlas-cream/40 font-bold uppercase tracking-[0.3em]">Sincronizando Módulos</p>
        </div>

        <div className="space-y-3">
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
      </div>

      <footer className="absolute bottom-12 text-[10px] text-stone-600 font-bold uppercase tracking-widest flex items-center gap-2 z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-atlas-emerald animate-pulse"></div>
        Ambiente Seguro e Criptografado
      </footer>
    </div>
  );
}
