export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export interface UpdateInfo {
  version: string;
  releaseNotes: string;
}

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;

  // Updates listeners
  onCheckingForUpdate: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
  onDownloadProgress: (callback: (progress: UpdateProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (err: { error: string }) => void) => () => void;

  // Updates actions
  startDownloadUpdate: () => void;
  installUpdateNow: () => void;

  // Safe Storage
  safeStorageEncrypt: (plainText: string) => Promise<string>;
  safeStorageDecrypt: (base64Text: string) => Promise<string>;
  safeStorageIsAvailable: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
