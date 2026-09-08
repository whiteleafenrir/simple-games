import 'dotenv/config';
import pg from 'pg';

export function databaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Нет DATABASE_URL. Выполните npm run env:ensure и настройте .env.');
  }
  let url;
  try { url = new URL(process.env.DATABASE_URL); } catch {
    throw new Error('DATABASE_URL в .env должен быть корректным PostgreSQL URL.');
  }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error('Ожидается PostgreSQL URL (postgresql://...) в .env.');
  }
  return url;
}

export function databaseLabel() {
  const url = databaseUrl();
  return `${url.hostname}:${url.port || '5432'}${url.pathname}`;
}

// Compose commands must never silently target a different database from .env.
export function isComposeDatabase() {
  const url = databaseUrl();
  return ['127.0.0.1', 'localhost'].includes(url.hostname)
    && (url.port || '5432') === '5432'
    && url.pathname === '/simple_games'
    && url.username === 'simple_games'
    && url.password === 'simple_games'
    && ![...url.searchParams.keys()].some((key) => key !== 'schema')
    && (!url.searchParams.has('schema') || url.searchParams.get('schema') === 'public');
}

export async function probeDatabase() {
  databaseUrl();
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2500,
    query_timeout: 2500
  });
  try {
    await client.connect();
    const result = await client.query('select current_database() as database, current_setting(\'server_version\') as version');
    return { ok: true, ...result.rows[0] };
  } catch (error) {
    // Do not print raw driver errors: they may include connection credentials.
    return { ok: false, code: error.code || 'CONNECTION_FAILED' };
  } finally {
    await client.end().catch(() => {});
  }
}

export async function waitForDatabase(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let result;
  do {
    result = await probeDatabase();
    if (result.ok) return result;
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (Date.now() < deadline);
  throw new Error(`База ${databaseLabel()} недоступна (${result.code}). Проверьте службу PostgreSQL/Docker и DATABASE_URL в .env. Инструкция: docs/backend-guide.md`);
}
