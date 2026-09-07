# План backend MVP инкремента

## Тип задачи

Backend foundation + frontend integration boundary.

## Решение MVP

- Backend: NestJS + PostgreSQL + Prisma.
- Гостевая сессия восстанавливается через HttpOnly-cookie.
- Состояние питомца, время, действия, cooldown, сон, прогулки, энергия и farewell живут только в backend.
- Frontend отображает DTO и отправляет команды API; gameplay engine на frontend отсутствует.
- Pocket Pet не использует localStorage и не мигрирует старые локальные данные.
- Тестовое покрытие отложено до стабилизации UX и продуктовых правил.

## Реализованные части

1. Nest bootstrap, Prisma module/service и PostgreSQL configuration.
2. Backend pet engine и domain models.
3. Repository abstraction с in-memory и Prisma реализациями.
4. Guest sessions и pets controllers/services.
5. Prisma schema для guest sessions, pets, stats, player energy, action history и farewell.
6. Angular API client и API-backed `PetStorageService`.
7. HttpOnly-cookie для восстановления guest session.

## Что осталось для локального MVP

1. Установить Docker Desktop и проверить локальный flow через `npm run dev`.
2. Поднять PostgreSQL, применить schema и вручную пройти сценарий создания, заботы, сна, прогулки, обновления страницы и завершения сессии.
3. Создать и зафиксировать Prisma migrations перед первым сбросом/развертыванием базы.
4. Убедиться, что старые Pocket Pet ключи localStorage больше нигде не читаются.

## Будущие задачи

- Тестовое покрытие frontend/backend/API.
- Защита правила одного активного питомца от параллельных запросов.
- Production hosting для API и PostgreSQL.
- Реальные различия видов, аккаунты, мини-игры и Dragon DLC.
