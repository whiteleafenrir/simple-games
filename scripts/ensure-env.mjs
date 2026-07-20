import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve('.env');
const examplePath = resolve('.env.example');

if (existsSync(envPath)) {
  console.log('[env] .env already exists.');
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error('[env] .env.example was not found.');
  process.exit(1);
}

copyFileSync(examplePath, envPath);
console.log('[env] Created .env from .env.example.');
