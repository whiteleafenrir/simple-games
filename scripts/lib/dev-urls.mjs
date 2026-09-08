import 'dotenv/config';

export const apiPort = Number(process.env.API_PORT || 3000);
if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  throw new Error('API_PORT в .env должен быть целым числом от 1 до 65535.');
}

export const devUrls = {
  game: 'http://localhost:4200/games/pocket-pet',
  api: `http://localhost:${apiPort}/api/docs`,
  health: `http://localhost:${apiPort}/api/health`,
  studio: 'http://localhost:5555'
};
