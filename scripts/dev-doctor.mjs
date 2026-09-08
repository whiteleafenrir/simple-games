import { databaseLabel, probeDatabase } from './lib/database.mjs';
import { devUrls } from './lib/dev-urls.mjs';

console.log(`Node ${process.version} | ${process.platform}`);
try {
  const db = await probeDatabase();
  console.log(`[${db.ok ? 'OK' : 'ОШИБКА'}] База ${databaseLabel()} ${db.ok ? `(PostgreSQL ${db.version})` : `(${db.code})`}`);
  if (!db.ok) process.exitCode = 1;
} catch (error) {
  console.log(`[ОШИБКА] ${error.message}`);
  process.exitCode = 1;
}

await Promise.all([
  ['API + база', devUrls.health],
  ['Игра', devUrls.game],
  ['Таблицы', devUrls.studio]
].map(async ([name, url]) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const body = await response.text();
    const healthy = response.ok && (name !== 'API + база' || JSON.parse(body).database === 'up');
    console.log(`[${healthy ? 'OK' : 'ОШИБКА'}] ${name}: ${url} (HTTP ${response.status})`);
    if (!healthy) process.exitCode = 1;
  } catch {
    console.log(`[НЕ ЗАПУЩЕНО] ${name}: ${url}`);
    process.exitCode = 1;
  }
}));
console.log('\nЗапуск всего: npm run dev. Инструкция: docs/backend-guide.md');
