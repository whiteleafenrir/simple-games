# Backend Source Of Truth для Pocket Pet

## Текущее состояние

Pocket Pet использует NestJS API в `apps/api`, PostgreSQL через Prisma и backend engine в `apps/api/src/pets/pet-engine.ts`. Frontend не рассчитывает decay, cooldown, энергию, сон, прогулки или farewell.

## Решение

Backend является единственным источником истины для состояния питомца, времени, действий заботы, player energy, cooldown, прогулок, сна и результата ухода.

Гостевая сессия восстанавливается через HttpOnly-cookie `simple_games_guest_token`. Это случайный секрет из 32 байт; в БД хранится только SHA-256 хеш и срок действия. Frontend получает публичный guest id из ответа API только в памяти текущей загрузки, чтобы строить URL запросов. Ответ API не содержит token, его хеш или срок действия.

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

### T1: граница API (решение 2026-09-08)

Тип задачи: bug fix. Игровые правила и клиентские DTO не меняются.

- `POST /guest-sessions` принимает `{}` или отсутствие тела. Выбор guest id через body запрещён. Действующий token восстанавливает свою сессию; отсутствующий, неизвестный или истёкший создаёт новую со случайными id и token.
- Guard защищает `GET /guest-sessions/:guestId` и все методы питомцев. Без действующего token — `401`, с token другого гостя — `403`. Проверка выполняется до чтения/изменения игрового состояния. Запрос своего guest id с чужим pet id получает `404`.
- Cookie: `Path=/`, `HttpOnly`, `SameSite=Lax`, срок 365 дней; в production также `Secure` (нужен HTTPS). При восстановлении обновляются срок на сервере и Max-Age cookie. Истёкший token нельзя продлить.
- `CreatePet` и `ApplyCareAction` принимают только JSON-объекты с известными полями. Проверяются обязательные поля, типы, допустимые виды/длительности/действия; имя обрезается по краям и должно иметь длину 1–32. Отсутствующее тело, `null`, массивы, примитивы и лишние поля дают `400`. Ошибки формы проверяются до сценария service, в том числе при уже активном питомце.
- Параметры `guestId` и `petId` в URL должны быть UUID v4; неверный формат даёт `400` после проверки cookie. Авторизация предшествует обработке body: без cookie защищённый запрос получает `401`.
- Swagger описывает cookie-авторизацию, строгие тела, UUID и ответы `400/401/403`. Angular уже посылает `{}` и cookie через `withCredentials`, поэтому его контракт сохраняется.

**Обновление БД:** добавить nullable `GuestSession.tokenHash` с уникальным индексом и `tokenExpiresAt`. На существующей БД `db push` предупреждает о новом unique index: сначала выполнить `npx prisma db execute --file prisma/patches/2026-09-08-guest-session-auth.sql`, затем `npm run db:push`. Патч добавляет только столбцы/индекс в транзакции, допускает повторный запуск, не удаляет данные и не использует `--accept-data-loss`. На новой пустой БД достаточно `npm run db:push`. Старые строки сохраняются с `null`; прежняя cookie `simple_games_guest_id` не подтверждает владельца и игнорируется. После обновления старый браузер начинает новую сессию; автоматической привязки прежних питомцев по публичному id нет. Это разовое обновление локального MVP; baseline migrations остаются этапом T5.

**Проверка:** сборка API, затем обе сборки; ручной HTTP smoke на отдельных временных гостях: восстановление cookie, два изолированных контекста, подмена body/URL/cookie, ошибки body/UUID, корректное создание и действие, истечение token. Новое тестовое покрытие не добавляется.

## Prisma model

Схема хранит:

- `GuestSession`: anonymous guest id, `createdAt`, `lastSeenAt`, nullable `tokenHash` (unique) и `tokenExpiresAt` для авторизации.
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
