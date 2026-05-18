import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AppUpdater } from 'electron-updater';

// Configure a custom robust diagnostic file logger for the Auto-Updater
const getAtlasDir = () => {
  let baseDir: string;
  if (process.platform === 'win32') {
    baseDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (process.platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  }
  const atlasDir = path.join(baseDir, 'Atlas');
  if (!fs.existsSync(atlasDir)) {
    try {
      fs.mkdirSync(atlasDir, { recursive: true });
    } catch (e) {}
  }
  return atlasDir;
};

const updaterLogPath = path.join(getAtlasDir(), 'updater-log.txt');

const customLogger = {
  info(message: any) {
    try {
      const msg = typeof message === 'string' ? message : JSON.stringify(message);
      fs.appendFileSync(updaterLogPath, `[INFO] ${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {}
  },
  warn(message: any) {
    try {
      const msg = typeof message === 'string' ? message : JSON.stringify(message);
      fs.appendFileSync(updaterLogPath, `[WARN] ${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {}
  },
  error(message: any) {
    try {
      const msg = typeof message === 'string' ? message : JSON.stringify(message);
      fs.appendFileSync(updaterLogPath, `[ERROR] ${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {}
  }
};

export class UpdateManager {
  private mainWindow: BrowserWindow;
  private autoUpdater: AppUpdater | null = null;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.autoUpdater = this.createAutoUpdater();
    this.setupListeners();
  }

  private createAutoUpdater(): AppUpdater | null {
    // electron-updater is only safe/useful for packaged builds.
    if (!app.isPackaged) {
      return null;
    }

    try {
      const { autoUpdater } = require('electron-updater') as typeof import('electron-updater');
      autoUpdater.logger = customLogger;
      return autoUpdater;
    } catch (error) {
      console.error('[UpdateManager] Failed to initialize autoUpdater:', error);
      return null;
    }
  }

  private setupListeners() {
    if (!this.autoUpdater) {
      return;
    }

    // Configure updater behavior
    this.autoUpdater.autoInstallOnAppQuit = false; // Never force install on quit without asking
    this.autoUpdater.autoDownload = true; // Download silently in the background

    // 1. Checking for update
    this.autoUpdater.on('checking-for-update', () => {
      console.log('[UpdateManager] Checking for updates...');
      this.sendToRenderer('checking-for-update');
    });

    // 2. Update available
    this.autoUpdater.on('update-available', (info) => {
      console.log('[UpdateManager] New update available:', info.version);
      
      let releaseNotes = '';
      if (info.releaseNotes) {
        if (typeof info.releaseNotes === 'string') {
          releaseNotes = info.releaseNotes;
        } else if (Array.isArray(info.releaseNotes)) {
          releaseNotes = info.releaseNotes.map(note => {
            if (typeof note === 'string') return note;
            return note.note || JSON.stringify(note);
          }).join('\n');
        } else {
          releaseNotes = JSON.stringify(info.releaseNotes);
        }
      }

      this.sendToRenderer('update-available', {
        version: info.version,
        releaseNotes: releaseNotes || 'Nenhuma nota de versão fornecida.'
      });
    });

    // 3. Update not available
    this.autoUpdater.on('update-not-available', () => {
      console.log('[UpdateManager] Application is up-to-date.');
      this.sendToRenderer('update-not-available');
    });

    // 4. Download progress
    this.autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
      });
    });

    // 5. Update downloaded
    this.autoUpdater.on('update-downloaded', (info) => {
      console.log('[UpdateManager] Update successfully downloaded:', info.version);
      this.sendToRenderer('update-downloaded', {
        version: info.version
      });
    });

    // 6. Error handling
    this.autoUpdater.on('error', (err) => {
      console.error('[UpdateManager] Error during update sequence:', err);
      this.sendToRenderer('update-error', {
        error: err.message || 'Erro inesperado ao verificar/baixar atualizações.'
      });
    });

    // --- IPC Interactions from Renderer Process ---
    ipcMain.on('start-download-update', () => {
      if (!this.autoUpdater) {
        return;
      }
      console.log('[UpdateManager] Manual trigger download-update requested');
      this.autoUpdater.downloadUpdate().catch(err => {
        console.error('[UpdateManager] Manual download trigger failed:', err);
      });
    });

    ipcMain.on('install-update-now', () => {
      if (!this.autoUpdater) {
        return;
      }
      console.log('[UpdateManager] Installer restart confirmed. Executing quitAndInstall...');
      // Safe guard against quitting in the middle of crucial operations in electron main side
      try {
        this.autoUpdater.quitAndInstall();
      } catch (err) {
        console.error('[UpdateManager] quitAndInstall invocation failed:', err);
      }
    });
  }

  public checkForUpdates() {
    if (!this.autoUpdater) {
      return;
    }

    console.log('[UpdateManager] Initiating updates check...');
    // checkForUpdatesAndNotify handles checking and automatically triggers download since autoDownload is true.
    // If offline, catch error silently.
    this.autoUpdater.checkForUpdates().catch(err => {
      console.log('[UpdateManager] Safe updates check bypassed (likely offline):', err.message || err);
    });
  }

  private sendToRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}
