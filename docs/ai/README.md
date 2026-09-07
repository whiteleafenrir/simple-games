# Agentic Development Workflow

Эта папка содержит легкие процессные документы для AI-assisted разработки в этом репозитории.

Цель - не церемония. Цель - меньше случайных продуктовых решений, безопаснее изменения gameplay и понятнее handoff между дизайном и реализацией.

## Что Использовать

- `AGENTS.md` в корне репозитория: always-on guidance для coding agents.
- `GAME_DESIGN.md`: product source of truth.
- `feature-spec-template.md`: шаблон для подробных систем, которые выросли из GDD.
- `implementation-plan-template.md`: шаблон для планов перед крупными implementation batches.
- `.github/pull_request_template.md`: human review checklist.

## Когда Нужен Новый Документ

Держи детали в `GAME_DESIGN.md`, пока они короткие. Создавай focused spec, когда выполняется хотя бы одно условие:

- разделу нужны таблицы, формулы, state diagrams или много примеров;
- реализация зависит от точных edge cases;
- несколько фич будут опираться на одни и те же правила;
- теме нужны собственные acceptance criteria.

Хорошие будущие кандидаты:

- `docs/specs/pet-lifecycle.md`
- `docs/specs/pet-activities.md`
- `docs/specs/daily-rhythm.md`
- `docs/specs/dragon.md`
- `docs/specs/backend-source-of-truth.md`

## Workflow

1. Понять цель и прочитать ближайший код/документы.
2. Задать до 3 сфокусированных вопросов, если не хватает продуктовых решений.
3. Написать или обновить самую маленькую полезную спецификацию.
4. Создать implementation plan для средней или крупной работы.
5. Для текущего MVP не добавлять тесты без отдельного запроса; тестовое покрытие отложено до стабилизации продуктового решения.
6. Реализовывать маленькими шагами.
7. Проверить через build и локальный ручной сценарий; тесты не являются acceptance gate текущего MVP.
8. Сверить результат со spec и перечислить оставшиеся open questions.

## Практическое Правило

Если будущий участник спрашивает "откуда взялось это решение?", ответ должен находиться в `GAME_DESIGN.md` или focused spec под `docs/specs/`.
