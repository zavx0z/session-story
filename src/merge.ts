import { mkdir, readdir } from "node:fs/promises"
import { join } from "node:path"
import { readJson, writeJson } from "./fs"
import type { QwenBatchResult, StoryManifest } from "./types"

export async function merge(workdir: string): Promise<void> {
  const manifest = await readJson<StoryManifest>(join(workdir, "manifest.json"))
  const resultDir = join(workdir, "qwen-results")
  const files = (await readdir(resultDir)).filter((file) => file.endsWith(".json")).sort()

  const expected = manifest.batches.map((batch) => `${batch.id}.json`)
  const missing = expected.filter((file) => !files.includes(file))

  if (missing.length > 0) {
    throw new Error(
      `Таймлайн неполный. Не найдены результаты Qwen:\n${missing
        .map((file) => `- ${join(resultDir, file)}`)
        .join("\n")}`,
    )
  }

  const results: QwenBatchResult[] = []

  for (const file of expected) {
    results.push(await readJson<QwenBatchResult>(join(resultDir, file)))
  }

  await mkdir(join(workdir, "timeline"), { recursive: true })

  await writeJson(join(workdir, "timeline", "full-timeline.json"), {
    inputVideo: manifest.inputVideo,
    videoDurationSec: manifest.videoDurationSec,
    batches: results,
  })

  await Bun.write(join(workdir, "timeline", "full-timeline.md"), renderTimeline(results))

  console.log(`Собрано Qwen batch-результатов: ${results.length}`)
  console.log(`Таймлайн: ${join(workdir, "timeline", "full-timeline.md")}`)
}

function renderTimeline(results: QwenBatchResult[]): string {
  const lines: string[] = ["# Полный таймлайн", ""]

  for (const result of results) {
    lines.push(`## ${result.batch} · ${result.coverage.from}–${result.coverage.to}`, "")

    for (const event of result.events) {
      lines.push(`### ${event.fromTime}–${event.toTime}`)
      lines.push("")
      lines.push(`**Что видно:** ${event.visible}`)
      lines.push("")
      lines.push(`**Действие:** ${event.action}`)
      lines.push("")
      lines.push(`**Смысл:** ${event.meaning}`)
      lines.push("")
      if (event.editingHint) lines.push(`**Монтаж:** ${event.editingHint}`, "")
      if (event.voiceoverHint) lines.push(`**Диктор:** ${event.voiceoverHint}`, "")
    }

    if (result.segmentSummary) {
      lines.push(`**Краткое резюме:** ${result.segmentSummary}`, "")
    }
  }

  return `${lines.join("\n")}\n`
}
