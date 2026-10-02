# Разработка с ИИ

Эта папка содержит легкие процессные документы для AI-assisted разработки в этом репозитории.

Цель - не церемония. Цель - меньше случайных продуктовых решений, безопаснее изменения gameplay и понятнее handoff между дизайном и реализацией.

## Что Использовать

- `AGENTS.md` в корне репозитория: always-on guidance для coding agents.
- `GAME_DESIGN.md`: product source of truth.
- `feature-spec-template.md`: шаблон для подробных систем, которые выросли из GDD.
- `implementation-plan-template.md`: шаблон для планов перед крупными implementation batches.
- `.github/pull_request_template.md`: human review checklist.
- `apps/api/AGENTS.md`: правила backend, Prisma и локальных проверок.
- `docs/backend-guide.md`: актуальные команды запуска и диагностики.

## Карта контекста

Читай строку, соответствующую задаче, а не все документы сразу. Пути в таблице указаны от корня репозитория. GDD задаёт продуктовый объём и решения; focused spec уточняет правила; код показывает действующее поведение. При расхождении укажи его, не превращай старый отчёт или допущение в новое решение владельца.

| Задача                         | Контекст                                                                                                       | Основные файлы                                                                                                                                    | Узкая проверка                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Уход, время, баланс, финал     | GDD §5–7, `docs/specs/backend-source-of-truth.md`, `apps/api/AGENTS.md`                                        | `apps/api/src/pets/pet-engine.ts`, `pet-species-traits.ts`, `pet-snapshot.ts`                                                                     | `npm run build:api`; ручной сценарий по изменённому правилу             |
| Вопросы, доверие, контент      | GDD §8–9, `docs/specs/question-activity.md`, `apps/api/AGENTS.md`                                              | API: `pet-question-rules.ts`, `pet-question.service.ts`, `pet-question-catalog.ts`, `pet-trust.ts`; UI: `src/app/pets/pet-questions.component.ts` | API build; при изменении контракта/UI — `npm run check`                 |
| API, хранение, миграции        | `apps/api/AGENTS.md`, specs `backend-source-of-truth.md`, `data-client-resilience.md`, `shared-environment.md` | `packages/pet-contract/index.d.ts`, `apps/api/src/pets/`, `prisma/schema.prisma`, `prisma/migrations/`, `src/app/pets/pet-api.service.ts`         | `npm run check`; проверки миграции на отдельной БД, если меняется схема |
| Комната, главная, альбом       | `src/app/pets/AGENTS.md`, specs `app-experience.md`, `pet-scene.md`, `ux-polish.md`                            | `src/app/pocket-pet/`, `pets/`, `home/`, `profile/`, `pet-profile/`                                                                               | `npm run build`; затронутый экран в браузере                            |
| Внешность и анимации           | `src/app/pets/AGENTS.md`, `docs/specs/pet-appearance.md`, `pet-scene.md`                                       | `src/app/pets/pet-illustration.component.*`, `pet-appearance*`, `pet-reaction.ts`, `src/app/pet-animations/`; API: `pet-appearance.ts`            | Frontend build; при изменении сохранения — обе сборки                   |
| Мини-игры                      | GDD §11, `docs/specs/pet-activities.md`, `src/app/pets/AGENTS.md`                                              | `src/app/pet-games/`, `src/app/tic-tac-toe/`; серверный `play` в `pet-engine.ts`                                                                  | Frontend build; запуск партии и повтор без повторного эффекта заботы    |
| Тексты и настройки             | `docs/specs/ux-polish.md` и spec соответствующего экрана                                                       | `src/app/i18n/`, `src/app/settings/`                                                                                                              | Frontend build; RU/EN на затронутом экране                              |
| Локальный запуск и инструменты | `docs/backend-guide.md`, specs `local-development.md`, `agent-tooling.md`                                      | `scripts/`, `package.json`, `.github/workflows/check.yml`, конфиги lint/format/MCP                                                                | Затронутая команда; `npm run dev:doctor` для работающего dev            |

Для SVG/3D дополнительно прочитай [прототип кота](../specs/pet-3d-prototype.md): `pet-illustration.component.ts` выбирает способ отрисовки; `pet-svg.component.*` сохраняет плоский вид; `pet-cat-3d.component.ts` управляет WebGL, а `cat-3d-model.ts` — процедурной моделью и движениями. Общие параметры — `pet-visual-state.ts`.

Все specs перечислены в [индексе](../specs/README.md). После изменения решения обнови его исходную спецификацию; при добавлении/завершении системы — её статус и индекс. Исторические результаты проверки в `docs/reports/` не подтверждают работоспособность нового коммита.

## Lint и форматирование

`npm run lint` проверяет исходный код и архитектурные границы; `npm run format:check` проверяет новые и изменённые файлы, `npm run format` исправляет их форматирование. Уже закоммиченный diff проверяется с `--base <commit>`. `npm run quality` объединяет эти проверки и обе сборки. Подробности и область CI — в [спецификации инструментов](../specs/agent-tooling.md).

Старые тесты и их отдельный runner удалены по решению владельца 2026-09-27. Новые тесты остаются отдельной задачей после стабилизации продукта; команды `npm test` нет.

## Проектные скиллы и MCP

- [pocket-pet-verify](../../.agents/skills/pocket-pet-verify/SKILL.md): проверить выбранный сценарий или накопленные изменения без добавления постоянных тестов. Пример: «Используй $pocket-pet-verify и проверь создание питомца и мини-игры после последних изменений».
- [pocket-pet-review](../../.agents/skills/pocket-pet-review/SKILL.md): ревью выбранного diff относительно спецификаций, контракта и сохранности данных. Пример: «Используй $pocket-pet-review для изменений относительно коммита …».

Скиллы не вводят обязательную приёмку после каждой задачи, не создают тестовый набор и не требуют параллельных агентов. Владелец может проверять результат после нескольких задач, как раньше.

Angular MCP настроен в `.codex/config.toml`: установленный CLI из `node_modules`, `--read-only`, инструменты `get_best_practices`, `search_documentation`, `list_projects`. После `npm ci` отдельная установка сервера не нужна. Codex должен доверять проекту; после добавления настройки перезапусти MCP через Settings → MCP servers → Restart. В текущей беседе новый набор инструментов может появиться только после обновления сессии. Проверка регистрации: `codex mcp get angular` из корня проекта.

MCP помогает с Angular API; игровые решения остаются в GDD/specs. При недоступности MCP используй установленный код и официальную документацию, не обновляй Angular ради запуска MCP. [Angular MCP](https://angular.dev/ai/mcp), [настройка Codex MCP](https://learn.chatgpt.com/docs/extend/mcp).

## Когда Нужен Новый Документ

Держи детали в `GAME_DESIGN.md`, пока они короткие. Создавай focused spec, когда выполняется хотя бы одно условие:

- разделу нужны таблицы, формулы, state diagrams или много примеров;
- реализация зависит от точных edge cases;
- несколько фич будут опираться на одни и те же правила;
- теме нужны собственные acceptance criteria.

Хорошие будущие кандидаты:

- `docs/specs/pet-lifecycle.md`
- `docs/specs/daily-rhythm.md`
- `docs/specs/dragon.md`

Реализованные системы перечислены в `docs/specs/README.md`; не создавай повторную спецификацию, если подходящая уже есть.

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
