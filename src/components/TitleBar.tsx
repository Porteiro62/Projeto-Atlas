import React from 'react';

export const TitleBar: React.FC = () => {
  // Se o electronAPI não existir (ex: rodando no navegador), não renderizamos a barra
  if (!window.electronAPI) {
    return null;
  }

  return (
    <div 
      className="h-10 bg-stone-900 flex items-center px-4 shrink-0 select-none z-50 w-full relative" 
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Title / Logo Area */}
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-300 tracking-widest uppercase">
        <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center text-white text-xs mr-1 shadow-sm">
          A
        </div>
        Atlas Fintech
      </div>
    </div>
  );
};
