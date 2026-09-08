# Backend Source Of Truth для Pocket Pet

## Текущее состояние

Pocket Pet использует NestJS API в `apps/api`, PostgreSQL через Prisma и backend engine в `apps/api/src/pets/pet-engine.ts`. Frontend не рассчитывает decay, cooldown, энергию, сон, прогулки или farewell.

## Решение

Backend является единственным источником истины для состояния питомца, времени, действий заботы, player energy, cooldown, прогулок, сна и результата ухода.

Гостевая сессия восстанавливается через HttpOnly-cookie `simple_games_guest_id`. Frontend получает guest id из ответа API только в памяти текущей загрузки, чтобы строить URL запросов. Cookie не содержит состояние питомца.

Pocket Pet не использует localStorage. Старые localStorage-данные не мигрируются и не имеют значения для нового MVP flow.

## MVP-допущения

- Регистрации и профиля игрока на backend нет.
- У гостя может быть несколько завершенных питомцев, но только один активный питомец со статусом `pet`.
- Виды питомцев в MVP механически нейтральны, даже если infrastructure traits существует.
- Dragon остается disabled в frontend и не становится частью MVP.
- Реальная база подключается через `DATABASE_URL` и Prisma schema.
- Тестовое покрытие отложено и не является acceptance gate MVP.

## API

Base path: `/api`.

Локальный запуск: [инструкция](../backend-guide.md), [спецификация workflow](local-development.md). Swagger доступен вне production по `/api/docs`, OpenAPI JSON — `/api/docs-json`. `GET /api/health` проверяет соединение с базой без изменения pet state. API по умолчанию слушает `127.0.0.1`, Angular использует same-origin proxy.

| Метод | Endpoint | Назначение |
| --- | --- | --- |
| `POST` | `/guest-sessions` | Создать гостевую сессию или восстановить сессию из HttpOnly-cookie. |
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

- держать signal-cache последнего ответа API;
- отображать DTO и тексты интерфейса;
- отправлять care actions через API.

Frontend не должен:

- читать или записывать Pocket Pet state в localStorage;
- иметь копию pet engine;
- применять care action локально вместо API;
- принимать окончательное решение о decay, cooldown, завершении сессии или farewell.

## Open questions

- Нужен ли отдельный endpoint для удаления/архивации guest-сессии в dev/debug режиме?
- Нужен ли production same-origin proxy, если backend появится за пределами локальной среды?
