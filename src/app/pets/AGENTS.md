# AGENTS.md

## Scope

Эти инструкции применяются к pet-domain файлам под `src/app/pets/`; корневой AGENTS также направляет сюда при изменении экранов `pocket-pet/`, `pet-profile/` и `pet-games/`.

## Source Of Truth

- Исполняемые правила для stats, decay, mood, care actions, cooldowns, walks, sleep, player energy, lifecycle и farewell results находятся только в `apps/api/src/pets/pet-engine.ts`.
- Вопросы и доверие рассчитываются в backend `pet-question-rules.ts`, `pet-trust.ts` и `pet-question.service.ts`; `pet-snapshot.ts` формирует доступность действий.
- Frontend содержит компоненты, API-клиент, синхронизацию и функции отображения. Он не дублирует расчёты состояния питомца. Локальные правила партии в `pet-games/` и `tic-tac-toe/` допустимы; эффект заботы применяет сервер по `docs/specs/pet-activities.md`.
- Общие DTO импортируются через `@simple-games/pet-contract`; тексты интерфейса — из `src/app/i18n/translations.ts`. Карта спецификаций и файлов — в `docs/ai/README.md`.

## Rule Changes

- Не меняй balance numbers случайно. Если изменение продуктово значимое, отрази его в `GAME_DESIGN.md` или focused spec.
- Сохраняй мягкие pet state transitions: в текущем дизайне нет смерти и ожидания вылупления.
- Сохраняй финальные статусы `grown` и `left`, если продуктовое решение не меняет lifecycle design.
- Держи species traits совместимыми с MVP: инфраструктура traits может существовать, но в MVP виды не должны механически отличаться.

## Storage Changes

- Pocket Pet не хранит состояние в localStorage и не поддерживает frontend-мigrations.
- Все persisted changes описывай в Prisma schema и backend migration plan.
