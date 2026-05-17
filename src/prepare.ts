import { mkdir, readdir, rename, copyFile as nodeCopyFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { numberFlag, stringFlag } from "./args"
import { writeJson } from "./fs"
import { assertCliExists, ffprobeDurationSec, runCommand } from "./shell"
import { safeTimecodeForFile, timecode } from "./time"
import type { BatchInfo, FrameInfo, StoryManifest } from "./types"

export async function prepare(inputVideo: string, flags: Record<string, string | boolean>): Promise<void> {
  await assertCliExists("ffmpeg")
  await assertCliExists("ffprobe")

  const outputDir = stringFlag(flags, "out", ".session-story")
  const batchSize = numberFlag(flags, "batch-size", 12)
  const targetFrames = numberFlag(flags, "target-frames", 350)
  const explicitFps = numberFlag(flags, "fps", 0)
  const every = numberFlag(flags, "every", 0)

  const duration = await ffprobeDurationSec(inputVideo)
  const fps = explicitFps > 0 ? explicitFps : every > 0 ? 1 / every : targetFrames / duration

  await mkdir(outputDir, { recursive: true })
  await mkdir(join(outputDir, "frames"), { recursive: true })
  await mkdir(join(outputDir, "batches"), { recursive: true })
  await mkdir(join(outputDir, "contact-sheets"), { recursive: true })
  await mkdir(join(outputDir, "qwen-prompts"), { recursive: true })
  await mkdir(join(outputDir, "qwen-results"), { recursive: true })
  await mkdir(join(outputDir, "timeline"), { recursive: true })
  await mkdir(join(outputDir, "story"), { recursive: true })
  await mkdir(join(outputDir, "keyframes"), { recursive: true })
  await mkdir(join(outputDir, "gpt-handoff"), { recursive: true })

  const framePattern = join(outputDir, "frames", "raw_%06d.png")
  const vfWithOverlay =
    `fps=${fps},drawtext=fontcolor=white:fontsize=34:box=1:boxcolor=black@0.70:x=20:y=20:text='кадр %{n} · %{pts\\:hms}'`

  try {
    await runCommand("ffmpeg", ["-y", "-i", inputVideo, "-vf", vfWithOverlay, framePattern])
  } catch {
    console.warn("Не удалось извлечь кадры с drawtext. Повторяю без наложенного таймкода.")
    await runCommand("ffmpeg", ["-y", "-i", inputVideo, "-vf", `fps=${fps}`, framePattern])
  }

  const rawFiles = (await readdir(join(outputDir, "frames")))
    .filter((file) => file.startsWith("raw_") && file.endsWith(".png"))
    .sort()

  const frames: FrameInfo[] = []

  for (let i = 0; i < rawFiles.length; i++) {
    const timeSec = i / fps
    const tc = timecode(timeSec)
    const newName = `frame_${String(i + 1).padStart(6, "0")}_${safeTimecodeForFile(timeSec)}.png`

    await rename(join(outputDir, "frames", rawFiles[i]!), join(outputDir, "frames", newName))

    frames.push({
      index: i + 1,
      timeSec,
      timecode: tc,
      file: `frames/${newName}`,
    })
  }

  const batches = await createBatches(outputDir, frames, batchSize)

  const manifest: StoryManifest = {
    inputVideo,
    outputDir,
    videoDurationSec: duration,
    frameCount: frames.length,
    batchSize,
    frames,
    batches,
  }

  await writeJson(join(outputDir, "manifest.json"), manifest)

  console.log(`Кадров подготовлено: ${frames.length}`)
  console.log(`Batch-ей: ${batches.length}`)
  console.log(`Папка: ${outputDir}`)
  console.log(`Manifest: ${join(outputDir, "manifest.json")}`)
}

async function createBatches(outputDir: string, frames: FrameInfo[], batchSize: number): Promise<BatchInfo[]> {
  const batches: BatchInfo[] = []

  for (let offset = 0; offset < frames.length; offset += batchSize) {
    const slice = frames.slice(offset, offset + batchSize)
    const batchIndex = batches.length + 1
    const id = `batch_${String(batchIndex).padStart(3, "0")}`
    const batchDir = join(outputDir, "batches", id)

    await mkdir(batchDir, { recursive: true })

    for (const frame of slice) {
      await nodeCopyFile(join(outputDir, frame.file), join(batchDir, basename(frame.file)))
    }

    const promptFile = join("batches", id, "prompt.md")
    const contactSheetFile = join("contact-sheets", `${id}_sheet.png`)

    await Bun.write(join(outputDir, promptFile), makeBatchPrompt(id, slice))

    await makeContactSheet(batchDir, join(outputDir, contactSheetFile))

    batches.push({
      id,
      index: batchIndex,
      fromFrame: basename(slice[0]!.file),
      toFrame: basename(slice[slice.length - 1]!.file),
      fromTime: slice[0]!.timecode,
      toTime: slice[slice.length - 1]!.timecode,
      frames: slice.map((frame) => frame.file),
      promptFile,
      contactSheetFile,
    })
  }

  return batches
}

async function makeContactSheet(batchDir: string, sheetFile: string): Promise<void> {
  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-pattern_type",
      "glob",
      "-i",
      `${batchDir}/*.png`,
      "-vf",
      "scale=420:-1,tile=4x3",
      sheetFile,
    ],
    { allowFailure: true },
  )
}

function makeBatchPrompt(batchId: string, frames: FrameInfo[]): string {
  const from = frames[0]!
  const to = frames[frames.length - 1]!

  return `# Анализ кадров для Qwen: ${batchId}

Ты анализируешь одну порцию кадров из записи рабочей AI-сессии.

Это не финальная дикторка и не художественный сценарий.
Твоя задача — фактически описать, что видно на кадрах, чтобы потом из этого собрать видеоотчёт, новость и видеоблог.

Главное правило по ключевым кадрам:
ключевые кадры — это фотоотчёт разработки, а не красивые thumbnails.

Ключевой кадр нужен, если по нему можно восстановить важный шаг работы:
- стартовое состояние;
- постановку задачи или правки;
- работу агента;
- изменение кода;
- запуск команды, тест, ошибку или перезапуск;
- проверку в браузере или интерфейсе;
- видимый результат;
- решение, поворот сюжета или финальное состояние.

Обязательно:
- просмотри каждый видимый кадр;
- описывай только то, что реально видно;
- похожие кадры объединяй в интервалы;
- не выдумывай скрытые действия;
- отмечай, где пользователь даёт задачу или правку;
- отмечай, где ИИ выполняет работу;
- отмечай запуск команд, тесты, перезапуски, ошибки;
- отмечай видимые изменения интерфейса;
- отмечай ожидание и техническую рутину;
- отмечай idle-участки, которые можно ускорить или вырезать;
- предлагай возможные ключевые кадры как доказательный фотоотчёт.

Не выбирай много одинаковых кадров подряд.
Если кадры похожи, оставь один лучший, укажи его coverageGroup и объясни, какой участок он покрывает.

storyRole для ключевого кадра выбери из списка:
- setup
- user_instruction
- agent_work
- code_change
- test_or_error
- visual_result
- decision
- final_result
- transition
- evidence

kind для события выбери из списка:
- setup
- instruction
- agent_work
- code_edit
- test
- error
- browser_check
- result
- idle
- transition
- other

suggestedSpeed для события:
- keep — оставить в нормальном темпе;
- speed_up — ускорить;
- cut — можно вырезать.

Важно:
- batch-и и contact sheets — только способ передать тебе все кадры порциями;
- нельзя пропускать участки видео;
- этот batch — часть полного просмотра видео;
- финальный таймлайн должен покрыть всё видео от начала до конца.

Покрытие:
- batch: ${batchId}
- от: ${from.timecode}
- до: ${to.timecode}
- кадров: ${frames.length}

Кадры:
${frames.map((frame) => `- ${basename(frame.file)} · ${frame.timecode}`).join("\n")}

Верни только валидный JSON:

{
  "batch": "${batchId}",
  "coverage": {
    "from": "${from.timecode}",
    "to": "${to.timecode}",
    "framesSeen": ${frames.length}
  },
  "events": [
    {
      "id": "${batchId}_event_001",
      "fromFrame": "${basename(from.file)}",
      "toFrame": "${basename(to.file)}",
      "fromTime": "${from.timecode}",
      "toTime": "${to.timecode}",
      "visible": "Что видно на экране.",
      "action": "Что происходит.",
      "meaning": "Почему это важно для истории.",
      "kind": "agent_work",
      "importance": "medium",
      "isIdle": false,
      "suggestedSpeed": "keep",
      "requiresKeyframe": true,
      "editingHint": "Держать / ускорить / переход / важное визуальное доказательство.",
      "voiceoverHint": "Что здесь может объяснить диктор."
    }
  ],
  "possibleKeyframes": [
    {
      "frame": "${basename(from.file)}",
      "timecode": "${from.timecode}",
      "timeSec": ${from.timeSec},
      "reason": "Почему этот кадр важен как часть фотоотчёта.",
      "storyRole": "setup",
      "coverageGroup": "${batchId}_setup",
      "noveltyScore": 0.8,
      "mustKeep": true,
      "duplicateOf": null,
      "coveredEventIds": ["${batchId}_event_001"],
      "importance": "high"
    }
  ],
  "segmentSummary": "Короткое фактическое резюме этого batch-а."
}
`
}
