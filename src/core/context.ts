import { readFile, readdir, mkdir, writeFile as fsWriteFile } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, dirname, basename, extname } from "path";
import { loadContextConfig } from "./project-config.ts";
import { detectProject } from "./project-detect.ts";
import { generateAdaptiveTree, DEFAULT_IGNORE } from "./file-tree.ts";
import { extractFileSignatures } from "./extractor.ts";
import { allocateBudget, redistributeSurplus } from "./budget.ts";
import { estimateTokens, getProjectClaudeMdPath } from "./config.ts";
import { sanitizeMarkdownHeading, sanitizeCodeBlock, isPathWithin } from "./security.ts";
import type { ContextConfig } from "./project-config.ts";
import type { FileSignatures } from "./extractor.ts";
import type { ProjectInfo } from "./project-detect.ts";

export interface ContextSection {
  id: string;
  title: string;
  content: string;
  tokens: number;
  priority: number;
}

export interface ContextResult {
  markdown: string;
  totalTokens: number;
  sections: ContextSection[];
  truncated: string[];
}

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

const BATCH_SIZE = 20;

/**
 * Match a file path against a list of glob patterns (simple glob: * matches anything).
 */
function matchesGlob(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/\./g, "\\.")
          .replace(/\*\*/g, "§§")
          .replace(/\*/g, "[^/]*")
          .replace(/§§/g, ".*") +
        "$"
    );
    if (regex.test(filePath)) return true;
  }
  return false;
}

/**
 * Walk a directory recursively, respecting ignore patterns.
 * Returns relative paths from rootDir.
 */
async function walkDir(
  dir: string,
  rootDir: string,
  ignorePatterns: string[],
  maxDepth: number = 20
): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (shouldIgnore(entry.name, ignorePatterns)) continue;

      const fullPath = join(currentDir, entry.name);
      const relPath = relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else {
        results.push(relPath);
      }
    }
  }

  await walk(dir, 0);
  return results;
}

function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  for (const pattern of ignorePatterns) {
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      if (regex.test(name)) return true;
    } else if (name === pattern) {
      return true;
    }
  }
  return false;
}

/**
 * Determine priority for a source file based on its path.
 */
function filePriority(relPath: string): number {
  const name = basename(relPath);
  const dir = dirname(relPath);
  const depth = relPath.split("/").length;

  // Entry points
  if (
    name === "index.ts" ||
    name === "index.tsx" ||
    name === "index.js" ||
    name === "main.ts" ||
    name === "main.tsx" ||
    name === "main.js" ||
    name === "mod.ts" ||
    dir.startsWith("bin") ||
    dir.includes("/bin/") ||
    name.startsWith("bin.")
  ) {
    return 10;
  }

  // Type definition files
  if (name === "types.ts" || name.endsWith(".d.ts") || name === "typings.ts") {
    return 8;
  }

  // Config/schema files
  if (
    name === "config.ts" ||
    name === "schema.ts" ||
    name === "constants.ts" ||
    name === "env.ts"
  ) {
    return 7;
  }

  // Shallower files get higher priority (base: 5, reduced by depth)
  const depthBonus = Math.max(0, 5 - depth);
  return 3 + depthBonus * 0.5;
}

/**
 * Build the overview section content.
 */
function buildOverview(project: ProjectInfo): string {
  const lines: string[] = [];

  if (project.description) {
    lines.push(sanitizeMarkdownHeading(project.description));
    lines.push("");
  }

  lines.push(`- **Runtime**: ${project.runtime}`);

  if (project.frameworks.length > 0) {
    lines.push(`- **Frameworks**: ${project.frameworks.join(", ")}`);
  }
  if (project.tooling.length > 0) {
    lines.push(`- **Tooling**: ${project.tooling.join(", ")}`);
  }

  if (project.monorepo) {
    lines.push(`- **Monorepo**: ${project.monorepo.tool}`);
    lines.push(`- **Workspaces**:`);
    for (const ws of project.monorepo.workspaces) {
      let wsLine = `  - \`${ws.path}\``;
      if (ws.name !== basename(ws.path)) wsLine += ` (${ws.name})`;
      if (ws.type) wsLine += ` [${ws.type}]`;
      if (ws.description) wsLine += ` — ${ws.description}`;
      lines.push(wsLine);
    }
  }

  return lines.join("\n");
}

/**
 * Build the key files section content.
 */
async function buildKeyFiles(
  projectDir: string,
  config: ContextConfig,
  allFiles: string[],
  budget: number
): Promise<{ content: string; tokens: number }> {
  if (config.key_files.length === 0) {
    return { content: "", tokens: 0 };
  }

  const matchedFiles = allFiles.filter((f) => matchesGlob(f, config.key_files));
  const parts: string[] = [];
  let totalTokens = 0;

  for (const relPath of matchedFiles) {
    try {
      const content = await readFile(join(projectDir, relPath), "utf-8");
      const tokens = estimateTokens(content);

      if (totalTokens + tokens > budget) {
        // Truncate this file to fit
        const remaining = budget - totalTokens;
        if (remaining > 100) {
          const truncated = content.slice(0, remaining * 4);
          parts.push(`### ${relPath}\n\n\`\`\`\n${truncated}\n...(truncated)\n\`\`\``);
          totalTokens += remaining;
        }
        break;
      }

      const ext = extname(relPath).slice(1);
      parts.push(`### ${relPath}\n\n\`\`\`${ext}\n${sanitizeCodeBlock(content)}\n\`\`\``);
      totalTokens += tokens;
    } catch {
      // Skip unreadable files
    }
  }

  return { content: parts.join("\n\n"), tokens: totalTokens };
}

/**
 * Build the code map section from extracted signatures.
 */
function buildCodeMap(
  fileSignatures: FileSignatures[],
  config: ContextConfig,
  budget: number
): { content: string; tokens: number; truncatedFiles: string[] } {
  // Sort by priority (highest first)
  const prioritized = fileSignatures
    .map((fs) => ({
      ...fs,
      priority: filePriority(fs.path),
    }))
    .sort((a, b) => b.priority - a.priority);

  const parts: string[] = [];
  let totalTokens = 0;
  const truncatedFiles: string[] = [];
  const exportsOnly = config.signature_depth === "exports";

  for (const file of prioritized) {
    const sigs = exportsOnly
      ? file.signatures.filter((s) => s.exported)
      : file.signatures;

    if (sigs.length === 0) continue;

    const sigBlock = sanitizeCodeBlock(sigs.map((s) => s.signature).join("\n"));
    const entry = `### ${file.path}\n\`\`\`${file.language}\n${sigBlock}\n\`\`\``;
    const entryTokens = estimateTokens(entry);

    if (totalTokens + entryTokens > budget) {
      truncatedFiles.push(file.path);
      continue;
    }

    parts.push(entry);
    totalTokens += entryTokens;
  }

  return { content: parts.join("\n\n"), tokens: totalTokens, truncatedFiles };
}

/**
 * Build the knowledge section from .think/knowledge/*.md files.
 */
async function buildKnowledge(
  projectDir: string,
  knowledgeDir: string,
  budget: number
): Promise<{ content: string; tokens: number }> {
  const dirPath = join(projectDir, knowledgeDir);
  // Validate knowledge dir stays within project
  if (!isPathWithin(projectDir, dirPath) || !existsSync(dirPath)) {
    return { content: "", tokens: 0 };
  }

  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return { content: "", tokens: 0 };
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const parts: string[] = [];
  let totalTokens = 0;

  for (const file of mdFiles) {
    try {
      const content = await readFile(join(dirPath, file.name), "utf-8");
      const tokens = estimateTokens(content);

      if (totalTokens + tokens > budget) break;

      const title = file.name.replace(/\.md$/, "");
      parts.push(`### ${title}\n\n${content.trim()}`);
      totalTokens += tokens;
    } catch {
      // Skip unreadable
    }
  }

  return { content: parts.join("\n\n"), tokens: totalTokens };
}

/**
 * Truncate content to fit within a token budget.
 */
function truncateToFit(content: string, budget: number): string {
  const tokens = estimateTokens(content);
  if (tokens <= budget) return content;
  // Rough truncation by character count
  const maxChars = budget * 4;
  return content.slice(0, maxChars) + "\n...(truncated)";
}

/**
 * Generate project context CLAUDE.md from source analysis.
 */
export async function generateProjectContext(
  projectDir: string,
  options?: { budget?: number; force?: boolean; dryRun?: boolean }
): Promise<ContextResult> {
  const config = await loadContextConfig(projectDir);
  const project = await detectProject(projectDir);
  const totalBudget = options?.budget ?? config.budget;
  const truncated: string[] = [];

  // Allocate budget
  let allocation = allocateBudget(totalBudget);

  // Walk project for all files
  const allFiles = await walkDir(projectDir, projectDir, DEFAULT_IGNORE);
  const sourceFiles = allFiles.filter((f) => {
    const ext = extname(f);
    if (!SOURCE_EXTENSIONS.has(ext)) return false;
    if (matchesGlob(f, config.exclude_signatures)) return false;
    return true;
  });

  // Extract signatures in parallel batches
  const allSignatures: FileSignatures[] = [];
  for (let i = 0; i < sourceFiles.length; i += BATCH_SIZE) {
    const batch = sourceFiles.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((f) => extractFileSignatures(join(projectDir, f), projectDir))
    );
    for (const result of results) {
      if (result && result.signatures.length > 0) {
        allSignatures.push(result);
      }
    }
  }

  // Significant paths for adaptive tree
  const significantPaths = new Set<string>();
  for (const fs of allSignatures) {
    significantPaths.add(fs.path);
  }
  for (const f of allFiles) {
    if (matchesGlob(f, config.key_files)) {
      significantPaths.add(f);
    }
  }

  // Build each section
  const overviewContent = buildOverview(project);
  const overviewTokens = estimateTokens(overviewContent);

  const treeContent = await generateAdaptiveTree(projectDir, {
    budgetTokens: allocation.structure,
    significantPaths,
  });
  const structureTokens = estimateTokens(treeContent);

  const keyFilesResult = await buildKeyFiles(
    projectDir,
    config,
    allFiles,
    allocation.keyFiles
  );

  const codeMapResult = buildCodeMap(allSignatures, config, allocation.codeMap);
  truncated.push(...codeMapResult.truncatedFiles);

  const knowledgeResult = await buildKnowledge(
    projectDir,
    config.knowledge_dir,
    allocation.knowledge
  );

  // Redistribute surplus
  const used: Record<string, number> = {
    overview: overviewTokens,
    structure: structureTokens,
    keyFiles: keyFilesResult.tokens,
    codeMap: codeMapResult.tokens,
    knowledge: knowledgeResult.tokens,
  };

  allocation = redistributeSurplus(allocation, used);

  // Re-check if sections need truncation after redistribution
  const sections: ContextSection[] = [];

  sections.push({
    id: "overview",
    title: "Overview",
    content: truncateToFit(overviewContent, allocation.overview),
    tokens: Math.min(overviewTokens, allocation.overview),
    priority: 10,
  });

  sections.push({
    id: "structure",
    title: "Structure",
    content: truncateToFit(treeContent, allocation.structure),
    tokens: Math.min(structureTokens, allocation.structure),
    priority: 9,
  });

  if (keyFilesResult.content) {
    sections.push({
      id: "keyFiles",
      title: "Key Files",
      content: truncateToFit(keyFilesResult.content, allocation.keyFiles),
      tokens: Math.min(keyFilesResult.tokens, allocation.keyFiles),
      priority: 8,
    });
  }

  if (codeMapResult.content) {
    sections.push({
      id: "codeMap",
      title: "Code Map",
      content: truncateToFit(codeMapResult.content, allocation.codeMap),
      tokens: Math.min(codeMapResult.tokens, allocation.codeMap),
      priority: 7,
    });
  }

  if (knowledgeResult.content) {
    sections.push({
      id: "knowledge",
      title: "Knowledge",
      content: truncateToFit(knowledgeResult.content, allocation.knowledge),
      tokens: Math.min(knowledgeResult.tokens, allocation.knowledge),
      priority: 5,
    });
  }

  // Assemble markdown
  const mdParts: string[] = [];
  mdParts.push(`# ${sanitizeMarkdownHeading(project.name)}\n`);
  mdParts.push("> Generated by `think context` — regenerate with `think context`\n");

  for (const section of sections) {
    if (!section.content) continue;

    mdParts.push(`## ${section.title}\n`);
    if (section.id === "structure") {
      mdParts.push("```\n" + section.content + "\n```\n");
    } else {
      mdParts.push(section.content + "\n");
    }
  }

  const markdown = mdParts.join("\n");
  const totalTokens = estimateTokens(markdown);

  // Write output unless dry run
  if (!options?.dryRun) {
    const outputPath = getProjectClaudeMdPath(projectDir);
    await mkdir(dirname(outputPath), { recursive: true });
    await fsWriteFile(outputPath, markdown, "utf-8");
  }

  return {
    markdown,
    totalTokens,
    sections,
    truncated,
  };
}
