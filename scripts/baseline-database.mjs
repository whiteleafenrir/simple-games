import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { databaseUrl } from './lib/database.mjs';

const baseline = '20260918000000_baseline';
const root = fileURLToPath(new URL('../', import.meta.url));
const prisma = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url));

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prisma, ...args], {
    cwd: root, stdio: 'inherit', windowsHide: true
  });
  if (result.error || result.status !== 0) {
    throw new Error('Проверка/регистрация baseline остановлена. Не используйте reset; см. docs/backend-guide.md.');
  }
}

async function registerBaseline() {
  const url = databaseUrl();
  const schema = url.searchParams.get('schema') || 'public';
  const client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 5000, query_timeout: 10000 });
  try {
    await client.connect();
    await client.query("SELECT set_config('search_path', $1, false)", [`"${schema.replaceAll('"', '""')}"`]);
    const history = await client.query("SELECT to_regclass('_prisma_migrations') AS table_name");
    if (history.rows[0].table_name) {
      const applied = await client.query(
        'SELECT 1 FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL',
        [baseline]
      );
      if (applied.rowCount) {
        console.log('[baseline] Уже зарегистрирован. Следующий шаг: npm run db:deploy.');
        return;
      }
    }

    // Compare against the frozen T4 schema, never the evolving current schema.
    // Exit code 2 means drift; resolve must not run in that case.
    runPrisma(['migrate', 'diff', '--from-config-datasource', '--to-schema',
      `prisma/migrations/${baseline}/schema.prisma`, '--exit-code']);

    const counters = await client.query(`
      SELECT count(*)::integer AS mismatches FROM "Pet" AS pet
      WHERE pet."careHistoryCount" <> (SELECT count(*) FROM "PetCareAction" AS event WHERE event."petId" = pet.id)
    `);
    if (counters.rows[0].mismatches !== 0) {
      throw new Error('Счётчики истории не соответствуют данным. Примените патч T4 при остановленном API, затем повторите baseline.');
    }
    runPrisma(['migrate', 'resolve', '--applied', baseline]);
    console.log('[baseline] Существующая схема зарегистрирована без изменения игровых данных.');
  } finally {
    await client.end().catch(() => {});
  }
}

try {
  await registerBaseline();
} catch (error) {
  // Driver errors may contain connection details; show only their code.
  console.error(`[baseline] ${error.code ? `Ошибка PostgreSQL (${error.code}).` : error.message}`);
  process.exitCode = 1;
}
