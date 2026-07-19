# Backend Source Of Truth для Pocket Pet

## Текущее состояние

Pocket Pet уже имеет исполняемые правила на frontend в `src/app/pets/pet-engine.ts`: decay статов, настроение, cooldown, прогулки, сон через свет, энергия игрока, история заботы и farewell result. До backend-инкремента `localStorage` хранит полный список питомцев и является фактическим источником истины.

## Решение

Первый backend-инкремент добавляет отдельное NestJS API в `apps/api`, PostgreSQL через Prisma и guest mode без регистрации. Backend становится источником истины для состояния питомца, времени, действий заботы, player energy, cooldown, прогулок, сна и результата ухода.

Frontend хранит в `localStorage` только `guestId` по ключу `simple-games:pocket-pet:guest-id`. Список питомцев, создание питомца и care actions идут через API. Legacy localStorage-состояние питомцев не удаляется и не мигрируется автоматически в этом инкременте.

## MVP-допущения

- Регистрации и профиля игрока на backend нет.
- Guest id создается backend и может быть передан обратно клиентом для восстановления сессии.
- У гостя может быть несколько завершенных питомцев, но только один активный питомец со статусом `pet`.
- Виды питомцев в MVP механически нейтральны, даже если инфраструктура traits уже существует.
- Dragon остается disabled в frontend и не становится частью MVP.
- Тесты backend API используют in-memory repository, чтобы не требовать поднятый PostgreSQL в обычном `npm test`.
- Реальная база подключается через `DATABASE_URL` и Prisma schema; миграция SQL генерируется отдельной командой после настройки локальной/CI БД.
- Установленная Prisma 7 держит connection URL в `prisma.config.ts`, а Nest runtime подключает PostgreSQL через `@prisma/adapter-pg`.

## API

Base path: `/api`.

| Метод | Endpoint | Назначение |
| --- | --- | --- |
| `POST` | `/guest-sessions` | Создать гостевую сессию или подтвердить существующий `guestId`. |
| `GET` | `/guest-sessions/:guestId` | Получить гостевую сессию и обновить `lastSeenAt`. |
| `GET` | `/guest-sessions/:guestId/pets` | Получить всех питомцев гостя с актуализированным состоянием. |
| `POST` | `/guest-sessions/:guestId/pets` | Создать питомца, если нет активного. |
| `GET` | `/guest-sessions/:guestId/pets/:petId` | Получить одного питомца с актуализированным состоянием. |
| `POST` | `/guest-sessions/:guestId/pets/:petId/actions` | Применить care action и вернуть authoritative result. |

## Prisma model

Схема хранит:

- `GuestSession`: anonymous guest id, `createdAt`, `lastSeenAt`.
- `Pet`: identity, species, mode, status, lifecycle, timestamps, light/away state.
- `PetStats`: текущие статы питомца.
- `PlayerEnergy`: текущий ресурс игрока для конкретного питомца.
- `PetActionCooldown`: last action timestamp по каждому action id.
- `PetCareAction`: история примененных действий с before/after snapshot.
- `PetFarewellResult`: причина ухода, дата, phrase id, final score и final stats.

## Frontend boundary

Frontend может:

- хранить `guestId`;
- держать signal-cache последнего ответа API для UX;
- показывать client-side countdown по `lastActionAt`, `awayUntil` и `playerEnergy`.

Frontend не должен:

- записывать authoritative pet state в `localStorage`;
- применять care action локально вместо API;
- принимать окончательное решение о decay, cooldown, завершении сессии или farewell.

## Open questions

- Нужна ли автоматическая миграция старых localStorage-питомцев в backend после первого инкремента?
- Нужен ли отдельный endpoint для удаления/архивации guest-сессии в dev/debug режиме?
- Должен ли production frontend ходить на same-origin `/api` или на отдельный API origin через environment-конфигурацию?
