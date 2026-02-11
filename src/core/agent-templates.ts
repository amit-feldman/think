import * as GrayMatter from "gray-matter";
const matter: any = (GrayMatter as any).default ?? (GrayMatter as any);

// Inline templates so esbuild bundles them as strings (no filesystem reads)
import backendMd from "../templates/agents/backend.md";
import frontendMd from "../templates/agents/frontend.md";
import reviewerMd from "../templates/agents/reviewer.md";
import testerMd from "../templates/agents/tester.md";

const TEMPLATES: Record<string, string> = {
  backend: backendMd,
  frontend: frontendMd,
  reviewer: reviewerMd,
  tester: testerMd,
};

/**
 * List available agent template names
 */
export async function listAgentTemplates(): Promise<string[]> {
  return Object.keys(TEMPLATES).sort();
}

/**
 * Load the full content of an agent template
 */
export async function loadAgentTemplate(name: string): Promise<string> {
  const content = TEMPLATES[name];
  if (!content) throw new Error(`Unknown agent template: ${name}`);
  return content;
}

/**
 * Parse description from raw template content.
 * Tries gray-matter first, then YAML regex scan, then HTML-stripped regex.
 */
export function extractDescription(raw: string): string {
  try {
    const { data } = matter(raw);
    if (data && typeof data.description === "string" && data.description.trim()) {
      return String(data.description).trim();
    }
  } catch {}
  // Fallback 1: naive YAML-like scan in plain text
  const fmMatch = raw.match(/---[\s\S]*?---/);
  if (fmMatch) {
    const descLine = fmMatch[0]
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.toLowerCase().startsWith("description:"));
    if (descLine) return descLine.split(":").slice(1).join(":").trim();
  }
  // Fallback 2: strip HTML tags and look for `description:` key
  const stripped = raw.replace(/<[^>]*>/g, "");
  const m = stripped.match(/(?:^|\n)\s*description:\s*(.+)/i);
  if (m && m[1]) return m[1].trim();
  return "";
}

/**
 * Extract the description from a template's frontmatter
 */
export async function getTemplateDescription(name: string): Promise<string> {
  const raw = await loadAgentTemplate(name);
  return extractDescription(raw);
}
