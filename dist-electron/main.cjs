var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron2 = require("electron");
var import_path2 = __toESM(require("path"), 1);
var import_child_process = require("child_process");

// electron/updateManager.ts
var import_electron = require("electron");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var getAtlasDir = () => {
  let baseDir;
  if (process.platform === "win32") {
    baseDir = process.env.APPDATA || import_path.default.join(import_os.default.homedir(), "AppData", "Roaming");
  } else if (process.platform === "darwin") {
    baseDir = import_path.default.join(import_os.default.homedir(), "Library", "Application Support");
  } else {
    baseDir = process.env.XDG_CONFIG_HOME || import_path.default.join(import_os.default.homedir(), ".config");
  }
  const atlasDir = import_path.default.join(baseDir, "Atlas");
  if (!import_fs.default.existsSync(atlasDir)) {
    try {
      import_fs.default.mkdirSync(atlasDir, { recursive: true });
    } catch (e) {
    }
  }
  return atlasDir;
};
var updaterLogPath = import_path.default.join(getAtlasDir(), "updater-log.txt");
var customLogger = {
  info(message) {
    try {
      const msg = typeof message === "string" ? message : JSON.stringify(message);
      import_fs.default.appendFileSync(updaterLogPath, `[INFO] ${(/* @__PURE__ */ new Date()).toISOString()} - ${msg}
`);
    } catch (e) {
    }
  },
  warn(message) {
    try {
      const msg = typeof message === "string" ? message : JSON.stringify(message);
      import_fs.default.appendFileSync(updaterLogPath, `[WARN] ${(/* @__PURE__ */ new Date()).toISOString()} - ${msg}
`);
    } catch (e) {
    }
  },
  error(message) {
    try {
      const msg = typeof message === "string" ? message : JSON.stringify(message);
      import_fs.default.appendFileSync(updaterLogPath, `[ERROR] ${(/* @__PURE__ */ new Date()).toISOString()} - ${msg}
`);
    } catch (e) {
    }
  }
};
var UpdateManager = class {
  constructor(window) {
    this.autoUpdater = null;
    this.mainWindow = window;
    this.autoUpdater = this.createAutoUpdater();
    this.setupListeners();
  }
  createAutoUpdater() {
    if (!import_electron.app.isPackaged) {
      return null;
    }
    try {
      const { autoUpdater } = require("electron-updater");
      autoUpdater.logger = customLogger;
      return autoUpdater;
    } catch (error) {
      console.error("[UpdateManager] Failed to initialize autoUpdater:", error);
      return null;
    }
  }
  setupListeners() {
    if (!this.autoUpdater) {
      return;
    }
    this.autoUpdater.autoInstallOnAppQuit = false;
    this.autoUpdater.autoDownload = true;
    this.autoUpdater.on("checking-for-update", () => {
      console.log("[UpdateManager] Checking for updates...");
      this.sendToRenderer("checking-for-update");
    });
    this.autoUpdater.on("update-available", (info) => {
      console.log("[UpdateManager] New update available:", info.version);
      let releaseNotes = "";
      if (info.releaseNotes) {
        if (typeof info.releaseNotes === "string") {
          releaseNotes = info.releaseNotes;
        } else if (Array.isArray(info.releaseNotes)) {
          releaseNotes = info.releaseNotes.map((note) => {
            if (typeof note === "string") return note;
            return note.note || JSON.stringify(note);
          }).join("\n");
        } else {
          releaseNotes = JSON.stringify(info.releaseNotes);
        }
      }
      this.sendToRenderer("update-available", {
        version: info.version,
        releaseNotes: releaseNotes || "Nenhuma nota de vers\xE3o fornecida."
      });
    });
    this.autoUpdater.on("update-not-available", () => {
      console.log("[UpdateManager] Application is up-to-date.");
      this.sendToRenderer("update-not-available");
    });
    this.autoUpdater.on("download-progress", (progressObj) => {
      this.sendToRenderer("download-progress", {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
      });
    });
    this.autoUpdater.on("update-downloaded", (info) => {
      console.log("[UpdateManager] Update successfully downloaded:", info.version);
      this.sendToRenderer("update-downloaded", {
        version: info.version
      });
    });
    this.autoUpdater.on("error", (err) => {
      console.error("[UpdateManager] Error during update sequence:", err);
      this.sendToRenderer("update-error", {
        error: err.message || "Erro inesperado ao verificar/baixar atualiza\xE7\xF5es."
      });
    });
    import_electron.ipcMain.on("start-download-update", () => {
      if (!this.autoUpdater) {
        return;
      }
      console.log("[UpdateManager] Manual trigger download-update requested");
      this.autoUpdater.downloadUpdate().catch((err) => {
        console.error("[UpdateManager] Manual download trigger failed:", err);
      });
    });
    import_electron.ipcMain.on("install-update-now", () => {
      if (!this.autoUpdater) {
        return;
      }
      console.log("[UpdateManager] Installer restart confirmed. Executing quitAndInstall...");
      try {
        this.autoUpdater.quitAndInstall();
      } catch (err) {
        console.error("[UpdateManager] quitAndInstall invocation failed:", err);
      }
    });
  }
  checkForUpdates() {
    if (!this.autoUpdater) {
      return;
    }
    console.log("[UpdateManager] Initiating updates check...");
    this.autoUpdater.checkForUpdates().catch((err) => {
      console.log("[UpdateManager] Safe updates check bypassed (likely offline):", err.message || err);
    });
  }
  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
};

// electron/main.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_os2 = __toESM(require("os"), 1);
var mainWindow = null;
var serverProcess = null;
var updateManager = null;
function startServer() {
  const baseDir = process.platform === "win32" ? process.env.APPDATA || import_path2.default.join(import_os2.default.homedir(), "AppData", "Roaming") : process.platform === "darwin" ? import_path2.default.join(import_os2.default.homedir(), "Library", "Application Support") : process.env.XDG_CONFIG_HOME || import_path2.default.join(import_os2.default.homedir(), ".config");
  const atlasDir = import_path2.default.join(baseDir, "Atlas");
  if (!import_fs2.default.existsSync(atlasDir)) {
    try {
      import_fs2.default.mkdirSync(atlasDir, { recursive: true });
    } catch (e) {
    }
  }
  const logFilePath = import_path2.default.join(atlasDir, "server-log.txt");
  const logStream = import_fs2.default.createWriteStream(logFilePath, { flags: "a" });
  logStream.write(`
--- Starting Server at ${(/* @__PURE__ */ new Date()).toISOString()} ---
`);
  logStream.write(`App Path: ${import_electron2.app.getAppPath()}
`);
  const serverPath = import_path2.default.join(import_electron2.app.getAppPath(), "dist/server.cjs");
  logStream.write(`Server Path: ${serverPath}
`);
  try {
    serverProcess = (0, import_child_process.fork)(serverPath, [], {
      env: { ...process.env, NODE_ENV: import_electron2.app.isPackaged ? "production" : "development" },
      stdio: ["ignore", "pipe", "pipe", "ipc"]
    });
    serverProcess.stdout?.on("data", (data) => {
      console.log(`[Server STDOUT] ${data.toString().trim()}`);
      logStream.write(`[STDOUT] ${data.toString()}`);
    });
    serverProcess.stderr?.on("data", (data) => {
      console.error(`[Server STDERR] ${data.toString().trim()}`);
      logStream.write(`[STDERR] ${data.toString()}`);
    });
    serverProcess.on("error", (err) => {
      console.error(`[Server ERROR] Fork error: ${err.message}`);
      logStream.write(`[ERROR] Fork error: ${err.message}
`);
    });
    serverProcess.on("exit", (code, signal) => {
      console.log(`[Server EXIT] Process exited with code ${code} and signal ${signal}`);
      logStream.write(`[EXIT] Process exited with code ${code} and signal ${signal}
`);
    });
  } catch (err) {
    console.error(`[Server FATAL] Catch error trying to fork: ${err.message}`);
    logStream.write(`[FATAL] Catch error trying to fork: ${err.message}
`);
  }
}
function createWindow() {
  mainWindow = new import_electron2.BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#030712",
      symbolColor: "#a8a29e",
      // text-stone-400
      height: 40
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: import_path2.default.join(__dirname, "preload.cjs")
    },
    icon: import_path2.default.join(__dirname, "../public/icon.ico")
  });
  const url = "http://localhost:3000";
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith(url)) {
      console.log(`[Electron] Failed to load server URL (${errorCode}: ${errorDescription}). Retrying in 500ms...`);
      setTimeout(() => {
        mainWindow?.loadURL(url);
      }, 500);
    }
  });
  if (!import_electron2.app.isPackaged) {
    setTimeout(() => {
      mainWindow?.loadURL(url);
    }, 3e3);
  } else {
    mainWindow.loadURL(url);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  updateManager = new UpdateManager(mainWindow);
  mainWindow.webContents.once("did-finish-load", () => {
    setTimeout(() => {
      updateManager?.checkForUpdates();
    }, 4e3);
  });
}
import_electron2.ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});
import_electron2.ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
import_electron2.ipcMain.on("window-close", () => {
  mainWindow?.close();
});
import_electron2.ipcMain.handle("safe-storage-encrypt", (event, plainText) => {
  if (!import_electron2.safeStorage.isEncryptionAvailable()) {
    throw new Error("Encryption is not available on this platform.");
  }
  const buffer = import_electron2.safeStorage.encryptString(plainText);
  return buffer.toString("base64");
});
import_electron2.ipcMain.handle("safe-storage-decrypt", (event, base64Text) => {
  if (!import_electron2.safeStorage.isEncryptionAvailable()) {
    throw new Error("Encryption is not available on this platform.");
  }
  const buffer = Buffer.from(base64Text, "base64");
  return import_electron2.safeStorage.decryptString(buffer);
});
import_electron2.ipcMain.handle("safe-storage-is-available", () => {
  return import_electron2.safeStorage.isEncryptionAvailable();
});
import_electron2.ipcMain.handle("app-version", () => {
  return import_electron2.app.getVersion();
});
import_electron2.app.whenReady().then(() => {
  startServer();
  createWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
import_electron2.app.on("before-quit", (event) => {
  if (serverProcess && serverProcess.connected) {
    event.preventDefault();
    console.log("[Electron] Sending graceful shutdown to server via IPC...");
    serverProcess.send("shutdown");
    const forceKillTimeout = setTimeout(() => {
      console.log("[Electron] Server did not exit in time. Force killing...");
      try {
        serverProcess?.kill();
      } catch (e) {
      }
      serverProcess = null;
      import_electron2.app.quit();
    }, 5e3);
    serverProcess.on("exit", () => {
      clearTimeout(forceKillTimeout);
      console.log("[Electron] Server process exited gracefully.");
      serverProcess = null;
      import_electron2.app.quit();
    });
  }
});
