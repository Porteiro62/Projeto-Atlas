import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fork, ChildProcess } from 'child_process';
import { UpdateManager } from './updateManager';
import fs from 'fs';
import os from 'os';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let updateManager: UpdateManager | null = null;

function startServer() {
  // In dev, the server is started separately by concurrently ('npm run dev')
  if (!app.isPackaged) {
    console.log('Running in dev mode: Skipping built-in server startup as it should be running via npm run dev');
    return;
  }

  // Determine the persistent logs path
  const baseDir = process.platform === 'win32'
    ? (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    : (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : (process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')));

  const atlasDir = path.join(baseDir, 'Atlas');
  if (!fs.existsSync(atlasDir)) {
    try {
      fs.mkdirSync(atlasDir, { recursive: true });
    } catch (e) {}
  }
  const logFilePath = path.join(atlasDir, 'server-log.txt');
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  logStream.write(`\n--- Starting Server at ${new Date().toISOString()} ---\n`);
  logStream.write(`App Path: ${app.getAppPath()}\n`);

  // Start the Express server
  const serverPath = path.join(app.getAppPath(), 'dist/server.cjs');
  logStream.write(`Server Path: ${serverPath}\n`);

  try {
    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    serverProcess.stdout?.on('data', (data) => {
      logStream.write(`[STDOUT] ${data.toString()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      logStream.write(`[STDERR] ${data.toString()}`);
    });

    serverProcess.on('error', (err) => {
      logStream.write(`[ERROR] Fork error: ${err.message}\n`);
    });

    serverProcess.on('exit', (code, signal) => {
      logStream.write(`[EXIT] Process exited with code ${code} and signal ${signal}\n`);
    });
  } catch (err: any) {
    logStream.write(`[FATAL] Catch error trying to fork: ${err.message}\n`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1c1917', // bg-stone-900
      symbolColor: '#a8a29e', // text-stone-400
      height: 40
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../public/icon.png') // Assume an icon exists
  });

  // Wait for server to be ready (hardcoded delay or health check)
  const url = 'http://localhost:3000';

  // Retry loading the page if the local server is not fully started yet
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith(url)) {
      console.log(`[Electron] Failed to load server URL (${errorCode}: ${errorDescription}). Retrying in 500ms...`);
      setTimeout(() => {
        mainWindow?.loadURL(url);
      }, 500);
    }
  });
  
  if (!app.isPackaged) {
    // In dev, we might want to wait a bit or use a more robust check
    setTimeout(() => {
      mainWindow?.loadURL(url);
    }, 3000);
  } else {
    mainWindow.loadURL(url);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize the Auto-Update System
  updateManager = new UpdateManager(mainWindow);
  
  // Trigger update verification shortly after startup
  mainWindow.webContents.once('did-finish-load', () => {
    // Slight delay to allow renderer process listeners to bind
    setTimeout(() => {
      updateManager?.checkForUpdates();
    }, 4000);
  });
}

// Window Management IPC Handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
