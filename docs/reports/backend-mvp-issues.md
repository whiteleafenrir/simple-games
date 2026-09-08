# Backend MVP Issues Report

> Исторический отчёт. Актуальные находки и состояние локального запуска: [аудит от 2026-09-07](project-audit-2026-09-07.md). Docker больше не обязателен при существующем PostgreSQL.

## Проверено 2026-07-27

- NestJS API, Prisma schema и Angular API-backed flow присутствуют.
- Pocket Pet gameplay engine находится только в backend.
- Pocket Pet больше не использует localStorage; guest session восстанавливается через HttpOnly-cookie.
- GitHub Pages workflow отключен: разработка MVP ведется локально.

## Что осталось проверить вручную

- Установить Docker Desktop и запустить `npm run dev`.
- Создать питомца, обновить страницу и убедиться, что состояние приходит из PostgreSQL.
- Проверить care actions, cooldown, сон, прогулку, энергию, профиль и завершение сессии.
- Проверить, что старые Pocket Pet localStorage keys не читаются приложением.

## Watchlist

- Docker CLI в текущей среде не найден, поэтому live PostgreSQL flow пока не запускался.
- Prisma schema еще нужно оформить в зафиксированную migration перед первым production-like reset.
- Тесты не входят в текущий MVP scope и будут добавлены отдельным этапом.
- Защита правила одного активного питомца от параллельных запросов остается будущей задачей.
