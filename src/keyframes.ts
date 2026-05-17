import { mkdir, copyFile as nodeCopyFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { numberFlag, stringFlag } from "./args"
import { readJson, writeJson } from "./fs"
import type { QwenBatchResult, QwenEvent, QwenKeyframe, StoryRole, TimelineFile } from "./types"

type TimelineLike = TimelineFile | {
  batches: QwenBatchResult[]
}

type SelectedFrame = QwenKeyframe & {
  timeSec: number
  selectionReason: string
}

const DEFAULT_ROLE_ORDER: StoryRole[] = [
  "setup",
  "user_instruction",
  "agent_work",
  "code_change",
  "test_or_error",
  "visual_result",
  "decision",
  "final_result",
  "evidence",
  "transition",
]

export async function keyframes(workdir: string, flags: Record<string, string | boolean>): Promise<void> {
  const max = numberFlag(flags, "max", 32)
  const minGapSec = numberFlag(flags, "min-gap-sec", 2)
  const preferRoles = parseRoles(stringFlag(flags, "prefer-roles", DEFAULT_ROLE_ORDER.join(",")))

  const timeline = await readJson<TimelineLike>(join(workdir, "timeline", "full-timeline.json"))
  const batches = timeline.batches
  const candidates = batches.flatMap((batch) => batch.possibleKeyframes ?? [])
  const events = batches.flatMap((batch) => batch.events)

  const selected = selectKeyframes(candidates, events, {
    max,
    minGapSec,
    preferRoles,
  })

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

  console.log(`Выбрано кадров для фотоотчёта: ${selected.length}`)
}

function selectKeyframes(
  candidates: QwenKeyframe[],
  events: QwenEvent[],
  options: {
    max: number
    minGapSec: number
    preferRoles: StoryRole[]
  },
): SelectedFrame[] {
  const normalized = normalizeCandidates(candidates)
  const byFrame = new Map<string, SelectedFrame>()
  const usedCoverageGroups = new Set<string>()

  const add = (frame: SelectedFrame, selectionReason: string, respectGap = true): void => {
    if (byFrame.has(frame.frame)) return
    if (frame.duplicateOf && !frame.mustKeep) return

    if (frame.coverageGroup && usedCoverageGroups.has(frame.coverageGroup) && !frame.mustKeep) return

    if (respectGap && !frame.mustKeep && isTooClose(frame, [...byFrame.values()], options.minGapSec)) return

    byFrame.set(frame.frame, { ...frame, selectionReason })
    if (frame.coverageGroup) usedCoverageGroups.add(frame.coverageGroup)
  }

  for (const frame of normalized.filter((item) => item.mustKeep).sort(byTime)) {
    add(frame, "Обязательный кадр из visual analysis.", false)
  }

  for (const role of options.preferRoles) {
    const best = normalized
      .filter((item) => item.storyRole === role)
      .sort((a, b) => score(b) - score(a))[0]

    if (best) add(best, `Покрытие роли фотоотчёта: ${role}.`)
  }

  const requiredEventIds = new Set(
    events
      .filter((event) => event.requiresKeyframe || event.importance === "high")
      .map((event, index) => event.id ?? `event_${String(index + 1).padStart(3, "0")}`),
  )

  for (const eventId of requiredEventIds) {
    const best = normalized
      .filter((item) => item.coveredEventIds?.includes(eventId))
      .sort((a, b) => score(b) - score(a))[0]

    if (best) add(best, `Кадр покрывает важное событие: ${eventId}.`)
  }

  const timelineCoverage = pickTimelineCoverage(normalized, Math.min(options.max, 12))
  for (const frame of timelineCoverage) {
    add(frame, "Равномерное покрытие таймлайна.")
  }

  for (const frame of normalized.sort((a, b) => score(b) - score(a))) {
    if (byFrame.size >= options.max) break
    add(frame, "Добор сильных кадров без дублей.")
  }

  const selected = [...byFrame.values()].sort(byTime)

  if (selected.length <= options.max) return selected

  const mustKeep = selected.filter((item) => item.mustKeep)
  const optional = selected.filter((item) => !item.mustKeep)

  return [...mustKeep, ...optional.slice(0, Math.max(0, options.max - mustKeep.length))].sort(byTime)
}

function normalizeCandidates(candidates: QwenKeyframe[]): SelectedFrame[] {
  const seen = new Map<string, SelectedFrame>()

  for (const candidate of candidates) {
    if (!candidate.frame) continue

    const timeSec = typeof candidate.timeSec === "number"
      ? candidate.timeSec
      : timecodeToSec(candidate.timecode)

    const item: SelectedFrame = {
      ...candidate,
      timeSec,
      selectionReason: "",
      importance: candidate.importance ?? "medium",
      noveltyScore: candidate.noveltyScore ?? 0.5,
    }

    const previous = seen.get(item.frame)
    if (!previous || score(item) > score(previous)) {
      seen.set(item.frame, item)
    }
  }

  return [...seen.values()]
}

function pickTimelineCoverage(candidates: SelectedFrame[], targetCount: number): SelectedFrame[] {
  if (candidates.length === 0 || targetCount <= 0) return []

  const sorted = [...candidates].sort(byTime)
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!

  if (targetCount === 1) return [first]

  const result: SelectedFrame[] = [first]
  const min = first.timeSec
  const max = last.timeSec
  const span = Math.max(1, max - min)

  for (let i = 1; i < targetCount - 1; i++) {
    const target = min + (span * i) / (targetCount - 1)
    const nearest = sorted
      .filter((item) => !result.some((selected) => selected.frame === item.frame))
      .sort((a, b) => Math.abs(a.timeSec - target) - Math.abs(b.timeSec - target))[0]

    if (nearest) result.push(nearest)
  }

  if (!result.some((item) => item.frame === last.frame)) result.push(last)

  return result
}

function isTooClose(frame: SelectedFrame, selected: SelectedFrame[], minGapSec: number): boolean {
  if (minGapSec <= 0) return false
  return selected.some((item) => Math.abs(item.timeSec - frame.timeSec) < minGapSec)
}

function score(frame: SelectedFrame): number {
  const importance = frame.importance === "high" ? 30 : frame.importance === "medium" ? 20 : 10
  const novelty = Math.round((frame.noveltyScore ?? 0.5) * 10)
  const must = frame.mustKeep ? 100 : 0
  const role = frame.storyRole ? DEFAULT_ROLE_ORDER.length - DEFAULT_ROLE_ORDER.indexOf(frame.storyRole) : 0

  return must + importance + novelty + role
}

function byTime(a: SelectedFrame, b: SelectedFrame): number {
  return a.timeSec - b.timeSec
}

function parseRoles(value: string): StoryRole[] {
  const roles = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as StoryRole[]

  return roles.length > 0 ? roles : DEFAULT_ROLE_ORDER
}

function timecodeToSec(value: string): number {
  const parts = value.split(":").map(Number)
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
  }

  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return parts[0]! * 60 + parts[1]!
  }

  return 0
}

function renderKeyframes(frames: SelectedFrame[]): string {
  const lines = ["# Фотоотчёт ключевых кадров", ""]

  lines.push(
    "Это не набор красивых thumbnails, а доказательная лента разработки: кадры выбраны так, чтобы покрыть ход работы без лишних повторов.",
    "",
  )

  for (const frame of frames) {
    lines.push(`## ${frame.timecode} · ${frame.frame}`)
    lines.push("")
    lines.push(`![${frame.timecode}](images/${basename(frame.frame)})`)
    lines.push("")
    lines.push(`**Почему важен:** ${frame.reason}`)
    lines.push("")
    lines.push(`**Почему выбран:** ${frame.selectionReason}`)
    lines.push("")
    if (frame.storyRole) lines.push(`**Роль в фотоотчёте:** ${frame.storyRole}`, "")
    if (frame.coverageGroup) lines.push(`**Группа покрытия:** ${frame.coverageGroup}`, "")
    if (frame.importance) lines.push(`**Важность:** ${frame.importance}`, "")
    if (typeof frame.noveltyScore === "number") lines.push(`**Новизна:** ${frame.noveltyScore}`, "")
    if (frame.coveredEventIds?.length) lines.push(`**Покрытые события:** ${frame.coveredEventIds.join(", ")}`, "")
  }

  return `${lines.join("\n")}\n`
}
