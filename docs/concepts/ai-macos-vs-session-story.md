# `ai-macos` vs `session-story`

Эти проекты должны оставаться разными слоями.

## `ai-macos`

`ai-macos` — это runtime/automation layer.

Он отвечает за:

- экран;
- окна;
- Chrome;
- Android Chrome;
- ввод;
- локальные HTTP-сервисы;
- получение скриншотов;
- получение текста страницы;
- навигацию и управление вкладками.

Он не должен знать, как писать новости, сценарии, дикторку или блоговые посты.

## `session-story`

`session-story` — это story/media pipeline.

Он отвечает за:

- подготовку видео;
- извлечение кадров;
- batch-и и contact sheets;
- visual analysis;
- timeline;
- chapters;
- keyframes/photo report;
- GPT handoff;
- публикационный пакет.

Он не должен дублировать низкоуровневый код управления macOS/Chrome/Android.

## Граница интеграции

Если `session-story` нужно автоматизировать Qwen Studio или браузерный visual provider, он должен обращаться к `ai-macos` как к внешнему сервису.

Правильная модель:

```text
session-story -> provider adapter -> ai-macos HTTP API -> Chrome / Android / Screen
```

Неправильная модель:

```text
session-story напрямую тащит внутрь себя screen/chrome/android runtime
```

## Практический вывод

`ai-macos` — глаза и руки.

`session-story` — редактор смысла, хроника и публикационная сборка.
