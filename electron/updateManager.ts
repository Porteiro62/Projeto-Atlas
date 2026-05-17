import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

autoUpdater.logger = customLogger;

export class UpdateManager {
  private mainWindow: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.setupListeners();
  }

  private setupListeners() {
    // Configure updater behavior
    autoUpdater.autoInstallOnAppQuit = false; // Never force install on quit without asking
    autoUpdater.autoDownload = true; // Download silently in the background

    // 1. Checking for update
    autoUpdater.on('checking-for-update', () => {
      console.log('[UpdateManager] Checking for updates...');
      this.sendToRenderer('checking-for-update');
    });

    // 2. Update available
    autoUpdater.on('update-available', (info) => {
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
    autoUpdater.on('update-not-available', () => {
      console.log('[UpdateManager] Application is up-to-date.');
      this.sendToRenderer('update-not-available');
    });

    // 4. Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
      });
    });

    // 5. Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[UpdateManager] Update successfully downloaded:', info.version);
      this.sendToRenderer('update-downloaded', {
        version: info.version
      });
    });

    // 6. Error handling
    autoUpdater.on('error', (err) => {
      console.error('[UpdateManager] Error during update sequence:', err);
      this.sendToRenderer('update-error', {
        error: err.message || 'Erro inesperado ao verificar/baixar atualizações.'
      });
    });

    // --- IPC Interactions from Renderer Process ---
    ipcMain.on('start-download-update', () => {
      console.log('[UpdateManager] Manual trigger download-update requested');
      autoUpdater.downloadUpdate().catch(err => {
        console.error('[UpdateManager] Manual download trigger failed:', err);
      });
    });

    ipcMain.on('install-update-now', () => {
      console.log('[UpdateManager] Installer restart confirmed. Executing quitAndInstall...');
      // Safe guard against quitting in the middle of crucial operations in electron main side
      try {
        autoUpdater.quitAndInstall();
      } catch (err) {
        console.error('[UpdateManager] quitAndInstall invocation failed:', err);
      }
    });
  }

  public checkForUpdates() {
    console.log('[UpdateManager] Initiating updates check...');
    // checkForUpdatesAndNotify handles checking and automatically triggers download since autoDownload is true.
    // If offline, catch error silently.
    autoUpdater.checkForUpdates().catch(err => {
      console.log('[UpdateManager] Safe updates check bypassed (likely offline):', err.message || err);
    });
  }

  private sendToRenderer(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}
