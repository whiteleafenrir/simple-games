# План backend MVP инкремента

> **Статус: исторический, реализован.** Этот документ описывает первоначальный backend-инкремент и не является текущим backlog. Актуальная очередность: [GDD §14.4](../../GAME_DESIGN.md#144-техническая-готовность-и-очередность). Технические причины и состояние: [аудит от 2026-09-07](../reports/project-audit-2026-09-07.md). Инструкция запуска: [backend-guide.md](../backend-guide.md).

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

Эти пункты заменены техническим треком `T0–T6` в GDD. Локальный запуск, подключение к PostgreSQL, применение schema, Swagger/Studio и smoke-сценарий проверены 2026-09-07. Baseline migrations входят в `T5` перед первым shared/deploy окружением.

## Будущие задачи

- Тестовое покрытие frontend/backend/API.
- Защита правила одного активного питомца от параллельных запросов.
- Production hosting для API и PostgreSQL.
- Реальные различия видов, аккаунты, мини-игры и Dragon DLC.
