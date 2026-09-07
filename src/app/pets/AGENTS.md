# AGENTS.md

## Scope

Эти инструкции применяются к pet-domain файлам под `src/app/pets/`.

## Source Of Truth

- Исполняемые правила для stats, decay, mood, care actions, cooldowns, walks, sleep, player energy, lifecycle и farewell results находятся только в `apps/api/src/pets/pet-engine.ts`.
- Frontend pet-domain содержит только DTO-модели и функции отображения; gameplay calculations здесь не дублируются.

## Rule Changes

- Не меняй balance numbers случайно. Если изменение продуктово значимое, отрази его в `GAME_DESIGN.md` или focused spec.
- Сохраняй мягкие pet state transitions: в текущем дизайне нет смерти и ожидания вылупления.
- Сохраняй финальные статусы `grown` и `left`, если продуктовое решение не меняет lifecycle design.
- Держи species traits совместимыми с MVP: инфраструктура traits может существовать, но в MVP виды не должны механически отличаться.

## Storage Changes

- Pocket Pet не хранит состояние в localStorage и не поддерживает frontend-мigrations.
- Все persisted changes описывай в Prisma schema и backend migration plan.
