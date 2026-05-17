#!/usr/bin/env bun
import { parseArgs } from "./args"
import { handoff } from "./handoff"
import { keyframes } from "./keyframes"
import { merge } from "./merge"
import { prepare } from "./prepare"
import { summarize } from "./summarize"

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2))

  if (args.command === "prepare") {
    const input = args.positional[0]
    if (!input) {
      throw new Error("Usage: bun run prepare <video> [--target-frames 350] [--batch-size 12]")
    }

    await prepare(input, args.flags)
    return
  }

  if (args.command === "merge") {
    await merge(args.positional[0] ?? ".session-story")
    return
  }

  if (args.command === "summarize") {
    await summarize(args.positional[0] ?? ".session-story", args.flags)
    return
  }

  if (args.command === "keyframes") {
    await keyframes(args.positional[0] ?? ".session-story", args.flags)
    return
  }

  if (args.command === "handoff") {
    await handoff(args.positional[0] ?? ".session-story")
    return
  }

  console.log(`session-story

Команды:
  prepare <video> [--out .session-story] [--target-frames 350] [--batch-size 12]
  merge [workdir]
  summarize [workdir]
  keyframes [workdir] [--max 32] [--min-gap-sec 2] [--prefer-roles setup,visual_result,final_result]
  handoff [workdir]
`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
