import matter from "gray-matter";

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
 * Extract the description from a template's frontmatter
 */
export async function getTemplateDescription(name: string): Promise<string> {
  const raw = await loadAgentTemplate(name);
  const { data } = matter(raw);
  return (data.description as string) || "";
}
