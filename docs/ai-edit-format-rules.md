# Правила составления патчей для `zavx0z/ai`

Эти правила написаны под текущий код `actions/edit` в проекте `zavx0z/ai`.

## Главный безопасный формат

Для JSON-патчей используй объект с `description` и `operations`:

```json
{
  "description": "Создать или изменить файлы проекта",
  "operations": [
    {
      "file": "/Users/vladimirfilipenko/session-story/src/cli.ts",
      "action": "create",
      "replace": "содержимое файла"
    }
  ]
}
```

Именно такой формат текущий `format-detector` уверенно определяет как `ai-edit`.

## Не использовать голый массив `{file, action}`

Не делай так:

```json
[
  {
    "file": "src/cli.ts",
    "action": "create",
    "replace": "..."
  }
]
```

Такой массив может не определиться как поддерживаемый формат.

## Абсолютные пути предпочтительнее

Для текущего workflow лучше использовать абсолютные пути.

Пример:

```json
{
  "file": "/Users/vladimirfilipenko/session-story/src/cli.ts",
  "action": "create",
  "replace": "..."
}
```

Почему:

- edit-инструмент может быть запущен из другой директории;
- абсолютный путь убирает неоднозначность;
- локальная автоматизация становится предсказуемее;
- меньше риска записать файл не туда.

## Перед генерацией патча нужно знать корень проекта

Перед созданием JSON-патча всегда запроси или подтверди абсолютный путь к проекту.

Пример:

```text
/Users/vladimirfilipenko/session-story
```

После этого все пути в JSON нужно строить от этого корня.

## Папки нужно создать до применения патча

Текущий edit-инструмент записывает файлы, но не обязан создавать вложенные директории.

Перед применением патча создай папки:

```bash
mkdir -p /Users/vladimirfilipenko/session-story/.ai
mkdir -p /Users/vladimirfilipenko/session-story/src
mkdir -p /Users/vladimirfilipenko/session-story/prompts
mkdir -p /Users/vladimirfilipenko/session-story/docs
mkdir -p /Users/vladimirfilipenko/session-story/scripts
```

## Поддерживаемые действия

```ts
type ActionType = "replace" | "create" | "delete" | "rename" | "overwrite"
```

## Создание файла

```json
{
  "file": "/absolute/path/file.ts",
  "action": "create",
  "replace": "новое содержимое"
}
```

## Полная перезапись файла

```json
{
  "file": "/absolute/path/file.ts",
  "action": "overwrite",
  "replace": "новое содержимое"
}
```

## Замена блока

```json
{
  "file": "/absolute/path/file.ts",
  "action": "replace",
  "search": "старый блок",
  "replace": "новый блок"
}
```

## Удаление блока

```json
{
  "file": "/absolute/path/file.ts",
  "action": "delete",
  "search": "блок для удаления"
}
```

## Правила для `search`

`search` должен быть минимальным, но уникальным.

Плохо:

```json
{
  "search": "const value = 1"
}
```

если такая строка встречается много раз.

Хорошо:

```json
{
  "search": "export function buildTimeline() {\n  const value = 1\n}"
}
```

## Как работает fuzzy matching

Текущий `applySmartPatch` сначала ищет точное совпадение.

Если точного совпадения нет, он пробует fuzzy-поиск:

- игнорирует лишние пробелы;
- может пропускать пустые строки в файле;
- ищет якорь по первой строке search-блока;
- дальше сравнивает нормализованные строки.

Это полезно, но не надо на него полностью полагаться.

Лучше давать точный `search`.

## Большие изменения

Если меняется больше половины файла — используй `overwrite`.

Если создаётся новый файл — используй `create`.

Если меняется маленький кусок — используй `replace`.

## Что проверять перед применением

```bash
python3 -m json.tool .ai/edit.json >/dev/null && echo "valid json"
head -20 .ai/edit.json
```

В начале должно быть:

```json
{
  "description": "...",
  "operations": [
```

## Пример подготовки проекта

```bash
cd /Users/vladimirfilipenko/session-story

mkdir -p .ai src prompts docs scripts

cp ~/Downloads/session-story-edit-ru.json .ai/edit.json

python3 -m json.tool .ai/edit.json >/dev/null && echo "valid json"

ai edit
```
