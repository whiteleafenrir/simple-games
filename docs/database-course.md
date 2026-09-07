# Небольшой курс по PostgreSQL и Prisma для Simple Games

Этот документ рассчитан на frontend-разработчика. Не нужно изучать SQL целиком: для локального MVP достаточно понимать модель данных, жизненный цикл базы и границу между Angular, API и PostgreSQL.

## 1. Как устроен поток данных

```text
Angular
  -> HTTP /api
NestJS controller/service
  -> backend pet-engine
Prisma repository
  -> PostgreSQL
```

Frontend не меняет статы сам. Он отправляет команду, например `play`. Backend читает питомца, рассчитывает результат, сохраняет изменения и возвращает новый snapshot.

Guest id восстанавливается через HttpOnly-cookie. Состояние питомца в браузере не хранится.

## 2. Что такое база в этом проекте

База состоит из связанных таблиц:

- `GuestSession` — анонимная гостевая сессия.
- `Pet` — имя, вид, статус, даты, свет и прогулка.
- `PetStats` — сытость, чистота, радость, здоровье и энергия питомца.
- `PlayerEnergy` — энергия игрока для активных действий.
- `PetActionCooldown` — время последнего выполнения каждого действия.
- `PetCareAction` — история действий с состоянием до и после.
- `PetFarewellResult` — зафиксированный итог завершенной сессии.

Связи и поля описаны в [`prisma/schema.prisma`](../prisma/schema.prisma).

Главное правило: `Pet` принадлежит `GuestSession`, а дочерние записи связаны с `Pet` и удаляются вместе с ним.

## 3. Первый локальный запуск

Нужен Docker Desktop с работающим Docker Engine.

```powershell
npm install
npm run env:ensure
npm run db:start
npm run db:wait
npm run db:push
npm run dev
```

После этого:

- Angular доступен на `http://localhost:4200`;
- API доступен на `http://localhost:3000/api`;
- PostgreSQL доступен на `127.0.0.1:5432`;
- Angular proxy отправляет `/api` в NestJS.

Если база не нужна, её можно остановить:

```powershell
npm run db:stop
```

`npm run db:reset` удаляет Docker volume базы и все локальные данные. Для этого проекта старые данные сейчас не имеют значения, поэтому команду можно использовать при чистом старте. Не запускай её, если в базе уже есть нужные данные.

## 4. Что лежит в `.env`

`DATABASE_URL` говорит Prisma, куда подключаться:

```text
postgresql://user:password@host:port/database?schema=public
```

В проекте локальный URL находится в `.env.example`, а `.env` игнорируется Git. Пароли и production URL нельзя коммитить.

## 5. Как смотреть данные

Prisma Studio — самый удобный способ для frontend-разработчика:

```powershell
npm run db:studio
```

В Studio можно открыть `GuestSession`, `Pet`, `PetStats`, историю действий и farewell. Для начала проверки полезно:

1. открыть `GuestSession` и найти созданную сессию;
2. открыть связанную запись `Pet`;
3. после действия сравнить `PetStats`, `PlayerEnergy` и `PetCareAction`;
4. выключить свет или выйти из браузера, затем снова запросить питомца и посмотреть, как backend применил elapsed time.

## 6. `db push` и migrations

### Сейчас, на локальном MVP

`npm run db:push` синхронизирует текущую Prisma schema с локальной базой. Это удобно, когда схема еще активно меняется и данные можно сбросить.

Типичный цикл:

1. изменить `prisma/schema.prisma`;
2. выполнить `npm run db:push`;
3. при необходимости открыть `npm run db:studio`;
4. перезапустить API, если менялись типы или код repository.

### Позже, перед стабильной версией

Migration — это зафиксированная инструкция перехода базы из одной версии в другую. Когда структура MVP стабилизируется:

```powershell
npx prisma migrate dev --name initial
```

Migration нужно добавить в Git. На сервере применяется уже существующая история:

```powershell
npx prisma migrate deploy
```

Не используй `db push` как способ обновлять production-базу.

## 7. Как менять данные правильно

- Новое поле или таблица: сначала изменить Prisma schema, затем синхронизировать базу.
- Новое игровое правило: менять backend engine и service, а не Angular component.
- Новое API-поле: обновить backend DTO и frontend model.
- Историю действий не редактировать вручную без необходимости: она нужна для профиля и будущего анализа.
- Для очистки локальной разработки использовать `db:reset`, а не удалять отдельные строки вручную.

## 8. Что нужно сделать для MVP

1. Установить Docker Desktop и пройти локальный flow создания питомца.
2. Проверить через Prisma Studio, что создание и care actions действительно сохраняются.
3. Оформить стабильную схему в Prisma migration.
4. Позже добавить защиту от двух параллельных созданий активного питомца.

Покрытие тестами намеренно не входит в этот этап и будет отдельной задачей после стабилизации UX.
