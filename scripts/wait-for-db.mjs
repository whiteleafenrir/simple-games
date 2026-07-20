import 'dotenv/config';

import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS ?? 30_000);
const startedAt = Date.now();

if (!databaseUrl) {
  console.error('[db] DATABASE_URL is not set.');
  process.exit(1);
}

while (Date.now() - startedAt < timeoutMs) {
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query('select 1');
    await client.end();
    console.log('[db] PostgreSQL is ready.');
    process.exit(0);
  } catch {
    try {
      await client.end();
    } catch {
      // The client may not have connected yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

console.error(`[db] PostgreSQL did not become ready within ${timeoutMs}ms.`);
process.exit(1);
