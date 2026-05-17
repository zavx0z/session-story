import { mkdir, readdir, copyFile as nodeCopyFile } from "node:fs/promises"
import { join } from "node:path"

export async function handoff(workdir: string): Promise<void> {
  const out = join(workdir, "gpt-handoff")

  await mkdir(out, { recursive: true })
  await mkdir(join(out, "keyframes"), { recursive: true })

  await nodeCopyFile(join(workdir, "timeline", "full-timeline.md"), join(out, "full-timeline.md"))
  await nodeCopyFile(join(workdir, "keyframes", "keyframes.md"), join(out, "keyframes.md"))

  const keyframeImagesDir = join(workdir, "keyframes", "images")
  const images = await readdir(keyframeImagesDir).catch(() => [])

  for (const image of images.filter((file) => file.endsWith(".png"))) {
    await nodeCopyFile(join(keyframeImagesDir, image), join(out, "keyframes", image))
  }

  await Bun.write(join(out, "prompt.md"), gptPrompt())

  console.log(`Пакет для GPT подготовлен: ${out}`)
}

function gptPrompt(): string {
  return `# Передача задачи GPT: Session Story

Ты получаешь:

1. полный фактический таймлайн от Qwen;
2. выбранные ключевые кадры;
3. контекст видео.

Задача:

- прочитай полный таймлайн;
- посмотри ключевые кадры;
- восстанови историю всего видео;
- напиши художественный дикторский текст;
- сделай текст понятным не разработчику;
- объясни, что внутри MetaFor строится интерпретатор, где человек и ИИ работают вместе;
- объясни, что в этом фрагменте улучшается UI интерпретатора;
- отметь, где видео можно ускорять;
- отметь, где экран нужно держать дольше;
- подготовь финальную дикторку под заданную длительность.

Разделение ролей:

Qwen сделал фактический визуальный разбор.  
GPT должен сделать смысловую сборку, дикторку и драматургию.

Главная мысль:

MetaFor становится интерпретатором, где человек и ИИ вместе работают с кодом.  
Видео показывает один этап: UI этого интерпретатора улучшается и становится цельнее.

Не зацикливайся на отдельных именах файлов, если они не важны для зрителя.
Фокус — на человеко-AI рабочем процессе.
`
}
