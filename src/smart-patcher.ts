export type SmartPatch =
  | {
      file: string
      action: "create" | "overwrite"
      replace: string
    }
  | {
      file: string
      action: "replace"
      search: string
      replace: string
    }
  | {
      file: string
      action: "delete"
      search: string
    }

export function applySmartPatch(content: string, patch: SmartPatch): string {
  if (patch.action === "create" || patch.action === "overwrite") {
    return patch.replace
  }

  if (patch.action === "replace") {
    const range = findBlock(content, patch.search)
    if (!range) {
      throw new Error(`Block not found in ${patch.file}`)
    }

    return content.slice(0, range.start) + patch.replace + content.slice(range.end)
  }

  if (patch.action === "delete") {
    const range = findBlock(content, patch.search)
    if (!range) {
      throw new Error(`Block not found in ${patch.file}`)
    }

    return content.slice(0, range.start) + content.slice(range.end)
  }

  const _never: never = patch
  throw new Error(`Unsupported patch: ${JSON.stringify(_never)}`)
}

function findBlock(content: string, search: string): { start: number; end: number } | null {
  const exact = content.indexOf(search)

  if (exact !== -1) {
    return {
      start: exact,
      end: exact + search.length,
    }
  }

  return findFuzzyBlock(content, search)
}

function findFuzzyBlock(content: string, search: string): { start: number; end: number } | null {
  const searchLines = search.split(/\r?\n/)
  const contentLines = splitWithOffsets(content)

  for (let startLine = 0; startLine < contentLines.length; startLine++) {
    for (let lineCount = 1; lineCount <= searchLines.length + 2; lineCount++) {
      const slice = contentLines.slice(startLine, startLine + lineCount)
      if (slice.length === 0) continue

      const candidate = slice.map((line) => line.text).join("\n")

      if (normalizeText(candidate) === normalizeText(search)) {
        return {
          start: slice[0].start,
          end: slice[slice.length - 1].end,
        }
      }
    }
  }

  return null
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function splitWithOffsets(content: string): Array<{ text: string; start: number; end: number }> {
  const result: Array<{ text: string; start: number; end: number }> = []
  const re = /.*(?:\r?\n|$)/g

  for (const match of content.matchAll(re)) {
    const text = match[0]
    if (text === "") continue

    const start = match.index ?? 0
    const end = start + text.length

    result.push({ text: stripTrailingNewline(text), start, end })
  }

  return result
}

function stripTrailingNewline(value: string): string {
  return value.replace(/\r?\n$/, "")
}
