import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { readJson, writeJson, exists } from "./fs"
import type { QwenEvent, StoryChapter, StoryManifest, StoryRole, TimelineFile } from "./types"

type NormalizedEvent = QwenEvent & {
  id: string
}

export async function summarize(workdir: string, _flags: Record<string, string | boolean> = {}): Promise<void> {
  const timeline = await readJson<TimelineFile>(join(workdir, "timeline", "full-timeline.json"))
  const manifest = await readJson<StoryManifest>(join(workdir, "manifest.json"))

  const events = normalizeEvents(timeline.batches.flatMap((batch) => batch.events))
  const chapters = buildChapters(events, manifest.videoDurationSec)
  const codexSummary = await readOptionalText(join(workdir, "codex-summary.md"))
  const hasCodexSession = await exists(join(workdir, "codex-session.jsonl"))

  await mkdir(join(workdir, "story"), { recursive: true })

  await writeJson(join(workdir, "story", "chapters.json"), {
    inputVideo: timeline.inputVideo,
    videoDurationSec: timeline.videoDurationSec,
    chapters,
  })

  await Bun.write(join(workdir, "story", "facts.md"), renderFacts(events, chapters, codexSummary, hasCodexSession))
  await Bun.write(join(workdir, "story", "editorial-brief.md"), renderEditorialBrief(chapters, hasCodexSession))

  console.log(`Story summary подготовлен: ${join(workdir, "story")}`)
}

function normalizeEvents(events: QwenEvent[]): NormalizedEvent[] {
  return events.map((event, index) => ({
    ...event,
    id: event.id ?? `event_${String(index + 1).padStart(4, "0")}`,
    kind: event.kind ?? inferKind(event),
    importance: event.importance ?? inferImportance(event),
    suggestedSpeed: event.suggestedSpeed ?? (event.isIdle ? "speed_up" : "keep"),
  }))
}

function buildChapters(events: NormalizedEvent[], durationSec: number): StoryChapter[] {
  if (events.length === 0) {
    return [
      {
        id: "chapter_001",
        title: "Запись сессии",
        fromTime: "00:00:00",
        toTime: secToTimecode(durationSec),
        summary: "События не найдены. Нужно проверить результаты visual analysis.",
        importantEvents: [],
        recommendedKeyframeRoles: ["setup", "final_result"],
        editingNotes: "Проверить qwen-results и повторить merge.",
        voiceoverAngle: "Не хватает фактической базы для дикторки.",
      },
    ]
  }

  const buckets = splitIntoBuckets(events, Math.min(6, Math.max(3, Math.ceil(events.length / 5))))

  return buckets.map((bucket, index) => {
    const important = bucket.filter((event) => event.importance === "high" || event.requiresKeyframe).slice(0, 8)
    const roles = rolesForEvents(bucket)
    const from = bucket[0]!
    const to = bucket[bucket.length - 1]!

    return {
      id: `chapter_${String(index + 1).padStart(3, "0")}`,
      title: chapterTitle(bucket, index),
      fromTime: from.fromTime,
      toTime: to.toTime,
      summary: summarizeBucket(bucket),
      importantEvents: important.map((event) => event.id),
      recommendedKeyframeRoles: roles,
      editingNotes: editingNotes(bucket),
      voiceoverAngle: voiceoverAngle(bucket, index),
    }
  })
}

function splitIntoBuckets<T>(items: T[], count: number): T[][] {
  const buckets: T[][] = []
  const size = Math.ceil(items.length / count)

  for (let i = 0; i < items.length; i += size) {
    buckets.push(items.slice(i, i + size))
  }

  return buckets
}

function rolesForEvents(events: NormalizedEvent[]): StoryRole[] {
  const roles = new Set<StoryRole>()

  for (const event of events) {
    if (event.kind === "setup") roles.add("setup")
    if (event.kind === "instruction") roles.add("user_instruction")
    if (event.kind === "agent_work") roles.add("agent_work")
    if (event.kind === "code_edit") roles.add("code_change")
    if (event.kind === "test" || event.kind === "error") roles.add("test_or_error")
    if (event.kind === "browser_check" || event.kind === "result") roles.add("visual_result")
  }

  if (roles.size === 0) roles.add("evidence")

  return [...roles]
}

function chapterTitle(events: NormalizedEvent[], index: number): string {
  const kinds = new Set(events.map((event) => event.kind))

  if (index === 0) return "Контекст и постановка работы"
  if (kinds.has("instruction")) return "Правки и направление от пользователя"
  if (kinds.has("code_edit")) return "Изменения в коде"
  if (kinds.has("test") || kinds.has("error")) return "Проверка, ошибки и техническая рутина"
  if (kinds.has("browser_check") || kinds.has("result")) return "Визуальная проверка результата"

  return "Ход рабочей сессии"
}

function summarizeBucket(events: NormalizedEvent[]): string {
  const meaningful = events
    .filter((event) => !event.isIdle)
    .slice(0, 3)
    .map((event) => event.meaning || event.action || event.visible)
    .filter(Boolean)

  if (meaningful.length > 0) return meaningful.join(" ")

  return events
    .slice(0, 2)
    .map((event) => event.action || event.visible)
    .filter(Boolean)
    .join(" ")
}

function editingNotes(events: NormalizedEvent[]): string {
  const cut = events.filter((event) => event.suggestedSpeed === "cut").length
  const speed = events.filter((event) => event.suggestedSpeed === "speed_up").length
  const keep = events.filter((event) => event.suggestedSpeed === "keep").length

  return `Оставить: ${keep}. Ускорить: ${speed}. Вырезать: ${cut}. Важные кадры держать дольше, idle-участки ускорять.`
}

function voiceoverAngle(events: NormalizedEvent[], index: number): string {
  if (index === 0) {
    return "Объяснить зрителю, что это рабочая AI-сессия, из которой собирается понятный продуктовый отчёт."
  }

  const hasCode = events.some((event) => event.kind === "code_edit")
  if (hasCode) return "Показать, что агент не просто отвечает в чате, а реально меняет проект."

  const hasResult = events.some((event) => event.kind === "browser_check" || event.kind === "result")
  if (hasResult) return "Связать видимый результат на экране с предыдущими действиями агента."

  return "Коротко объяснить смысл этапа без перегруза техническими деталями."
}

function inferKind(event: QwenEvent): NormalizedEvent["kind"] {
  const text = `${event.visible} ${event.action} ${event.meaning}`.toLowerCase()

  if (event.isIdle || text.includes("ожид") || text.includes("idle")) return "idle"
  if (text.includes("ошиб") || text.includes("error") || text.includes("failed")) return "error"
  if (text.includes("test") || text.includes("тест") || text.includes("bun test")) return "test"
  if (text.includes("diff") || text.includes("код") || text.includes("file") || text.includes("src/")) return "code_edit"
  if (text.includes("брауз") || text.includes("chrome") || text.includes("интерфейс") || text.includes("ui")) return "browser_check"
  if (text.includes("пользователь") || text.includes("правк") || text.includes("задач")) return "instruction"
  if (text.includes("agent") || text.includes("codex") || text.includes("gpt") || text.includes("ии")) return "agent_work"

  return "other"
}

function inferImportance(event: QwenEvent): NormalizedEvent["importance"] {
  if (event.requiresKeyframe) return "high"
  if (event.isIdle) return "low"

  const text = `${event.action} ${event.meaning}`.toLowerCase()
  if (text.includes("результат") || text.includes("ошиб") || text.includes("готов") || text.includes("финал")) return "high"

  return "medium"
}

function secToTimecode(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":")
}

async function readOptionalText(path: string): Promise<string | null> {
  if (!(await exists(path))) return null
  return await Bun.file(path).text()
}

function renderFacts(
  events: NormalizedEvent[],
  chapters: StoryChapter[],
  codexSummary: string | null,
  hasCodexSession: boolean,
): string {
  const lines = ["# Факты сессии", ""]

  if (codexSummary) {
    lines.push("## Codex summary", "", codexSummary.trim(), "")
  } else if (hasCodexSession) {
    lines.push("## Codex session", "", "В workdir есть `codex-session.jsonl`. Его нужно приложить к GPT handoff как смысловой источник.", "")
  }

  lines.push("## Главы", "")

  for (const chapter of chapters) {
    lines.push(`### ${chapter.title} · ${chapter.fromTime}–${chapter.toTime}`, "")
    lines.push(chapter.summary, "")
    lines.push(`**Монтаж:** ${chapter.editingNotes}`, "")
    lines.push(`**Диктор:** ${chapter.voiceoverAngle}`, "")
  }

  lines.push("## События", "")

  for (const event of events) {
    lines.push(`### ${event.id} · ${event.fromTime}–${event.toTime}`, "")
    lines.push(`**Тип:** ${event.kind}`)
    lines.push("")
    lines.push(`**Видно:** ${event.visible}`)
    lines.push("")
    lines.push(`**Действие:** ${event.action}`)
    lines.push("")
    lines.push(`**Смысл:** ${event.meaning}`)
    lines.push("")
  }

  return `${lines.join("\n")}\n`
}

function renderEditorialBrief(chapters: StoryChapter[], hasCodexSession: boolean): string {
  const lines = [
    "# Editorial brief",
    "",
    "Собери из этой сессии не технический лог, а продуктовую новость/видеоблог.",
    "",
    "Главная рамка:",
    "",
    "- человек задаёт направление, вкус и критерии качества;",
    "- агент работает внутри проекта, а не просто отвечает текстом;",
    "- видео показывает реальный ход разработки;",
    "- ключевые кадры используются как фотоотчёт и доказательная лента;",
    "- idle и техническую рутину нужно ускорять, но не терять смысл.",
    "",
  ]

  if (hasCodexSession) {
    lines.push("Дополнительно используй `codex-session.jsonl`: там больше смысла, чем видно на экране.", "")
  }

  lines.push("## Предлагаемая структура", "")

  for (const chapter of chapters) {
    lines.push(`- ${chapter.fromTime}–${chapter.toTime}: ${chapter.title} — ${chapter.voiceoverAngle}`)
  }

  lines.push(
    "",
    "Нужны выходы:",
    "",
    "- русская дикторка;",
    "- английская дикторка;",
    "- короткая новость для блога;",
    "- описание видео;",
    "- монтажный план с удержанием/ускорением участков.",
    "",
  )

  return `${lines.join("\n")}\n`
}
