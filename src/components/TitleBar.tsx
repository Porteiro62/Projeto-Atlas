import React from 'react';

export const TitleBar: React.FC = () => {
  // Se o electronAPI não existir (ex: rodando no navegador), não renderizamos a barra
  if (!window.electronAPI) {
    return null;
  }

  return (
    <div
      className="h-10 flex items-center px-4 shrink-0 select-none z-50 w-full relative"
      style={{ WebkitAppRegion: 'drag', background: '#030712' } as any}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-300 tracking-widest uppercase">
        <img src="/icon.ico" alt="Atlas" className="w-10 h-8 mr-1 rounded-sm object-contain" />
        Atlas Financeiro
      </div>
    </div>
  );
};
