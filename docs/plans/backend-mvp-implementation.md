# План backend MVP инкремента

## Тип задачи

Implementation + backend foundation + frontend integration boundary.

## Шаги

1. Зафиксировать spec и MVP-допущения.
2. Добавить зависимости NestJS, Prisma, PostgreSQL client и backend scripts.
3. Создать `apps/api`:
   - Nest bootstrap;
   - Prisma module/service;
   - domain models;
   - pet engine, перенесенный из frontend;
   - repository abstraction с Prisma implementation;
   - guest sessions и pets controllers/services.
4. Описать `prisma/schema.prisma` для guest sessions, pets, stats, player energy, action history и farewell result.
5. Добавить backend tests:
   - engine parity для decay/action/farewell;
   - service/controller flow через in-memory repository.
6. Обновить Angular frontend:
   - подключить `HttpClient`;
   - добавить API client;
   - заменить `PetStorageService` на API-backed state;
   - оставить UX создания, профиля и care actions близким к текущему.
7. Обновить frontend boundary tests для guest id/localStorage и API calls.
8. Обновить README/GDD только если фактическое решение расходится с текущим описанием.
9. Запустить узкие и широкие проверки: `npm test`, `npm run build`, при возможности backend typecheck/build.

## Acceptance для этого инкремента

- Backend app компилируется как NestJS приложение.
- Prisma schema описывает нужные сущности и связи.
- API поддерживает guest session, список питомцев, создание питомца, получение питомца и care action.
- Backend применяет текущие правила pet-engine и возвращает updated pet snapshot.
- Frontend больше не хранит authoritative pet state в localStorage.
- Основной пользовательский путь остается прежним: открыть Pocket Pet, создать питомца, ухаживать, увидеть профиль и историю.

## Риски

- В репозитории пока нет поднятой Postgres-инфраструктуры, поэтому обычные тесты не должны зависеть от живой БД.
- Автоматическая миграция legacy localStorage-питомцев может потребовать отдельного UX и conflict policy.
- Angular production build может потребовать настройки reverse proxy для `/api`.
