# ai-macos Qwen Automation Workflow

Этот документ задаёт направление автоматизации Qwen Studio через `ai-macos`.

Идея: не отправлять batch-и в Qwen вручную, а использовать второй MacBook и браузерную автоматизацию.

## Цель

Автоматизировать цикл:

```text
session-story готовит batch/contact sheet/prompt
  -> ai-macos открывает Qwen Studio в браузере
  -> загружает изображение или набор кадров
  -> вставляет prompt
  -> запускает анализ
  -> ждёт ответ
  -> забирает JSON
  -> сохраняет qwen-results/batch_XXX.json
  -> переходит к следующему batch
```

## Почему через браузер

Qwen Studio в вебе может быть выгодным visual analyzer.

Если нет удобного стабильного API или если web-доступ дешевле, браузерная автоматизация становится нормальным промежуточным решением.

`ai-macos` нужен как слой управления:

- открыть вкладку;
- загрузить файл;
- вставить prompt;
- нажать кнопку;
- дождаться ответа;
- скопировать результат;
- сохранить файл.

## Разделение моделей

Не нужно тратить сильную GPT Thinking модель на рутинное скармливание batch-ей.

Роли:

```text
GPT Mini / управляющая модель:
  browser automation, copy/paste, save files, retries

Qwen Vision:
  смотрит кадры и отдаёт factual JSON

GPT Thinking:
  делает финальную историю, дикторку и драматургию
```

## Требования к automation layer

Автоматизация должна быть устойчивой:

- не завязываться жёстко на один CSS-селектор, если можно использовать видимые элементы;
- сохранять промежуточные результаты после каждого batch-а;
- уметь продолжать с последнего необработанного batch-а;
- логировать каждый шаг;
- сохранять screenshots при ошибке;
- валидировать JSON перед переходом дальше;
- уметь просить Qwen исправить JSON, если ответ невалидный.

## Будущий CLI

Возможный интерфейс:

```bash
bun run qwen:manual ./.session-story
bun run qwen:auto ./.session-story --provider qwen-web-ai-macos
bun run qwen:resume ./.session-story
bun run qwen:validate ./.session-story
```

Сейчас это только направление. Не нужно сразу писать хрупкую реализацию под текущий DOM Qwen.

## Очередь batch-ей

Автоматизация должна читать `manifest.json` и проверять:

```text
.session-story/qwen-results/batch_001.json
.session-story/qwen-results/batch_002.json
...
```

Если файл уже есть и валиден — batch пропускается.

Если файла нет — batch отправляется в Qwen.

Если файл есть, но JSON невалидный — batch помечается как требующий repair.

## Логи

Минимальные логи:

```text
.session-story/automation/qwen-web-ai-macos.log
.session-story/automation/screenshots/
.session-story/automation/errors/
```

## Главный принцип

`session-story` должен оставаться orchestrator-ом.

`ai-macos` — исполнитель браузерных действий.

Qwen — visual analyzer.

GPT — смысловой редактор и сценарист.
