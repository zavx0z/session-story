export type ParsedArgs = {
  command: string
  positional: string[]
  flags: Record<string, string | boolean>
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]

    if (!arg.startsWith("--")) {
      positional.push(arg)
      continue
    }

    const key = arg.slice(2)
    const next = rest[i + 1]

    if (!next || next.startsWith("--")) {
      flags[key] = true
      continue
    }

    flags[key] = next
    i++
  }

  return { command, positional, flags }
}

export function numberFlag(flags: Record<string, string | boolean>, name: string, fallback: number): number {
  const value = flags[name]
  if (typeof value !== "string") return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --${name}: ${value}`)
  }

  return parsed
}

export function stringFlag(flags: Record<string, string | boolean>, name: string, fallback: string): string {
  const value = flags[name]
  return typeof value === "string" ? value : fallback
}
