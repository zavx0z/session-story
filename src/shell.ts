export async function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; allowFailure?: boolean } = {},
): Promise<string> {
  const proc = Bun.spawn([command, ...args], {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = await proc.exited

  if (code !== 0 && !options.allowFailure) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        `Exit code: ${code}`,
        stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    )
  }

  return stdout.trim()
}

export async function assertCliExists(name: string): Promise<void> {
  await runCommand("which", [name])
}

export async function ffprobeDurationSec(file: string): Promise<number> {
  const out = await runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ])

  const value = Number(out)

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Cannot read duration from ${file}: ${out}`)
  }

  return value
}
