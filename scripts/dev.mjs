import concurrently from 'concurrently';
import { createServer } from 'node:net';
import { apiPort, devUrls } from './lib/dev-urls.mjs';

async function checkPort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(new Error(`Порт ${port} занят. Остановите предыдущий dev-процесс (Ctrl+C) и повторите запуск.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

try {
  if (new Set([apiPort, 4200, 5555]).size !== 3) {
    throw new Error('API_PORT не должен совпадать с портами Angular (4200) и Studio (5555).');
  }
  await Promise.all([apiPort, 4200, 5555].map(checkPort));
  console.log('\nПосле запуска откройте:');
  console.log(`  Игра:    ${devUrls.game}`);
  console.log(`  API:     ${devUrls.api}`);
  console.log(`  Таблицы: ${devUrls.studio}`);
  console.log('Открыть всё: npm run dev:open (во втором терминале). Остановить: Ctrl+C.\n');
  const { result } = concurrently([
    { command: 'npm run dev:api', name: 'api', prefixColor: 'cyan' },
    { command: 'npm run start:local', name: 'web', prefixColor: 'green' },
    { command: 'npm run dev:studio', name: 'db-ui', prefixColor: 'magenta' }
  ], { killOthersOn: ['failure', 'success'], successCondition: 'all' });
  await result;
} catch (error) {
  if (error instanceof Error) console.error(`[dev] ${error.message}`);
  process.exitCode = 1;
}
