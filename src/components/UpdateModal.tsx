import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, X } from 'lucide-react';
import { UpdateInfo, UpdateProgress } from '../types/electron';

interface UpdateModalProps {
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'available' | 'downloading' | 'downloaded' | 'error'>('available');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listeners for updates events from Main Process
    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable((updateInfo) => {
      setInfo(updateInfo);
      setStatus('downloading'); // As autoDownload = true, it downloads automatically
    });

    const unsubscribeProgress = window.electronAPI.onDownloadProgress((prog) => {
      setStatus('downloading');
      setProgress(prog);
    });

    const unsubscribeDownloaded = (updateDetail: { version: string }) => {
      setStatus('downloaded');
      if (info) {
        setInfo({ ...info, version: updateDetail.version });
      } else {
        setInfo({ version: updateDetail.version, releaseNotes: 'A nova versão foi baixada com sucesso.' });
      }
    };
    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded(unsubscribeDownloaded);

    const unsubscribeError = window.electronAPI.onUpdateError((err) => {
      setStatus('error');
      setErrorMsg(err.error);
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      cleanupDownloaded();
      unsubscribeError();
    };
  }, [info]);

  const handleRestart = () => {
    if (window.electronAPI) {
      window.electronAPI.installUpdateNow();
    }
  };

  // Human readable speed/sizes helpers
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  if (!info && status !== 'error') {
    // If not showing anything yet, render nothing (runs silently)
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 text-stone-100 shadow-2xl transition-all duration-300">
        
        {/* Glow overlay - organic fintech lighting */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              {status === 'downloaded' ? (
                <CheckCircle2 size={18} className="animate-bounce" />
              ) : status === 'error' ? (
                <AlertTriangle size={18} className="text-rose-400" />
              ) : (
                <RefreshCw size={18} className="animate-spin" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-wide text-stone-200">
                {status === 'downloaded' ? 'Atualização Pronta!' : status === 'error' ? 'Erro na Atualização' : 'Nova Atualização'}
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                {status === 'downloaded' ? 'Instalação pendente' : status === 'downloading' ? 'Baixando em segundo plano' : 'Verificando novidades'}
              </p>
            </div>
          </div>
          
          {/* Close button only available if not ready to restart */}
          {status !== 'downloaded' && (
            <button 
              onClick={onClose} 
              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5">
          {status === 'error' ? (
            <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-300 flex gap-3">
              <AlertTriangle className="shrink-0 text-rose-400 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-rose-200">Ocorreu um problema ao processar a atualização.</p>
                <p className="mt-1 text-xs text-rose-400/80 leading-relaxed font-mono">
                  {errorMsg || 'Verifique sua conexão com a internet ou tente novamente mais tarde.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Version banner */}
              <div className="flex items-center justify-between rounded-xl bg-stone-950/40 border border-stone-800/50 p-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Nova Versão</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">v{info?.version}</span>
                </div>
                <ArrowUpRight className="text-emerald-500/40" size={24} />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Status do Arquivo</span>
                  <span className="text-xs font-semibold text-stone-300">
                    {status === 'downloaded' ? 'Download concluído' : status === 'downloading' ? 'Baixando...' : 'Aguardando'}
                  </span>
                </div>
              </div>

              {/* Release Notes */}
              {info?.releaseNotes && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold tracking-wider text-stone-400">O que há de novo:</span>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-stone-800/60 bg-stone-950/30 p-3 text-xs leading-relaxed text-stone-400 custom-scrollbar">
                    <pre className="whitespace-pre-wrap font-sans text-stone-300 font-medium">
                      {info.releaseNotes}
                    </pre>
                  </div>
                </div>
              )}

              {/* Progress indicator */}
              {status === 'downloading' && progress && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-medium">Progresso do download</span>
                    <span className="text-emerald-400 font-bold font-mono">{Math.round(progress.percent)}%</span>
                  </div>
                  
                  {/* Glowing progress rail */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-950">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out" 
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                    <span>Velocidade: {formatBytes(progress.bytesPerSecond)}/s</span>
                    <span>{formatBytes(progress.transferred)} de {formatBytes(progress.total)}</span>
                  </div>
                </div>
              )}

              {status === 'downloaded' && (
                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-xs text-emerald-300 flex gap-3">
                  <CheckCircle2 className="shrink-0 text-emerald-400" size={16} />
                  <div>
                    <p className="font-semibold text-emerald-200">Pronto para instalar!</p>
                    <p className="mt-0.5 text-stone-400 leading-relaxed">
                      A atualização foi baixada com sucesso e será aplicada no próximo reinício do aplicativo.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-800/80 px-6 py-4 bg-stone-950/20">
          {status === 'downloaded' ? (
            <>
              <button 
                onClick={onClose} 
                className="rounded-xl border border-stone-800 hover:bg-stone-800/60 px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-300 transition-all cursor-pointer"
              >
                Instalar depois
              </button>
              <button 
                onClick={handleRestart} 
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-5 py-2 text-xs font-semibold text-stone-950 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <Download size={14} />
                Reiniciar agora
              </button>
            </>
          ) : status === 'error' ? (
            <button 
              onClick={onClose} 
              className="rounded-xl bg-stone-800 hover:bg-stone-700 px-5 py-2 text-xs font-semibold text-stone-200 transition-all cursor-pointer"
            >
              Fechar
            </button>
          ) : (
            <>
              <button 
                onClick={onClose} 
                className="rounded-xl border border-stone-800 hover:bg-stone-800/60 px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-300 transition-all cursor-pointer"
              >
                Lembrar depois
              </button>
              <button 
                disabled 
                className="flex items-center gap-1.5 rounded-xl bg-stone-800 text-stone-500 px-5 py-2 text-xs font-semibold select-none cursor-not-allowed"
              >
                <RefreshCw size={12} className="animate-spin" />
                Baixando...
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
