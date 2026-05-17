# Codex Session Export Workflow

Codex session export нужен как смысловой источник для ролика.

Видео показывает экран, но не всегда понятно, какая задача была поставлена и почему Codex делает именно эти изменения.

Codex rollout/session JSONL помогает восстановить:

- пользовательские инструкции;
- ответы Codex;
- shell-команды;
- ошибки;
- этапы рассуждения на уровне действий;
- последовательность изменения проекта.

## Где искать сессии Codex

Обычно Codex хранит сессии локально:

```bash
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
```

Последний rollout:

```bash
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"

LATEST=$(find "$CODEX_DIR/sessions" -name 'rollout-*.jsonl' -type f -print0 \
  | xargs -0 ls -t \
  | head -1)

echo "$LATEST"
cp "$LATEST" ~/Desktop/codex-session-latest.jsonl
```

## Зачем session-story нужен Codex jsonl

Qwen видит кадры, но не всегда понимает:

- какая задача стояла;
- какие правки были принципиальны;
- что было технической рутиной;
- где пользователь менял направление;
- где Codex исправлял ошибку;
- где был архитектурный смысл.

Codex session jsonl даёт текстовый слой смысла.

Идеальная схема:

```text
Qwen timeline = что видно на экране
Codex jsonl = что реально происходило в задаче
GPT handoff = соединение визуального и смыслового слоя
```

## Будущий импорт

В будущем можно добавить команду:

```bash
bun run import-codex ~/Desktop/codex-session-latest.jsonl --out ./.session-story
```

Она должна сохранять:

```text
.session-story/codex/session.jsonl
.session-story/codex/session.md
.session-story/codex/summary.md
```

## Временный ручной режим

Пока команды нет, можно просто положить файл вручную:

```bash
mkdir -p .session-story/codex
cp ~/Desktop/codex-session-latest.jsonl .session-story/codex/session.jsonl
```

Потом передать GPT вместе с:

```text
.session-story/gpt-handoff/full-timeline.md
.session-story/gpt-handoff/keyframes.md
.session-story/codex/session.jsonl
```

## Важный принцип

Codex session не заменяет Qwen timeline.

Qwen отвечает за визуальную правду видео.

Codex отвечает за смысловую правду рабочей сессии.

GPT должен соединить оба слоя.
