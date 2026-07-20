import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const processes = [
  spawn(npmCommand, ['run', 'dev:api'], {
    shell: false,
    stdio: 'inherit'
  }),
  spawn(npmCommand, ['run', 'start:local'], {
    shell: false,
    stdio: 'inherit'
  })
];

let isShuttingDown = false;

function stopAll(signal = 'SIGTERM') {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const child of processes) {
  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    stopAll();
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

process.on('SIGINT', () => {
  stopAll('SIGINT');
});

process.on('SIGTERM', () => {
  stopAll('SIGTERM');
});
