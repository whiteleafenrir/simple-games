import { databaseLabel, waitForDatabase } from './lib/database.mjs';

try {
  const timeout = Number(process.env.DB_WAIT_TIMEOUT_MS || 30_000);
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('DB_WAIT_TIMEOUT_MS должен быть положительным числом.');
  await waitForDatabase(timeout);
  console.log(`[db] PostgreSQL готова: ${databaseLabel()}.`);
} catch (error) {
  console.error(`[db] ${error.message}`);
  process.exitCode = 1;
}
