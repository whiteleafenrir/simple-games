# Backend MVP Issues Report

## Deferred

- Legacy localStorage-питомцы не мигрируются в backend автоматически. Старые ключи остаются в браузере, но новый MVP flow использует только guest id и API.
- Prisma migration SQL не создается в этом инкременте, потому что для корректной проверки нужен согласованный локальный или CI PostgreSQL. Schema уже готова для `prisma migrate dev`.
- Production routing для `/api` требует отдельной инфраструктурной настройки: reverse proxy, backend на том же origin или environment-specific API base URL.

## Watchlist

- Frontend пока использует client-side helpers для отображения remaining cooldown/away/player energy timers. Authoritative действие все равно подтверждает backend.
- В in-memory API tests проверяется service/controller контракт без реального HTTP server и без PostgreSQL.
- `npm install` после добавления Nest/Prisma зависимостей сообщает `21 vulnerabilities` (`2 low`, `9 moderate`, `10 high`). Автофикс не запускался, потому что он может менять версии и потребует отдельного review.

## Open questions

- Нужно ли переносить существующих localStorage-питомцев в backend при первом запуске после обновления?
- Нужно ли хранить guest id бессрочно или вводить TTL/cleanup policy для гостевых сессий?
