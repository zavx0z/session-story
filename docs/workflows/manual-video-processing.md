# Manual Video Processing Workflow

Этот документ фиксирует ручной опыт обработки записи AI-сессии.

Цель — не потерять рабочие ffmpeg-команды и превратить их позже в воспроизводимый `edit plan`.

## Исходная проблема

Была запись macOS длительностью около 40 минут.

Нужно было получить короткое видео примерно на 3–4 минуты, но обычное ускорение `x10` плохо подходит для записи экрана:

- когда картинка стоит, ускорять нечего — это надо вырезать;
- когда что-то происходит, слишком сильное ускорение ломает смысл;
- действия в интерфейсе должны оставаться читаемыми.

Поэтому правильная схема:

```text
сначала убрать статичные кадры
потом дожать оставшееся видео
потом вручную вырезать лишнее
потом ускорить отдельные технические участки
```

## Smart decimate

Мягкое удаление похожих кадров:

```bash
ffmpeg -i interpret.mov \
-vf "fps=30,mpdecimate=hi=1024:lo=512:frac=0.20,setpts=N/(30*TB),format=yuv420p" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_smart.mp4
```

Более агрессивное удаление похожих кадров:

```bash
ffmpeg -i interpret.mov \
-vf "fps=30,mpdecimate=hi=2048:lo=1024:frac=0.33,setpts=N/(30*TB),format=yuv420p" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_smart_hard.mp4
```

## Дожать до нужной длительности

Пример: подогнать к 4 минутам, то есть к 240 секундам:

```bash
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 interpret_smart_hard.mp4) && \
FACTOR=$(python3 -c "print(float('$DUR')/240)") && \
echo "speed factor: $FACTOR" && \
ffmpeg -i interpret_smart_hard.mp4 \
-vf "setpts=PTS/$FACTOR,format=yuv420p" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_4min.mp4
```

## Вырезать интервал

Пример: вырезать `01:03–01:09`:

```bash
ffmpeg -i interpret_4min.mp4 \
-filter_complex "[0:v]trim=0:63,setpts=PTS-STARTPTS[v0];[0:v]trim=start=69,setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0,format=yuv420p[v]" \
-map "[v]" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_4min_cut.mp4
```

## Ускорить отдельный участок

Пример: ускорить `02:30–03:33` в 4 раза:

```bash
ffmpeg -i interpret_4min_cut.mp4 \
-filter_complex "[0:v]trim=0:150,setpts=PTS-STARTPTS[v0];[0:v]trim=150:213,setpts=(PTS-STARTPTS)/4[v1];[0:v]trim=start=213,setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[v]" \
-map "[v]" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_4min_cut_speed.mp4
```

## Применённые ручные вырезы

К файлу `interpret_4min_cut_speed.mp4` применялись вырезы:

```text
00:02–00:04
00:11–00:13
00:28–00:31
02:07–02:09
```

Одна команда:

```bash
ffmpeg -i interpret_4min_cut_speed.mp4 \
-filter_complex "[0:v]trim=0:2,setpts=PTS-STARTPTS[v0];[0:v]trim=4:11,setpts=PTS-STARTPTS[v1];[0:v]trim=13:28,setpts=PTS-STARTPTS[v2];[0:v]trim=31:127,setpts=PTS-STARTPTS[v3];[0:v]trim=start=129,setpts=PTS-STARTPTS[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0,format=yuv420p[v]" \
-map "[v]" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_4min_final.mp4
```

Потом из текущего финального файла дополнительно вырезался участок `02:46–02:48`:

```bash
ffmpeg -i interpret_4min_final.mp4 \
-filter_complex "[0:v]trim=0:166,setpts=PTS-STARTPTS[v0];[0:v]trim=start=168,setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0,format=yuv420p[v]" \
-map "[v]" \
-an \
-c:v libx264 -preset veryfast -crf 20 \
interpret_4min_final_2.mp4
```

## Проверка длительности

```bash
ffprobe -v error -show_entries format=duration \
-of default=noprint_wrappers=1:nokey=1 interpret_4min_final_2.mp4
```

## Contact sheet для визуальной проверки

Каждые 5 секунд:

```bash
ffmpeg -i interpret_4min_final_2.mp4 \
-vf "fps=1/5,scale=480:-1,tile=4x9" \
-y interpret_contact_sheet.jpg
```

Каждые 2 секунды:

```bash
ffmpeg -i interpret_4min_final_2.mp4 \
-vf "fps=1/2,scale=360:-1,tile=6x15" \
-y interpret_contact_sheet_2s.jpg
```

## Вывод

Эти команды нужно позже превратить в воспроизводимый JSON edit-plan, чтобы монтаж можно было повторить без ручного восстановления из чата.
