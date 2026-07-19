# AGENTS.md

## Контекст Проекта

Simple Games - браузерный игровой проект на Angular 21 standalone components. Основное продуктовое направление - Pocket Pet: мягкая игра про ответственность за фэнтези-питомца в ограниченной жизненной сессии.

Перед изменением игрового поведения используй эти файлы как продуктовый контекст:

- `GAME_DESIGN.md` - источник истины для продуктовых решений, roadmap, non-goals и acceptance criteria.
- `README.md` - короткий обзор проекта, команды запуска и high-level roadmap.
- `src/app/i18n/translations.ts` - текущие тексты интерфейса на русском и английском.
- `src/app/pets/pet-engine.ts` и его тесты - текущие исполняемые правила игры.

## Команды

- Установить зависимости: `npm install`
- Запустить dev server в сети: `npm start`
- Запустить dev server локально: `npm run start:local`
- Собрать проект: `npm run build`
- Запустить тесты: `npm.cmd test` в Windows PowerShell, если `npm test` блокируется execution policy; иначе `npm test`.

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
5. Для engine, storage, backend и balance changes предпочитай TDD: сначала добавь или обнови тесты, потом меняй поведение.
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

- Обновляй `*.spec.ts`, когда меняешь pet engine, storage migrations или правила.
- Используй явные даты в тестах для time-based behavior.
- Покрывай migration behavior, когда меняется форма persisted data.
- Для UI-only copy или Markdown changes тесты обычно не нужны; явно скажи это в финальном ответе.

## Backend Direction

Планируемое backend-направление: NestJS + PostgreSQL + Prisma. MVP должен поддерживать guest mode без регистрации: backend хранит состояние по anonymous guest id, а localStorage хранит только guest id и optional cache. Backend должен стать source of truth для pet state, time, actions, cooldowns, sleep, walks и player resources.

## Boundaries

- MVP не включает создание персонажа игрока.
- MVP не включает регистрацию.
- MVP не включает механические отличия видов.
- MVP не включает сложные pet mini-games.
- MVP не включает progression, items, achievements или dragon.
- Dragon, дополнительные этапы взросления, более сложные активности и AI dialogue относятся к DLC после рабочей версии.
