export async function writeJson(path: string, value: unknown): Promise<void> {
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`)
}

export async function readJson<T>(path: string): Promise<T> {
  const text = await Bun.file(path).text()

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${(error as Error).message}`)
  }
}

export async function copyFile(from: string, to: string): Promise<void> {
  await Bun.write(to, Bun.file(from))
}

export async function exists(path: string): Promise<boolean> {
  return await Bun.file(path).exists()
}
