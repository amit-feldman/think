import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import matter from "gray-matter";

const TEMPLATES_DIR = join(dirname(import.meta.dir), "templates", "agents");

/**
 * List available agent template names (without .md extension)
 */
export async function listAgentTemplates(): Promise<string[]> {
  const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name.replace(".md", ""))
    .sort();
}

/**
 * Load the full content of an agent template
 */
export async function loadAgentTemplate(name: string): Promise<string> {
  return readFile(join(TEMPLATES_DIR, `${name}.md`), "utf-8");
}

/**
 * Extract the description from a template's frontmatter
 */
export async function getTemplateDescription(name: string): Promise<string> {
  const raw = await loadAgentTemplate(name);
  const { data } = matter(raw);
  return (data.description as string) || "";
}
