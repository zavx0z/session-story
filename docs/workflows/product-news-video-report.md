# Workflow: продуктовая новость из AI-сессии

Цель: из записи рабочего стола получить видеоотчёт, который выглядит как новость разработки или видеоблог.

## 1. Запись

Пользователь записывает desktop video во время реальной работы с агентом.

На записи могут быть:

- чат;
- Codex;
- терминал;
- браузер;
- UI проекта;
- локальные сервисы;
- Android voice workflow.

## 2. Очистка видео

Сырое видео ускоряется и очищается:

- убрать длинные ожидания;
- ускорить техническую рутину;
- оставить важные моменты;
- сохранить доказательные переходы.

## 3. Подготовка кадров

```bash
bun run prepare ./video.mp4 --target-frames 240 --batch-size 12
```

Результат:

- `frames/`;
- `batches/`;
- `contact-sheets/`;
- prompt на каждый batch.

## 4. Visual analysis

Qwen Vision или GPT Mini получает batch-и и возвращает JSON.

Главное: он описывает факты, а не пишет финальную дикторку.

## 5. Timeline

```bash
bun run merge ./.session-story
```

Результат:

- полный фактический timeline;
- события;
- possible keyframes.

## 6. Story summary

```bash
bun run summarize ./.session-story
```

Результат:

- chapters;
- facts;
- editorial brief.

## 7. Фотоотчёт

```bash
bun run keyframes ./.session-story --max 32
```

Ключевые кадры должны покрывать историю, а не просто быть красивыми.

## 8. GPT handoff

```bash
bun run handoff ./.session-story
```

GPT получает всё:

- timeline;
- chapters;
- facts;
- keyframes;
- Codex session, если есть.

## 9. Публикационный пакет

GPT делает:

- RU voiceover;
- EN voiceover;
- blog news RU;
- blog news EN;
- video description;
- editing plan;
- keyframe usage notes.

## 10. Озвучка

Русский и английский тексты можно озвучивать через Android workflow и затем монтировать в финальное видео.
