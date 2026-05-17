// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => import_electron.ipcRenderer.send("window-minimize"),
  maximize: () => import_electron.ipcRenderer.send("window-maximize"),
  close: () => import_electron.ipcRenderer.send("window-close"),
  // Updates listeners
  onCheckingForUpdate: (callback) => {
    const sub = () => callback();
    import_electron.ipcRenderer.on("checking-for-update", sub);
    return () => {
      import_electron.ipcRenderer.removeListener("checking-for-update", sub);
    };
  },
  onUpdateAvailable: (callback) => {
    const sub = (_, info) => callback(info);
    import_electron.ipcRenderer.on("update-available", sub);
    return () => {
      import_electron.ipcRenderer.removeListener("update-available", sub);
    };
  },
  onUpdateNotAvailable: (callback) => {
    const sub = () => callback();
    import_electron.ipcRenderer.on("update-not-available", sub);
    return () => {
      import_electron.ipcRenderer.removeListener("update-not-available", sub);
    };
  },
  onDownloadProgress: (callback) => {
    const sub = (_, progress) => callback(progress);
    import_electron.ipcRenderer.on("download-progress", sub);
    return () => {
      import_electron.ipcRenderer.removeListener("download-progress", sub);
    };
  },
  onUpdateDownloaded: (callback) => {
    const sub = (_, info) => callback(info);
    import_electron.ipcRenderer.on("update-downloaded", sub);
    return () => {
      import_electron.ipcRenderer.removeListener("update-downloaded", sub);
    };
  },
  onUpdateError: (callback) => {
    const sub = (_, err) => callback(err);
    import_electron.ipcRenderer.on("update-error", sub);
    return () => {
      import_electron.ipcRenderer.removeListener("update-error", sub);
    };
  },
  // Updates actions
  startDownloadUpdate: () => import_electron.ipcRenderer.send("start-download-update"),
  installUpdateNow: () => import_electron.ipcRenderer.send("install-update-now"),
  // Safe Storage
  safeStorageEncrypt: (plainText) => import_electron.ipcRenderer.invoke("safe-storage-encrypt", plainText),
  safeStorageDecrypt: (base64Text) => import_electron.ipcRenderer.invoke("safe-storage-decrypt", base64Text),
  safeStorageIsAvailable: () => import_electron.ipcRenderer.invoke("safe-storage-is-available")
});
