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
import { generateAutoKnowledge } from "./knowledge-gen.ts";
import type { FileSignatures, SignatureEntry } from "./extractor.ts";
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

// Dynamic: decide supported extensions at runtime based on shipped grammars
import { getSupportedExtensions } from "./tree-sitter.ts";

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
 * Check if a file's signatures are mostly re-exports (barrel file).
 */
function isBarrelFile(signatures: SignatureEntry[]): boolean {
  if (signatures.length === 0) return false;
  const reExports = signatures.filter((s) => s.name.startsWith("re-export"));
  return reExports.length / signatures.length > 0.5;
}

/**
 * Determine priority for a source file based on its path and content.
 */
function filePriority(relPath: string, signatures?: SignatureEntry[]): number {
  const name = basename(relPath);
  const dir = dirname(relPath);
  const depth = relPath.split("/").length;

  // Barrel files (mostly re-exports) get low priority — they show what's available
  // but not how things work. Implementation files are more useful for context.
  if (signatures && isBarrelFile(signatures)) {
    return 1;
  }

  // Entry points
  if (
    // TS/JS
    name === "index.ts" || name === "index.tsx" || name === "index.js" ||
    name === "main.ts" || name === "main.tsx" || name === "main.js" ||
    name === "mod.ts" ||
    // Python
    name === "__main__.py" || name === "main.py" || name === "app.py" || name === "cli.py" ||
    // Go
    name === "main.go" || dir.startsWith("cmd/") || dir.includes("/cmd/") ||
    // Rust
    name === "main.rs" || name === "lib.rs" || name === "mod.rs" ||
    // Java
    name === "Main.java" || name === "Application.java" ||
    // C#
    name === "Program.cs" || name === "Startup.cs" ||
    // PHP
    name === "index.php" || name.toLowerCase() === "artisan" ||
    // Ruby
    dir.startsWith("bin") || dir.includes("/bin/") || name.startsWith("bin.")
  ) {
    return 10;
  }

  // Type definition files — deprioritized so implementation files surface first
  if (name === "types.ts" || name.endsWith(".d.ts") || name === "typings.ts") {
    return 3;
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

  // Implementation density bonus: files with more functions/classes rank higher
  let implBonus = 0;
  if (signatures && signatures.length > 0) {
    const implCount = signatures.filter(
      (s) => s.kind === "function" || s.kind === "class"
    ).length;
    const implDensity = implCount / signatures.length;
    implBonus = implDensity * 3;
  }

  // Shallower files get higher priority (base: 5, reduced by depth)
  const depthBonus = Math.max(0, 5 - depth);
  return 3 + depthBonus * 0.5 + implBonus;
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

  lines.push(`- Runtime: ${project.runtime}`);

  if (project.frameworks.length > 0) {
    lines.push(`- Frameworks: ${project.frameworks.join(", ")}`);
  }
  if (project.tooling.length > 0) {
    lines.push(`- Tooling: ${project.tooling.join(", ")}`);
  }

  if (project.monorepo) {
    lines.push(`- Monorepo: ${project.monorepo.tool}`);
    lines.push(`- Workspaces:`);
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
 * Collapse a verbose type/interface body to a one-liner: `export interface Foo { ... }`
 */
function collapseBody(signature: string): string {
  const braceIdx = signature.indexOf("{");
  if (braceIdx === -1) return signature;
  return signature.slice(0, braceIdx).trimEnd() + " { ... }";
}

/**
 * Signature value for sorting: functions/classes are most valuable,
 * then consts/enums, then types/interfaces.
 */
function signatureValue(kind: SignatureEntry["kind"]): number {
  if (kind === "function" || kind === "class") return 3;
  if (kind === "const" || kind === "enum") return 2;
  return 1; // type, interface
}

/**
 * Trim a file's signatures to fit within a token cap.
 * Keeps highest-value signatures, collapses verbose type bodies.
 */
function trimSignatures(
  sigs: SignatureEntry[],
  cap: number,
  filePath: string,
  language: string,
  useSkeleton: boolean
): string {
  // Sort by value descending, then by line number for stability
  const sorted = [...sigs].sort((a, b) => {
    const vDiff = signatureValue(b.kind) - signatureValue(a.kind);
    return vDiff !== 0 ? vDiff : a.line - b.line;
  });

  const kept: { line: number; text: string }[] = [];
  const overhead = estimateTokens(`### ${filePath}\n\`\`\`${language}\n\n\`\`\``);
  let tokens = overhead;

  for (const s of sorted) {
    let text = useSkeleton ? s.signature : s.signature.replace(/\s*\{\s*\.\.\.\s*\}|\s*:\s*\.\.\./g, "");

    // Collapse verbose type/interface bodies (>40 tokens)
    if ((s.kind === "type" || s.kind === "interface") && estimateTokens(text) > 40) {
      text = collapseBody(text);
    }

    const lineTokens = estimateTokens(text + "\n");
    if (tokens + lineTokens > cap) continue;

    kept.push({ line: s.line, text });
    tokens += lineTokens;
  }

  // Re-sort by original line number for readable output
  kept.sort((a, b) => a.line - b.line);

  return kept.map((k) => k.text).join("\n");
}

/**
 * Build the code map section from extracted signatures.
 */
function buildCodeMap(
  fileSignatures: FileSignatures[],
  config: ContextConfig,
  budget: number
): { content: string; tokens: number; truncatedFiles: string[] } {
  // Sort by priority (highest first); barrel files get deprioritized
  const prioritized = fileSignatures
    .map((fs) => ({
      ...fs,
      priority: filePriority(fs.path, fs.signatures),
    }))
    .sort((a, b) => b.priority - a.priority);

  const fileCount = prioritized.filter((f) => f.signatures.length > 0).length;
  const perFileCap = Math.max(200, Math.floor(budget / Math.min(fileCount || 1, 15)));

  const parts: string[] = [];
  let totalTokens = 0;
  const truncatedFiles: string[] = [];
  const exportsOnly = config.signature_depth === "exports";
  const useSkeleton = (config as any).code_map_format !== "signatures"; // default skeleton

  for (const file of prioritized) {
    const sigs = exportsOnly
      ? file.signatures.filter((s) => s.exported)
      : file.signatures;

    if (sigs.length === 0) continue;

    const lines = sigs.map((s) => s.signature);
    const body = useSkeleton ? lines.join("\n") : lines
      .map((l) => l.replace(/\s*\{\s*\.\.\.\s*\}|\s*:\s*\.\.\./g, ""))
      .join("\n");

    const sigBlock = sanitizeCodeBlock(body);
    let entry = `### ${file.path}\n\`\`\`${file.language}\n${sigBlock}\n\`\`\``;
    let entryTokens = estimateTokens(entry);

    // Per-file cap: trim signatures if this file is too verbose
    if (entryTokens > perFileCap) {
      const trimmedBody = trimSignatures(sigs, perFileCap, file.path, file.language, useSkeleton);
      if (!trimmedBody) {
        truncatedFiles.push(file.path);
        continue;
      }
      entry = `### ${file.path}\n\`\`\`${file.language}\n${sanitizeCodeBlock(trimmedBody)}\n\`\`\``;
      entryTokens = estimateTokens(entry);
    }

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
  let allocation = allocateBudget(totalBudget, { monorepo: !!project.monorepo });

  // Walk project for all files
  const allFiles = await walkDir(projectDir, projectDir, DEFAULT_IGNORE);
  const supportedExts = new Set(await getSupportedExtensions());
  const sourceFiles = allFiles.filter((f) => {
    const ext = extname(f);
    if (!supportedExts.has(ext)) return false;
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

  // Auto-generate knowledge if budget remains and feature is enabled
  let autoKnowledgeContent = "";
  let autoKnowledgeTokens = 0;
  const remainingKnowledgeBudget = allocation.knowledge - knowledgeResult.tokens;
  if (config.auto_knowledge !== false && remainingKnowledgeBudget > 200) {
    const autoEntries = generateAutoKnowledge(
      project,
      allSignatures,
      allFiles,
      remainingKnowledgeBudget
    );
    if (autoEntries.length > 0) {
      const parts = autoEntries.map((e) => `### ${e.title}\n\n${e.content}`);
      autoKnowledgeContent = parts.join("\n\n");
      autoKnowledgeTokens = estimateTokens(autoKnowledgeContent);
    }
  }

  // Redistribute surplus
  const used: Record<string, number> = {
    overview: overviewTokens,
    structure: structureTokens,
    keyFiles: keyFilesResult.tokens,
    codeMap: codeMapResult.tokens,
    knowledge: knowledgeResult.tokens + autoKnowledgeTokens,
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

  const combinedKnowledge = [knowledgeResult.content, autoKnowledgeContent]
    .filter(Boolean)
    .join("\n\n");
  const combinedKnowledgeTokens = knowledgeResult.tokens + autoKnowledgeTokens;

  if (combinedKnowledge) {
    sections.push({
      id: "knowledge",
      title: "Knowledge",
      content: truncateToFit(combinedKnowledge, allocation.knowledge),
      tokens: Math.min(combinedKnowledgeTokens, allocation.knowledge),
      priority: 5,
    });
  }

  // Assemble markdown
  const mdParts: string[] = [];
  mdParts.push(`# ${sanitizeMarkdownHeading(project.name)}\n`);
  mdParts.push("> Project context — regenerate as needed\n");

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
