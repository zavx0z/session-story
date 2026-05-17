# Session Story

`session-story` — локальный pipeline для превращения записи рабочей AI-сессии в понятную историю для человека.

Проект не просто режет видео на кадры. Он связывает:

- монтаж и ускорение записи экрана;
- подготовку кадров с таймкодами;
- batch-и и contact sheets для визуального анализа;
- Qwen Vision / Qwen Studio как дешёвый visual-analyzer;
- `ai-macos` как слой браузерной автоматизации;
- Codex session export как смысловой источник;
- GPT handoff как финальную сборку дикторки, драматургии и описания ролика.

Проект появился из реальной сессии вокруг MetaFor, где GPT/Codex через локальные инструменты работал с кодом, браузером и интерфейсом, а затем эта сессия была превращена в короткое видео.

## Главная идея

Внутри MetaFor создаётся интерпретатор — рабочая среда, где человек и ИИ вместе работают с кодом.

Видео показывает не просто экран и не просто чат. Оно показывает новый режим работы:

- человек задаёт смысл, вкус и направление;
- ИИ читает проект, меняет файлы, запускает команды и проверяет результат;
- локальные инструменты дают ИИ доступ к браузеру, курсору, серверу и рабочей среде;
- интерфейс постепенно становится не просто отладчиком, а средой присутствия ИИ рядом с пользователем.

`session-story` нужен для того, чтобы из такой рабочей записи получить понятный человеческий сюжет.

## Почему не OCR как основной путь

Первоначально рассматривался OCR по видео: разложить ролик на кадры, распознать текст терминала/чата и построить таймлайн.

На практике OCR по всему экрану оказался плохим основным путём:

- мелкий текст;
- тёмная тема;
- код и английские имена;
- несколько областей интерфейса на одном кадре;
- шум от браузера, терминала, панелей и подсказок;
- Tesseract пытается читать весь экран как текст и даёт много мусора.

Поэтому OCR остаётся fallback-инструментом для отдельных областей, но основной путь — визуальный анализ кадров через Qwen Vision.

Qwen должен смотреть не только буквы, а сам кадр: что открыто, где пользователь даёт правку, где Codex пишет код, где запускаются тесты, где меняется интерфейс.

## Общий pipeline

```text
сырая запись экрана
  -> умное ускорение / удаление простоев
  -> ручные или полуавтоматические cut/speed операции
  -> финальное короткое видео
  -> кадры с таймкодами
  -> batch-и / contact sheets
  -> Qwen Vision visual analysis
  -> qwen-results/*.json
  -> merge в полный фактический таймлайн
  -> keyframes
  -> handoff для GPT
  -> дикторка / сюжет / описание / монтажный план
```

## Разделение ролей

**ffmpeg** отвечает за видео: вырезание простоев, ускорение, cut ranges, speed ranges, кадры и contact sheets.

**Qwen Vision / Qwen Studio** отвечает за первичный визуальный разбор кадров и фактический таймлайн.

**ai-macos** должен стать automation layer: открыть Qwen Studio в браузере, загрузить batch/contact sheet, вставить prompt, дождаться ответа и сохранить JSON.

**GPT Mini / дешёвая управляющая модель** может выполнять рутину браузерной автоматизации и не тратить дорогие токены на смысловую сборку.

**GPT Thinking** отвечает за финальную историю: дикторку, драматургию, объяснение для обычного человека и публикационный текст.

**Codex session jsonl** является смысловым источником: там есть реальная последовательность задач, ответов, команд, изменений и решений.

## Текущие команды

Установка:

```bash
bun install
```

Нужны внешние CLI-инструменты:

```bash
ffmpeg
ffprobe
```

Подготовить кадры:

```bash
bun run prepare ./interpret_4min_final_2.mp4 --target-frames 240 --batch-size 12
```

Другие режимы:

```bash
bun run prepare ./video.mp4 --fps 2
bun run prepare ./video.mp4 --every 2
bun run prepare ./video.mp4 --target-frames 350
bun run prepare ./video.mp4 --out ./story-work
```

По умолчанию создаётся папка:

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

## Ручной режим Qwen

Для каждого batch-а:

1. Открыть Qwen Chat / Qwen Studio в браузере.
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

Важно: Qwen должен просмотреть все batch-и. Contact sheet — это транспортный формат, а не повод пропускать часть видео.

## Собрать результаты Qwen

```bash
bun run merge ./.session-story
```

Результат:

```text
.session-story/timeline/full-timeline.json
.session-story/timeline/full-timeline.md
```

Команда проверяет, все ли batch-и обработаны. Если какого-то JSON нет, будет явная ошибка.

## Вытащить ключевые кадры

```bash
bun run keyframes ./.session-story --max 32
```

Результат:

```text
.session-story/keyframes/keyframes.json
.session-story/keyframes/keyframes.md
.session-story/keyframes/images/
```

## Подготовить пакет для GPT

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
- ключевые кадры;
- контекст ролика;
- Codex session export, если он добавлен вручную;
- задачу написать дикторский текст и монтажную драматургию.

Главная мысль ролика:

> MetaFor становится интерпретатором, где человек и ИИ работают с кодом вместе. В этом видео видно, как GPT/Codex не просто отвечает в чате, а через локальные инструменты работает внутри компьютера, улучшает UI собственной рабочей среды и постепенно приближает интерфейс к живому совместному пространству.

## Документация

- `docs/concepts/session-story-pipeline.md` — общий смысл и архитектурный вектор.
- `docs/workflows/manual-video-processing.md` — сохранённый ручной ffmpeg workflow.
- `docs/workflows/qwen-visual-analysis.md` — как прогонять batch-и через Qwen.
- `docs/workflows/ai-macos-qwen-automation.md` — будущая автоматизация Qwen Studio через `ai-macos`.
- `docs/workflows/codex-session-export.md` — как использовать Codex session jsonl.
- `docs/specs/edit-plan.md` — будущий JSON-формат монтажного плана.
- `docs/specs/vision-provider.md` — будущая архитектура visual provider-ов.
- `docs/notes/ocr-findings.md` — почему OCR оставлен fallback-режимом.
