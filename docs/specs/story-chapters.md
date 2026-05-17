# Spec: story chapters

`story/chapters.json` — промежуточная структура между фактическим timeline и финальной дикторкой.

## Формат

```json
{
  "inputVideo": "./video.mp4",
  "videoDurationSec": 240,
  "chapters": [
    {
      "id": "chapter_001",
      "title": "Контекст и постановка работы",
      "fromTime": "00:00:00",
      "toTime": "00:00:35",
      "summary": "Короткое фактическое резюме главы.",
      "importantEvents": ["event_0001", "event_0002"],
      "recommendedKeyframeRoles": ["setup", "user_instruction"],
      "editingNotes": "Что держать, ускорять или вырезать.",
      "voiceoverAngle": "Как объяснить этот участок зрителю."
    }
  ]
}
```

## Назначение

Главы нужны, чтобы GPT Thinking не тонул в длинном timeline.

Они дают:

- структуру истории;
- монтажный смысл;
- места для дикторки;
- ожидаемые роли ключевых кадров;
- связь между facts и публикацией.

## Правила

- Главы должны покрывать всё видео.
- Глава не должна быть художественной выдумкой.
- Summary опирается на visible/action/meaning.
- Если есть Codex session, она усиливает смысл, но не заменяет visual evidence.
