# Edit Plan Spec

`edit-plan` — будущий JSON-формат для воспроизводимой обработки видео.

Он нужен, чтобы не терять ручные ffmpeg-команды из чата и иметь возможность повторить монтаж.

## Цель

Описать путь:

```text
raw input video
  -> smart decimate
  -> fit duration
  -> cut ranges
  -> speed ranges
  -> final video
```

в одном JSON-файле.

## Пример

```json
{
  "input": "/Users/vladimirfilipenko/Desktop/interpret.mov",
  "output": "/Users/vladimirfilipenko/Desktop/interpret_4min_final_2.mp4",
  "steps": [
    {
      "type": "smart-decimate",
      "output": "/Users/vladimirfilipenko/Desktop/interpret_smart_hard.mp4",
      "fps": 30,
      "hi": 2048,
      "lo": 1024,
      "frac": 0.33,
      "crf": 20,
      "preset": "veryfast"
    },
    {
      "type": "fit-duration",
      "output": "/Users/vladimirfilipenko/Desktop/interpret_4min.mp4",
      "durationSec": 240
    },
    {
      "type": "speed-range",
      "output": "/Users/vladimirfilipenko/Desktop/interpret_4min_cut_speed.mp4",
      "from": "02:30",
      "to": "03:33",
      "factor": 4
    },
    {
      "type": "cut",
      "output": "/Users/vladimirfilipenko/Desktop/interpret_4min_final.mp4",
      "ranges": [
        ["00:02", "00:04"],
        ["00:11", "00:13"],
        ["00:28", "00:31"],
        ["02:07", "02:09"]
      ]
    },
    {
      "type": "cut",
      "output": "/Users/vladimirfilipenko/Desktop/interpret_4min_final_2.mp4",
      "ranges": [
        ["02:46", "02:48"]
      ]
    }
  ]
}
```

## Типы шагов

### smart-decimate

Удаляет почти одинаковые кадры.

Поля:

```ts
type SmartDecimateStep = {
  type: "smart-decimate"
  output: string
  fps: number
  hi: number
  lo: number
  frac: number
  crf?: number
  preset?: string
}
```

### fit-duration

Дожимает видео до нужной длительности.

```ts
type FitDurationStep = {
  type: "fit-duration"
  output: string
  durationSec: number
}
```

### cut

Вырезает интервалы.

```ts
type CutStep = {
  type: "cut"
  output: string
  ranges: Array<[string, string]>
}
```

### speed-range

Ускоряет один интервал.

```ts
type SpeedRangeStep = {
  type: "speed-range"
  output: string
  from: string
  to: string
  factor: number
}
```

## Будущая команда

```bash
bun run edit ./session-edit-plan.json
```

## Правила

- Все пути лучше хранить абсолютными.
- Каждый шаг должен иметь явный `output`.
- Нельзя терять промежуточные файлы, пока pipeline не проверен.
- По умолчанию звук выкидывается через `-an`, потому что для сюжетного ролика дикторка пишется отдельно.
- После каждого шага желательно сохранять duration через `ffprobe`.

## Почему это важно

Ручные команды из чата легко потерять.

`edit-plan` превращает монтажные решения в воспроизводимый артефакт проекта.
