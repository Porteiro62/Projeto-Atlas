import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

import { fork, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function startServer() {
  // In dev, the server is started separately by concurrently ('npm run dev')
  if (!app.isPackaged) {
    console.log('Running in dev mode: Skipping built-in server startup as it should be running via npm run dev');
    return;
  }

  // Start the Express server
  const serverPath = path.join(process.resourcesPath, 'dist/server.cjs');

  serverProcess = fork(serverPath, [], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
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
}

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
