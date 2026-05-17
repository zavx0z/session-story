# Qwen Visual Analysis Workflow

Этот workflow заменяет неудачный OCR-подход.

Qwen Vision должен смотреть кадры или contact sheets и описывать, что реально происходит на экране.

## Почему Qwen, а не OCR

OCR пытается превратить весь экран в текст. Для записи AI-сессии это плохо:

- код мелкий;
- много английских имён;
- несколько панелей на экране;
- тёмная тема;
- есть терминал, браузер, Codex, UI, подсказки;
- важен не только текст, а само действие на экране.

Qwen Vision лучше подходит для первого фактического разбора:

- видит экран как изображение;
- может объединять похожие кадры в интервалы;
- может описать действие, а не только буквы;
- может предложить ключевые кадры;
- может отделять рутину от смысловых моментов.

## Подготовка видео

Пример:

```bash
bun run prepare ./interpret_4min_final_2.mp4 --target-frames 240 --batch-size 12
```

`batch-size 12` удобен, потому что contact sheet собирается сеткой `4x3`.

После подготовки:

```text
.session-story/batches/batch_001/
.session-story/contact-sheets/batch_001_sheet.png
.session-story/batches/batch_001/prompt.md
```

## Ручной режим

Для каждого batch-а:

1. Открыть Qwen Chat / Qwen Studio.
2. Загрузить `contact-sheets/batch_XXX_sheet.png` или 12 отдельных кадров.
3. Вставить текст из `batches/batch_XXX/prompt.md`.
4. Дождаться JSON.
5. Сохранить ответ в:

```text
.session-story/qwen-results/batch_XXX.json
```

## Требование к Qwen

Qwen не должен писать финальную дикторку.

Его задача — фактическое описание:

- что видно;
- что происходит;
- почему этот момент важен для истории;
- как его можно монтировать;
- что может объяснить диктор;
- какие кадры являются ключевыми.

## Формат результата

Каждый `batch_XXX.json` должен быть валидным JSON вида:

```json
{
  "batch": "batch_001",
  "coverage": {
    "from": "00:00",
    "to": "00:08",
    "framesSeen": 12
  },
  "events": [
    {
      "fromFrame": "frame_000001_00-00-00.png",
      "toFrame": "frame_000012_00-00-08.png",
      "fromTime": "00:00",
      "toTime": "00:08",
      "visible": "Что видно на экране.",
      "action": "Что происходит.",
      "meaning": "Почему это важно для истории.",
      "editingHint": "Держать / ускорить / переход / важное визуальное доказательство.",
      "voiceoverHint": "Что здесь может объяснить диктор."
    }
  ],
  "possibleKeyframes": [
    {
      "frame": "frame_000001_00-00-00.png",
      "timecode": "00:00",
      "reason": "Почему этот кадр важен.",
      "storyRole": "Роль кадра в истории.",
      "importance": "high"
    }
  ],
  "segmentSummary": "Короткое фактическое резюме batch-а."
}
```

## После Qwen

Когда все batch-и сохранены:

```bash
bun run merge ./.session-story
bun run keyframes ./.session-story --max 32
bun run handoff ./.session-story
```

## Важный принцип

Qwen делает факты.

GPT делает смысл.

Нельзя просить Qwen сразу сделать красивую дикторку, потому что тогда потеряется проверяемость таймлайна.
