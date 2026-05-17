import { mkdir, copyFile as nodeCopyFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { numberFlag } from "./args"
import { readJson, writeJson } from "./fs"
import type { QwenBatchResult, QwenKeyframe } from "./types"

type TimelineFile = {
  batches: QwenBatchResult[]
}

export async function keyframes(workdir: string, flags: Record<string, string | boolean>): Promise<void> {
  const max = numberFlag(flags, "max", 32)
  const timeline = await readJson<TimelineFile>(join(workdir, "timeline", "full-timeline.json"))

  const candidates = timeline.batches.flatMap((batch) => batch.possibleKeyframes ?? [])
  const selected = selectKeyframes(candidates, max)

  await mkdir(join(workdir, "keyframes", "images"), { recursive: true })

  for (const frame of selected) {
    const source = join(workdir, "frames", frame.frame)
    const dest = join(workdir, "keyframes", "images", basename(frame.frame))

    try {
      await nodeCopyFile(source, dest)
    } catch {
      // Оставляем метаданные, даже если Qwen вернул имя кадра не совсем точно.
    }
  }

  await writeJson(join(workdir, "keyframes", "keyframes.json"), selected)
  await Bun.write(join(workdir, "keyframes", "keyframes.md"), renderKeyframes(selected))

  console.log(`Выбрано ключевых кадров: ${selected.length}`)
}

function selectKeyframes(candidates: QwenKeyframe[], max: number): QwenKeyframe[] {
  const seen = new Set<string>()
  const unique: QwenKeyframe[] = []

  for (const item of candidates) {
    if (seen.has(item.frame)) continue
    seen.add(item.frame)
    unique.push(item)
  }

  unique.sort((a, b) => score(b) - score(a))

  return unique.slice(0, max)
}

function score(frame: QwenKeyframe): number {
  if (frame.importance === "high") return 3
  if (frame.importance === "medium") return 2
  return 1
}

function renderKeyframes(frames: QwenKeyframe[]): string {
  const lines = ["# Ключевые кадры", ""]

  for (const frame of frames) {
    lines.push(`## ${frame.timecode} · ${frame.frame}`)
    lines.push("")
    lines.push(`**Почему важен:** ${frame.reason}`)
    lines.push("")
    if (frame.storyRole) lines.push(`**Роль в истории:** ${frame.storyRole}`, "")
    if (frame.importance) lines.push(`**Важность:** ${frame.importance}`, "")
  }

  return `${lines.join("\n")}\n`
}
