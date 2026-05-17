import { mkdir, readdir, copyFile as nodeCopyFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { exists } from "./fs"

export async function handoff(workdir: string): Promise<void> {
  const out = join(workdir, "gpt-handoff")

  await mkdir(out, { recursive: true })
  await mkdir(join(out, "keyframes"), { recursive: true })
  await mkdir(join(out, "publish"), { recursive: true })

  await copyIfExists(join(workdir, "timeline", "full-timeline.md"), join(out, "full-timeline.md"))
  await copyIfExists(join(workdir, "timeline", "full-timeline.json"), join(out, "full-timeline.json"))
  await copyIfExists(join(workdir, "keyframes", "keyframes.md"), join(out, "keyframes.md"))
  await copyIfExists(join(workdir, "keyframes", "keyframes.json"), join(out, "keyframes.json"))
  await copyIfExists(join(workdir, "story", "chapters.json"), join(out, "chapters.json"))
  await copyIfExists(join(workdir, "story", "facts.md"), join(out, "facts.md"))
  await copyIfExists(join(workdir, "story", "editorial-brief.md"), join(out, "editorial-brief.md"))
  await copyIfExists(join(workdir, "codex-session.jsonl"), join(out, "codex-session.jsonl"))
  await copyIfExists(join(workdir, "codex-summary.md"), join(out, "codex-summary.md"))

  const keyframeImagesDir = join(workdir, "keyframes", "images")
  const images = await readdir(keyframeImagesDir).catch(() => [])

  for (const image of images.filter((file) => file.endsWith(".png"))) {
    await nodeCopyFile(join(keyframeImagesDir, image), join(out, "keyframes", basename(image)))
  }

  await Bun.write(join(out, "prompt.md"), gptPrompt())

  console.log(`Пакет для GPT подготовлен: ${out}`)
}

async function copyIfExists(from: string, to: string): Promise<void> {
  if (await exists(from)) {
    await nodeCopyFile(from, to)
  }
}

function gptPrompt(): string {
  return `# Передача задачи GPT: Session Story

Ты получаешь пакет рабочей AI-сессии:

1. полный фактический таймлайн от Qwen/GPT Mini;
2. фотоотчёт ключевых кадров;
3. главы и editorial brief;
4. Codex session export или summary, если они приложены.

Задача:

- прочитай полный таймлайн;
- посмотри ключевые кадры как фотоотчёт, а не как случайные thumbnails;
- восстанови историю всего видео;
- сопоставь видимые кадры с Codex session, если она приложена;
- напиши художественный дикторский текст на русском;
- напиши английскую версию дикторского текста;
- сделай текст понятным не разработчику;
- подготовь короткую новость для блога;
- подготовь описание видео;
- подготовь монтажный план;
- отметь, где видео можно ускорять;
- отметь, где экран нужно держать дольше;
- не фантазируй сверх фактов timeline/Codex.

Разделение ролей:

Qwen/GPT Mini сделал фактический визуальный разбор.
Фотоотчёт показывает доказательные ключевые состояния.
Codex session содержит смысл разработки и решения.
GPT Thinking должен сделать смысловую сборку, дикторку, драматургию и публикационный текст.

Главная мысль:

MetaFor становится интерпретатором, где человек и ИИ вместе работают с кодом.
Видео показывает реальный этап разработки: человек задаёт направление, агент действует внутри проекта, интерфейс и инструменты постепенно превращаются в живую рабочую среду.

Выходы подготовь в структуре:

## RU voiceover
## EN voiceover
## Blog news RU
## Blog news EN
## Video description
## Editing plan
## Keyframe usage notes

Не зацикливайся на отдельных именах файлов, если они не важны для зрителя.
Фокус — на человеко-AI рабочем процессе и понятном отчёте об обновлении.
`
}
