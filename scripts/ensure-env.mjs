import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve('.env');
const examplePath = resolve('.env.example');

if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  const hasLegacyPort = /^PORT=/m.test(env);

  if (hasLegacyPort) {
    const migratedEnv = /^API_PORT=/m.test(env)
      ? env.replace(/^PORT=.*(?:\r?\n|$)/m, '')
      : env.replace(/^PORT=/m, 'API_PORT=');
    writeFileSync(envPath, migratedEnv);
    console.log('[env] Migrated PORT to API_PORT for Angular 22 compatibility.');
    process.exit(0);
  }

  console.log('[env] .env already exists.');
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error('[env] .env.example was not found.');
  process.exit(1);
}

copyFileSync(examplePath, envPath);
console.log('[env] Created .env from .env.example.');
