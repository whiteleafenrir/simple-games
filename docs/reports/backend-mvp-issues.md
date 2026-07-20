# Backend MVP Issues Report

## Проверено 2026-07-20

- Добавлен Docker Compose для локальной PostgreSQL 17.
- Dev database: `simple_games` на `127.0.0.1:5432`.
- Dev user: `simple_games`.
- `.env` в корне репозитория настроен на Docker Compose database URL и `PORT=3000`.
- Основной dev-flow переведен на обычные npm-команды: `npm run dev`, `npm run dev:setup`, `npm run db:start`, `npm run db:push`, `npm run db:studio`, `npm run db:stop`, `npm run db:reset`.
- `npm run dev` создает `.env` из `.env.example`, если его нет, поднимает PostgreSQL через Docker Compose, ждет готовности базы, применяет Prisma schema через `prisma db push`, собирает API и запускает backend/frontend.
- `npm run db:studio` открывает Prisma Studio через локальную Prisma CLI из проекта.

## Что осталось проверить вручную

- Live Pocket Pet flow в браузере: guest session, создание питомца, профиль, care actions, cooldown, сон, прогулка, энергия игрока.
- Обновление страницы должно брать состояние питомца из backend.
- В `localStorage` для Pocket Pet должен оставаться guest id, а не полный pet state.

## Watchlist

- Docker CLI в текущей среде не найден, поэтому `npm run db:start` здесь не запускался. После установки Docker Desktop этот путь должен стать основным.
- На машине был полностью заполнен диск `C:`, из-за этого часть sandbox/helper-инструментов может падать.
- PGlite/socket-подход для этой проверки не используем: `prisma db push` проходил, но live-запись care actions давала protocol/adaptor errors. Для dev flow используется настоящая PostgreSQL.
- Production routing для `/api` все еще требует отдельной инфраструктурной настройки.
- Legacy localStorage-питомцы автоматически не мигрируются в backend; новый MVP flow хранит только guest id.
