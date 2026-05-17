export function timecode(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  return `${pad(m)}:${pad(s)}`
}

export function safeTimecodeForFile(sec: number): string {
  return timecode(sec).replace(/:/g, "-")
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}
