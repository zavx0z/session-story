#!/usr/bin/env bash
set -euo pipefail

OUT="${1:-voice.opus}"

echo "Записываю звук Android через scrcpy в файл: $OUT"
echo "Остановить запись: Ctrl+C"

scrcpy --no-window --no-video --no-control --require-audio --record="$OUT"
