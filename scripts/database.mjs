import { spawnSync } from 'node:child_process';
import { databaseLabel, isComposeDatabase, probeDatabase, waitForDatabase } from './lib/database.mjs';

function docker(args) {
  const result = spawnSync('docker', ['compose', ...args], { stdio: 'inherit', windowsHide: true });
  if (result.error?.code === 'ENOENT') {
    throw new Error('Docker не найден. Запустите Docker Desktop или укажите существующую PostgreSQL-базу в .env. См. docs/backend-guide.md.');
  }
  if (result.error || result.status !== 0) {
    throw new Error('Docker Compose не выполнил команду. Проверьте, что Docker Desktop запущен.');
  }
}

try {
  const command = process.argv[2] || 'status';
  const mode = process.env.DB_MODE || 'auto';
  if (!['auto', 'external', 'docker'].includes(mode)) {
    throw new Error('DB_MODE должен быть auto, external или docker.');
  }
  if (command === 'status') {
    const result = await probeDatabase();
    console.log(`[db] ${databaseLabel()}: ${result.ok ? `доступна, PostgreSQL ${result.version}` : `недоступна (${result.code})`}`);
    process.exitCode = result.ok ? 0 : 1;
  } else if (command === 'start') {
    if (mode === 'docker' && !isComposeDatabase()) {
      throw new Error('DB_MODE=docker не соответствует DATABASE_URL из compose.yaml. Проверьте .env.');
    }
    const result = await probeDatabase();
    if (result.ok) {
      console.log(`[db] Используется работающая база ${databaseLabel()} (PostgreSQL ${result.version}).`);
    } else {
      if (mode === 'external' || !isComposeDatabase()) {
        throw new Error(`База ${databaseLabel()} недоступна (${result.code}). Запустите свою службу PostgreSQL; для текущего Windows-компьютера: services.msc → postgresql-x64-17. Затем npm run db:status.`);
      }
      if (!['ECONNREFUSED', 'CONNECTION_FAILED', 'ETIMEDOUT'].includes(result.code)) {
        throw new Error(`Подключение отклонено (${result.code}). Проверьте DATABASE_URL; второй сервер не запускается.`);
      }
      docker(['up', '-d', 'postgres']);
      await waitForDatabase();
      console.log(`[db] PostgreSQL готова: ${databaseLabel()}.`);
    }
  } else if (['stop', 'logs', 'reset'].includes(command)) {
    if (mode === 'external' || !isComposeDatabase()) {
      throw new Error('Эта команда управляет только Docker-базой из compose.yaml. Ваша внешняя PostgreSQL-служба не изменена. См. docs/backend-guide.md.');
    }
    if (command === 'reset') {
      if (!process.argv.includes('--confirm-delete-local-data')) {
        throw new Error('Сброс удаляет ВСЕ данные Docker-базы. Для намеренного сброса: npm run db:reset -- --confirm-delete-local-data');
      }
      docker(['down', '--volumes']);
    } else {
      docker(command === 'stop' ? ['stop', 'postgres'] : ['logs', '--tail', '100', 'postgres']);
    }
  } else {
    throw new Error(`Неизвестная команда базы: ${command}`);
  }
} catch (error) {
  console.error(`[db] ${error.message}`);
  process.exitCode = 1;
}
