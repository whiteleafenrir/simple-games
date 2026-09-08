# AGENTS.md

## Контекст Проекта

Simple Games - браузерный игровой проект на Angular 22 standalone components. Основное продуктовое направление - Pocket Pet: мягкая игра про ответственность за фэнтези-питомца в ограниченной жизненной сессии.

Перед изменением игрового поведения используй эти файлы как продуктовый контекст:

- `GAME_DESIGN.md` - источник истины для продуктовых решений, roadmap, non-goals и acceptance criteria.
- `README.md` - короткий обзор проекта, команды запуска и high-level roadmap.
- `src/app/i18n/translations.ts` - текущие тексты интерфейса на русском и английском.
- `apps/api/src/pets/pet-engine.ts` - текущие исполняемые правила игры.

## Команды

- Установить зависимости: `npm install`
- Полный локальный запуск (API + Angular + Studio): `npm run dev`
- Инструкция backend и БД: `docs/backend-guide.md`; диагностика: `npm run dev:doctor`.
- Только backend с подготовкой БД: `npm run dev:backend`.
- Проверить обе сборки без тестов: `npm run check`.
- Запустить dev server в сети: `npm start`
- Запустить dev server локально: `npm run start:local`
- Собрать проект: `npm run build`
- Тесты пока не входят в MVP-workflow; добавление и запуск покрытия выполняются отдельной задачей.

## Рабочие Правила

- Держи продуктовые документы практичными и полезными для разработки.
- Пиши проектную документацию на русском, если файл не является явно англоязычным.
- Для продуктовых решений используй явные метки, когда это помогает: `Текущее состояние`, `Решение`, `Предложение`, `Open question`.
- Задавай не больше 3 продуктовых вопросов за раз.
- Не выдумывай намерения владельца продукта. Если решение неизвестно, оставь open question или явно назови допущение.
- README должен оставаться коротким; подробный дизайн клади в `GAME_DESIGN.md` или focused specs под `docs/`.

## Легкий Agent Workflow

Для средних и крупных изменений используй такой процесс:

1. Сначала прочитай релевантный код и документы.
2. Определи тип задачи: продуктовый дизайн, implementation, bug fix или refactor.
3. Если не хватает продуктовых решений, задай до 3 сфокусированных вопросов.
4. Для новых систем обнови или создай короткую спецификацию до реализации.
5. Для engine, storage, backend и balance changes сначала сверяйся с продуктовой спецификацией; тестовое покрытие отложено до стабилизации MVP.
6. Вноси небольшие, scoped-правки.
7. Запусти самую узкую полезную проверку, затем более широкую, если поведение затрагивает границы модулей.
8. В конце кратко перечисли измененные файлы, проверку и оставшиеся open questions.

Это легкая версия Superpowers-style процесса: clarify, specify, plan, test, implement, review, finish. Не создавай тяжелые процессные артефакты для маленьких правок.

## Структура Документации

- `GAME_DESIGN.md`: product vision, systems, roadmap, acceptance criteria, non-goals.
- `docs/ai/`: agent workflow и шаблоны.
- `docs/specs/`: будущие подробные спеки фич и систем.
- `docs/plans/`: будущие implementation plans для крупных задач.

Примеры:

- Детали взросления питомцев могут начаться в `GAME_DESIGN.md`; подробные таблицы лучше вынести в `docs/specs/pet-lifecycle.md`.
- DLC-дракон позже должен получить focused spec вроде `docs/specs/dragon.md`.
- UX мини-игр и их влияние на состояние питомца позже должны жить в focused spec вроде `docs/specs/pet-activities.md`.

## Code Conventions

- Следуй существующим Angular standalone component patterns.
- Для игровых правил предпочитай typed models и pure functions.
- Держи пользовательские тексты в `src/app/i18n/translations.ts`.
- Избегай hardcoded UI strings в Angular templates/components, кроме временных developer-only labels.
- Держи gameplay math в engine/domain files, а не в UI components.
- Сохраняй существующие пользовательские изменения в worktree.

## Testing Expectations

- Тесты не являются частью текущего MVP acceptance scope.
- Не добавляй и не расширяй `*.spec.ts` без явного запроса.
- Отдельный этап тестового покрытия появится после фиксации UX и продуктовых правил.

## Backend Direction

Для изменений API дополнительно прочитай `apps/api/AGENTS.md`, для frontend pet-domain — `src/app/pets/AGENTS.md`.

Backend-направление MVP: NestJS + PostgreSQL + Prisma. Backend хранит состояние по anonymous guest id, а браузер получает guest id через HttpOnly-cookie. Pocket Pet не использует localStorage; backend остается source of truth для pet state, time, actions, cooldowns, sleep, walks и player resources.

## Boundaries

- MVP не включает создание персонажа игрока.
- MVP не включает регистрацию.
- MVP не включает механические отличия видов.
- MVP не включает сложные pet mini-games.
- MVP не включает progression, items, achievements или dragon.
- Dragon, дополнительные этапы взросления, более сложные активности и AI dialogue относятся к DLC после рабочей версии.
