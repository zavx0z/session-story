#!/usr/bin/env bash
set -euo pipefail

VIDEO="${1:-interpret_4min_final_2.mp4}"
VOICE="${2:-voice.opus}"
OUT="${3:-video_with_voice.mp4}"
START="${START:-0}"
VOLUME_DB="${VOLUME_DB:-0}"

VDUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")
ADUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VOICE")

ATEMPO=$(python3 - <<PY
v = float("$VDUR")
a = float("$ADUR") - float("$START")
print(a / v)
PY
)

echo "Видео: $VIDEO"
echo "Голос: $VOICE"
echo "Выход: $OUT"
echo "Длительность видео: $VDUR"
echo "Длительность голоса после обрезки: $(python3 - <<PY
print(float("$ADUR") - float("$START"))
PY
)"
echo "atempo: $ATEMPO"
echo "volume: ${VOLUME_DB}dB"

FILTER="[1:a]atrim=start=${START},asetpts=N/SR/TB,atempo=${ATEMPO}"
if [ "$VOLUME_DB" != "0" ]; then
  FILTER="${FILTER},volume=${VOLUME_DB}dB"
fi
FILTER="${FILTER}[a]"

ffmpeg -y \
-i "$VIDEO" \
-i "$VOICE" \
-map 0:v:0 \
-filter_complex "$FILTER" \
-map "[a]" \
-c:v copy \
-c:a aac -b:a 256k \
-shortest \
-movflags +faststart \
"$OUT"
