# Session Story

`session-story` — отдельный локальный проект для превращения записи рабочей AI-сессии в понятную историю:

- видео режется на кадры с таймкодами;
- кадры группируются в batch-и;
- для Qwen Vision готовятся промпты;
- Qwen просматривает все кадры порциями и собирает фактический таймлайн;
- из таймлайна выбираются ключевые кадры;
- затем готовится пакет для GPT;
- GPT по полному таймлайну и ключевым кадрам пишет дикторку, монтажную драматургию и описание ролика.

Проект появился из реальной сессии вокруг MetaFor.

## Главная идея

Внутри MetaFor создаётся интерпретатор — рабочая среда, где человек и ИИ могут вместе работать с кодом.

Видео показывает не просто экран и не просто чат. В нём видно один этап этой работы: улучшается UI интерпретатора, чтобы панели, карточки, консоль и область кода выглядели как единая рабочая среда.

Человек задаёт смысл, вкус и направление.

ИИ берёт на себя рутину: читает код, меняет файлы, перезапускает окружение, проверяет результат и продолжает итерацию.

## Общий pipeline

```text
видео
  -> кадры с таймкодами
  -> batch-и / contact sheets
  -> Qwen анализирует каждый batch
  -> qwen-results/*.json
  -> merge собирает полный таймлайн
  -> keyframes выбирает ключевые кадры
  -> handoff готовит пакет для GPT
  -> GPT пишет финальную историю, дикторку и описание
```

## Разделение ролей

**Qwen** отвечает за первичный просмотр всех кадров и фактический таймлайн.

**GPT** отвечает за смысловую сборку, художественную дикторку, драматургию монтажа и публикационный текст.

Ключевые кадры не заменяют полный таймлайн. Они выбираются только после того, как Qwen просмотрел всё видео порциями.

## Установка

```bash
bun install
```

Нужны внешние CLI-инструменты:

```bash
ffmpeg
ffprobe
```

Для записи звука с Android через ADB-связку можно использовать:

```bash
scrcpy
adb
```

## 1. Подготовить кадры

```bash
bun run prepare ./interpret_4min_final_2.mp4 --target-frames 350 --batch-size 12
```

По умолчанию будет создана папка:

```text
.session-story/
  frames/
  batches/
  contact-sheets/
  qwen-prompts/
  qwen-results/
  timeline/
  keyframes/
  gpt-handoff/
  manifest.json
```

Другие режимы:

```bash
bun run prepare ./video.mp4 --fps 2
bun run prepare ./video.mp4 --every 2
bun run prepare ./video.mp4 --target-frames 350
bun run prepare ./video.mp4 --out ./story-work
```

## 2. Прогнать все batch-и через Qwen

Для каждого batch-а:

1. Открыть Qwen Chat в браузере.
2. Загрузить картинки из `batches/batch_XXX/` или contact sheet из `contact-sheets/`.
3. Вставить текст из `batches/batch_XXX/prompt.md`.
4. Сохранить JSON-ответ Qwen в:

```text
.session-story/qwen-results/batch_XXX.json
```

Пример:

```text
.session-story/qwen-results/batch_001.json
.session-story/qwen-results/batch_002.json
```

Важно: Qwen должен просмотреть все batch-и. Contact sheet — это только удобный транспортный формат, а не способ пропустить часть видео.

## 3. Собрать результаты Qwen

```bash
bun run merge ./.session-story
```

Результат:

```text
.session-story/timeline/full-timeline.json
.session-story/timeline/full-timeline.md
```

Команда проверяет, все ли batch-и обработаны. Если какого-то JSON нет, будет явная ошибка.

## 4. Вытащить ключевые кадры

```bash
bun run keyframes ./.session-story --max 32
```

Результат:

```text
.session-story/keyframes/keyframes.json
.session-story/keyframes/keyframes.md
.session-story/keyframes/images/
```

## 5. Подготовить пакет для GPT

```bash
bun run handoff ./.session-story
```

Результат:

```text
.session-story/gpt-handoff/
  prompt.md
  full-timeline.md
  keyframes.md
  keyframes/
```

## Что должно получиться

На выходе GPT получает:

- полный фактический таймлайн от Qwen;
- набор ключевых кадров;
- контекст ролика;
- задачу написать дикторский текст и монтажную драматургию.

Главная мысль ролика:

> MetaFor становится интерпретатором, где человек и ИИ работают с кодом вместе. В этом видео улучшается UI этого интерпретатора, чтобы совместная работа была не слепой перепиской, а живой рабочей средой.
