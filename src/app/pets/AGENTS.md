# AGENTS.md

## Scope

Эти инструкции применяются к pet-domain файлам под `src/app/pets/`.

## Source Of Truth

- `pet-engine.ts` содержит текущие исполняемые правила для stats, decay, mood, care actions, cooldowns, walks, sleep, player energy, lifecycle и farewell results.
- `pet-engine.spec.ts` документирует ожидаемое gameplay behavior и должен меняться вместе с любым изменением правил.
- `pet-storage.migrations.ts` определяет persisted local data shape и migration behavior.
- `pet-storage.migrations.spec.ts` должен меняться при любом изменении persisted shape или migration behavior.

## Rule Changes

- Не меняй balance numbers случайно. Если изменение продуктово значимое, отрази его в `GAME_DESIGN.md` или focused spec.
- Используй явные `Date` values в тестах; не опирайся на wall-clock time для deterministic game logic.
- Сохраняй мягкие pet state transitions: в текущем дизайне нет смерти и ожидания вылупления.
- Сохраняй финальные статусы `grown` и `left`, если продуктовое решение не меняет lifecycle design.
- Держи species traits совместимыми с MVP: инфраструктура traits может существовать, но в MVP виды не должны механически отличаться.

## Storage Changes

- Поднимай `PET_STORAGE_VERSION`, когда меняется serialized shape.
- Сохраняй migration support для предыдущих версий, если legacy support не удаляется явным решением.
- Нормализуй malformed/partial data defensively.
- Когда начнется backend work, держи backend migration plans отдельно от localStorage migrations.
