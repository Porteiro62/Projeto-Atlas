import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Updates listeners
  onCheckingForUpdate: (callback: () => void) => {
    const sub = () => callback();
    ipcRenderer.on('checking-for-update', sub);
    return () => { ipcRenderer.removeListener('checking-for-update', sub); };
  },
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
    const sub = (_: any, info: { version: string; releaseNotes: string }) => callback(info);
    ipcRenderer.on('update-available', sub);
    return () => { ipcRenderer.removeListener('update-available', sub); };
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const sub = () => callback();
    ipcRenderer.on('update-not-available', sub);
    return () => { ipcRenderer.removeListener('update-not-available', sub); };
  },
  onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) => {
    const sub = (_: any, progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => callback(progress);
    ipcRenderer.on('download-progress', sub);
    return () => { ipcRenderer.removeListener('download-progress', sub); };
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const sub = (_: any, info: { version: string }) => callback(info);
    ipcRenderer.on('update-downloaded', sub);
    return () => { ipcRenderer.removeListener('update-downloaded', sub); };
  },
  onUpdateError: (callback: (err: { error: string }) => void) => {
    const sub = (_: any, err: { error: string }) => callback(err);
    ipcRenderer.on('update-error', sub);
    return () => { ipcRenderer.removeListener('update-error', sub); };
  },

  // Updates actions
  startDownloadUpdate: () => ipcRenderer.send('start-download-update'),
  installUpdateNow: () => ipcRenderer.send('install-update-now'),

  // Safe Storage
  safeStorageEncrypt: (plainText: string) => ipcRenderer.invoke('safe-storage-encrypt', plainText),
  safeStorageDecrypt: (base64Text: string) => ipcRenderer.invoke('safe-storage-decrypt', base64Text),
  safeStorageIsAvailable: () => ipcRenderer.invoke('safe-storage-is-available')
});
