# Session Story

`session-story` — локальный pipeline для превращения записи рабочей AI-сессии в понятную историю: видеоотчёт, новость для блога, медиапост и дикторский видеоблог на русском и английском.

Проект не просто режет видео на кадры. Он связывает:

- монтаж и ускорение записи экрана;
- подготовку кадров с таймкодами;
- batch-и и contact sheets для visual analysis;
- Qwen Vision / GPT Mini как дешёвый визуальный анализатор;
- `ai-macos` как слой браузерной и экранной автоматизации;
- Codex session export как смысловой источник;
- GPT Thinking как финальную сборку дикторки, драматургии, публикации и монтажного плана.

## Разделение ролей

`ai-macos` — это runtime/automation layer. Он даёт доступ к экрану, окнам, Chrome, Android, вводу и локальным HTTP-сервисам.

`session-story` — это story/media pipeline. Он не должен дублировать низкоуровневую автоматизацию. Он принимает видео, кадры, visual analysis, Codex session и собирает из этого человеческий отчёт.

## Главная идея

Видео показывает не просто экран и не просто чат. Оно показывает новый режим работы:

- человек задаёт смысл, вкус и направление;
- ИИ читает проект, меняет файлы, запускает команды и проверяет результат;
- локальные инструменты дают ИИ доступ к браузеру, серверу и рабочей среде;
- запись превращается в понятную новость о ходе разработки.

## Ключевые кадры как фотоотчёт

Ключевые кадры — это не красивые thumbnails.

Это доказательная лента разработки: минимальный набор кадров, по которому можно восстановить ход работы без лишних повторов и без потери важных событий.

Кадр нужен, если он фиксирует:

- стартовое состояние;
- постановку задачи или правки;
- работу агента;
- изменение кода;
- тест, ошибку или перезапуск;
- проверку в браузере;
- визуальный результат;
- решение или финальное состояние.

## Общий pipeline

```text
сырая запись экрана
  -> умное ускорение / удаление простоев
  -> финальное короткое видео
  -> кадры с таймкодами
  -> batch-и / contact sheets
  -> Qwen Vision / GPT Mini visual analysis
  -> qwen-results/*.json
  -> merge в полный фактический таймлайн
  -> summarize в главы и editorial brief
  -> keyframes как фотоотчёт
  -> handoff для GPT Thinking
  -> RU/EN дикторка, новость, описание, монтажный план
```

## Команды

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
bun run prepare ./video.mp4 --target-frames 240 --batch-size 12
```

Собрать результаты Qwen/GPT Mini:

```bash
bun run merge ./.session-story
```

Собрать главы, факты и editorial brief:

```bash
bun run summarize ./.session-story
```

Вытащить фотоотчёт ключевых кадров:

```bash
bun run keyframes ./.session-story --max 32 --min-gap-sec 2
```

Подготовить пакет для GPT:

```bash
bun run handoff ./.session-story
```

Проверки:

```bash
bun test
bun run typecheck
```

## Рабочая папка

```text
.session-story/
  frames/
  batches/
  contact-sheets/
  qwen-prompts/
  qwen-results/
  timeline/
  story/
  keyframes/
  gpt-handoff/
  manifest.json
```

## Ручной режим visual analysis

Для каждого batch-а:

1. Открыть Qwen Chat / Qwen Studio / GPT Mini Vision.
2. Загрузить картинки из `batches/batch_XXX/` или contact sheet из `contact-sheets/`.
3. Вставить текст из `batches/batch_XXX/prompt.md`.
4. Сохранить JSON-ответ в:

```text
.session-story/qwen-results/batch_XXX.json
```

Важно: visual analyzer должен просмотреть все batch-и. Contact sheet — транспортный формат, а не повод пропускать часть видео.

## GPT handoff

На выходе `handoff` готовит:

```text
.session-story/gpt-handoff/
  prompt.md
  full-timeline.md
  full-timeline.json
  chapters.json
  facts.md
  editorial-brief.md
  keyframes.md
  keyframes.json
  keyframes/
  codex-session.jsonl
  codex-summary.md
  publish/
```

GPT Thinking должен собрать:

- русскую дикторку;
- английскую дикторку;
- новость для блога;
- описание видео;
- монтажный план;
- пояснения по ключевым кадрам.

## Документация

- `docs/concepts/session-story-pipeline.md` — общий смысл и архитектурный вектор.
- `docs/concepts/photo-report-keyframes.md` — ключевые кадры как фотоотчёт.
- `docs/concepts/ai-macos-vs-session-story.md` — разделение runtime и storytelling pipeline.
- `docs/workflows/manual-video-processing.md` — ручной ffmpeg workflow.
- `docs/workflows/qwen-visual-analysis.md` — как прогонять batch-и через visual analyzer.
- `docs/workflows/product-news-video-report.md` — workflow видеоотчёта/новости.
- `docs/specs/story-chapters.md` — формат глав.
- `docs/specs/publish-package.md` — структура публикационного пакета.
