import { describe, expect, test } from "bun:test"
import { applySmartPatch } from "./smart-patcher"

describe("applySmartPatch", () => {
  describe("create/overwrite", () => {
    test("должен создавать новый контент для create", () => {
      const result = applySmartPatch("", {
        file: "file.ts",
        action: "create",
        replace: "export const value = 42",
      })

      expect(result).toBe("export const value = 42")
    })

    test("должен перезаписывать контент для overwrite", () => {
      const result = applySmartPatch("old content", {
        file: "file.ts",
        action: "overwrite",
        replace: "new content",
      })

      expect(result).toBe("new content")
    })
  })

  describe("replace", () => {
    test("должен заменять точное совпадение", () => {
      const content = `const old = 1
const keep = 2`

      const result = applySmartPatch(content, {
        file: "file.ts",
        action: "replace",
        search: "const old = 1",
        replace: "const newValue = 42",
      })

      expect(result).toContain("const newValue = 42")
      expect(result).toContain("const keep = 2")
    })

    test("должен заменять с fuzzy matching (игнорируя пробелы)", () => {
      const content = `  const   old   =   1
const keep = 2`

      const result = applySmartPatch(content, {
        file: "file.ts",
        action: "replace",
        search: "const old = 1",
        replace: "const newValue = 42",
      })

      expect(result).toContain("const newValue = 42")
    })

    test("должен заменять многострочный блок", () => {
      const content = `function test() {
  const a = 1
  const b = 2
  return a + b
}`

      const result = applySmartPatch(content, {
        file: "file.ts",
        action: "replace",
        search: `const a = 1
  const b = 2`,
        replace: `const a = 10
  const b = 20`,
      })

      expect(result).toContain("const a = 10")
      expect(result).toContain("const b = 20")
    })

    test("должен бросать ошибку если search не найден", () => {
      const content = `const keep = 1
const alsoKeep = 2`

      expect(() =>
        applySmartPatch(content, {
          file: "file.ts",
          action: "replace",
          search: "const notFound = 999",
          replace: "something",
        }),
      ).toThrow("Block not found")
    })
  })

  describe("delete", () => {
    test("должен удалять найденный блок", () => {
      const content = `const toDelete = 1
const keep = 2`

      const result = applySmartPatch(content, {
        file: "file.ts",
        action: "delete",
        search: "const toDelete = 1",
      })

      expect(result).not.toContain("const toDelete = 1")
      expect(result).toContain("const keep = 2")
    })
  })
})
