import { describe, expect, test } from "bun:test";
import { parseMarkdown, writeMarkdown, appendToMarkdown } from "./parser.ts";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("parseMarkdown", () => {
  const tmpDir = join(tmpdir(), "think-test-parser-" + Date.now());

  test("returns null for non-existent file", async () => {
    const result = await parseMarkdown("/nonexistent/file.md");
    expect(result).toBeNull();
  });

  test("parses file with frontmatter", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "with-fm.md");
    await writeFile(
      filePath,
      `---
name: Test
role: dev
---

# Content

Some text here.`
    );

    const result = await parseMarkdown(filePath);
    expect(result).not.toBeNull();
    expect(result!.frontmatter.name).toBe("Test");
    expect(result!.frontmatter.role).toBe("dev");
    expect(result!.content).toContain("# Content");
    expect(result!.raw).toContain("---");
    await rm(tmpDir, { recursive: true });
  });

  test("parses file without frontmatter", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "no-fm.md");
    await writeFile(filePath, "# Just content\n\nNo frontmatter here.");

    const result = await parseMarkdown(filePath);
    expect(result).not.toBeNull();
    expect(Object.keys(result!.frontmatter).length).toBe(0);
    expect(result!.content).toContain("Just content");
    await rm(tmpDir, { recursive: true });
  });

  test("handles malformed frontmatter gracefully", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "bad-fm.md");
    await writeFile(filePath, "---\n{{{invalid yaml}}}\n---\nContent");

    const result = await parseMarkdown(filePath);
    expect(result).not.toBeNull();
    // Should fall back to content-only
    expect(result!.content).toBeTruthy();
    await rm(tmpDir, { recursive: true });
  });

  test("falls back to content-only when matter() throws (YAML directive)", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "throws-fm.md");
    // %invalid causes gray-matter to throw: "directives end mark is expected"
    await writeFile(filePath, "---\n%invalid\n---\nContent after bad directive");

    const result = await parseMarkdown(filePath);
    expect(result).not.toBeNull();
    expect(result!.frontmatter).toEqual({});
    expect(result!.content).toContain("Content after bad directive");
    expect(result!.raw).toBeTruthy();
    await rm(tmpDir, { recursive: true });
  });

  test("falls back to content-only when matter() throws (NUL byte)", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "nul-fm.md");
    // NUL byte in frontmatter causes gray-matter to throw
    await writeFile(filePath, "---\n\x00\n---\nContent");

    const result = await parseMarkdown(filePath);
    expect(result).not.toBeNull();
    expect(result!.frontmatter).toEqual({});
    expect(result!.content).toBeTruthy();
    await rm(tmpDir, { recursive: true });
  });
});

describe("writeMarkdown", () => {
  const tmpDir = join(tmpdir(), "think-test-write-" + Date.now());

  test("writes content with frontmatter", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "output.md");
    await writeMarkdown(filePath, "Hello world", { name: "Test", value: 42 });

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("name: Test");
    expect(content).toContain("value: 42");
    expect(content).toContain("Hello world");
    await rm(tmpDir, { recursive: true });
  });

  test("writes content without frontmatter", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "no-fm.md");
    await writeMarkdown(filePath, "Just text");

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("Just text");
    await rm(tmpDir, { recursive: true });
  });

  test("writes content with empty frontmatter", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "empty-fm.md");
    await writeMarkdown(filePath, "Just text", {});

    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("Just text");
    await rm(tmpDir, { recursive: true });
  });
});

describe("appendToMarkdown", () => {
  const tmpDir = join(tmpdir(), "think-test-append-" + Date.now());

  test("appends to existing file", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "existing.md");
    await writeFile(
      filePath,
      `---
name: Test
---

Existing content`
    );

    await appendToMarkdown(filePath, "New content");
    const result = await parseMarkdown(filePath);
    expect(result!.content).toContain("Existing content");
    expect(result!.content).toContain("New content");
    expect(result!.frontmatter.name).toBe("Test");
    await rm(tmpDir, { recursive: true });
  });

  test("creates new file if doesn't exist", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "new.md");

    await appendToMarkdown(filePath, "Brand new");
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("Brand new");
    await rm(tmpDir, { recursive: true });
  });

  test("appends to file with empty content", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "empty.md");
    await writeFile(filePath, "---\nname: Test\n---\n");

    await appendToMarkdown(filePath, "Added content");
    const result = await parseMarkdown(filePath);
    expect(result!.content).toContain("Added content");
    await rm(tmpDir, { recursive: true });
  });
});
