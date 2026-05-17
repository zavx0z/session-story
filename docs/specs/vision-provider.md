# Vision Provider Spec

`VisionProvider` — будущая архитектура для подключения разных способов визуального анализа batch-ей.

Сейчас основной режим — ручной Qwen Studio.

Следующий целевой режим — Qwen Studio Web через `ai-macos`.

## Цель

Отделить подготовку кадров от способа анализа.

`session-story` должен уметь работать с разными provider-ами:

```text
manual
qwen-web-ai-macos
mock
gpt-vision
local-qwen
```

Первый реальный provider для автоматизации:

```text
qwen-web-ai-macos
```

## Концептуальный интерфейс

```ts
type VisionProvider = {
  id: string
  analyzeBatch(input: VisionBatchInput): Promise<VisionBatchResult>
}

type VisionBatchInput = {
  workdir: string
  batchId: string
  promptFile: string
  contactSheetFile: string
  frameFiles: string[]
  outputFile: string
}

type VisionBatchResult = {
  batch: string
  outputFile: string
  ok: boolean
  error?: string
}
```

## Manual provider

Текущий режим.

Пользователь сам:

1. открывает Qwen;
2. загружает contact sheet;
3. вставляет prompt;
4. сохраняет JSON в `qwen-results`.

Команды будущего:

```bash
bun run qwen:manual ./.session-story
bun run qwen:status ./.session-story
```

## qwen-web-ai-macos provider

Будущий provider, который использует `ai-macos`.

Он должен:

- открыть Qwen Studio в браузере;
- загрузить contact sheet или кадры;
- вставить prompt;
- отправить запрос;
- дождаться ответа;
- скопировать JSON;
- проверить JSON;
- сохранить `qwen-results/batch_XXX.json`;
- перейти к следующему batch.

## Mock provider

Нужен для тестов.

Он может генерировать предсказуемые fake JSON-ответы, чтобы проверять `merge`, `keyframes`, `handoff` без Qwen.

## JSON validation

Перед сохранением provider должен проверять:

- JSON парсится;
- `batch` совпадает с ожидаемым;
- есть `coverage`;
- есть массив `events`;
- есть `fromTime`/`toTime`;
- есть `visible` и `action`.

Если JSON невалидный, provider должен:

1. сохранить сырой ответ в `automation/errors`;
2. попробовать repair prompt;
3. если repair не удался — остановиться с понятной ошибкой.

## Resume

Provider должен уметь продолжать работу.

Если файл уже существует:

```text
.session-story/qwen-results/batch_001.json
```

и он валиден — batch пропускается.

Если файла нет — batch обрабатывается.

Если файл невалиден — batch помечается как требующий repair.

## Логи

Рекомендуемая структура:

```text
.session-story/automation/
  qwen-web-ai-macos.log
  screenshots/
  raw-responses/
  errors/
```

## Главный принцип

Provider не должен писать художественный сценарий.

Он должен получить фактический visual timeline.

Смысловая сборка остаётся за GPT handoff.
