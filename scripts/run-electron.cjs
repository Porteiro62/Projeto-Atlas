const { spawn } = require('child_process');

const electronBinary = require('electron');
const env = { ...process.env };

// Some Windows environments export this globally, which makes Electron behave like plain Node.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, ['.'], {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[run-electron] Failed to launch Electron:', error);
  process.exit(1);
});
