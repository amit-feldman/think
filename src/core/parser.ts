import matter from "gray-matter";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export interface ParsedFile {
  frontmatter: Record<string, unknown>;
  content: string;
  raw: string;
}

/**
 * Parse a markdown file with YAML frontmatter
 */
export async function parseMarkdown(filePath: string): Promise<ParsedFile | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = await readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      frontmatter: data,
      content: content.trim(),
      raw,
    };
  } catch {
    // If YAML parsing fails, return file as content-only
    const raw = await readFile(filePath, "utf-8");
    return {
      frontmatter: {},
      content: raw.trim(),
      raw,
    };
  }
}

/**
 * Write a markdown file with YAML frontmatter
 */
export async function writeMarkdown(
  filePath: string,
  content: string,
  frontmatter?: Record<string, unknown>
): Promise<void> {
  let output: string;

  if (frontmatter && Object.keys(frontmatter).length > 0) {
    output = matter.stringify(content, frontmatter);
  } else {
    output = content;
  }

  await writeFile(filePath, output, "utf-8");
}

/**
 * Append content to a markdown file
 */
export async function appendToMarkdown(
  filePath: string,
  newContent: string
): Promise<void> {
  const existing = await parseMarkdown(filePath);

  if (existing) {
    const updated = existing.content
      ? `${existing.content}\n\n${newContent}`
      : newContent;
    await writeMarkdown(filePath, updated, existing.frontmatter);
  } else {
    await writeFile(filePath, newContent, "utf-8");
  }
}
