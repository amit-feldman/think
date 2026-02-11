import { dirname, basename, extname } from "path";
import { estimateTokens } from "./config.ts";
import type { FileSignatures, ImportEntry } from "./extractor.ts";
import type { ProjectInfo } from "./project-detect.ts";

export interface KnowledgeEntry {
  title: string;
  content: string;
  tokens: number;
}

// Directory names that suggest architectural roles
const DIR_ROLES: Record<string, string> = {
  routes: "API routes",
  api: "API layer",
  controllers: "controllers",
  services: "business logic",
  models: "data models",
  middleware: "middleware",
  components: "UI components",
  hooks: "React hooks",
  pages: "page components",
  views: "views",
  lib: "shared library",
  utils: "utilities",
  helpers: "helpers",
  config: "configuration",
  core: "core logic",
  common: "shared code",
  shared: "shared code",
  store: "state management",
  actions: "actions/reducers",
  reducers: "reducers",
  providers: "context providers",
  handlers: "request handlers",
  resolvers: "GraphQL resolvers",
  schemas: "schemas",
  types: "type definitions",
  interfaces: "interfaces",
  entities: "domain entities",
  repositories: "data access",
  migrations: "DB migrations",
  seeds: "DB seeds",
  fixtures: "test fixtures",
  cmd: "CLI commands",
  pkg: "packages",
  internal: "internal packages",
};

/**
 * Analyze project architecture from directory structure and import flow.
 */
export function analyzeArchitecture(
  project: ProjectInfo,
  fileSignatures: FileSignatures[],
  allFiles: string[]
): KnowledgeEntry | null {
  const lines: string[] = [];

  // Identify top-level directories and their roles
  const topDirs = new Map<string, string>();
  for (const f of allFiles) {
    const parts = f.split("/");
    if (parts.length < 2) continue;
    const topDir = parts[0]!;
    if (!topDirs.has(topDir) && DIR_ROLES[topDir]) {
      topDirs.set(topDir, DIR_ROLES[topDir]!);
    }
  }

  // Also check one level deep (e.g. src/routes)
  for (const f of allFiles) {
    const parts = f.split("/");
    if (parts.length < 3) continue;
    if (parts[0] === "src" || parts[0] === "app" || parts[0] === "lib") {
      const subDir = parts[1]!;
      const key = `${parts[0]}/${subDir}`;
      if (!topDirs.has(key) && DIR_ROLES[subDir]) {
        topDirs.set(key, DIR_ROLES[subDir]!);
      }
    }
  }

  if (topDirs.size > 0) {
    lines.push("**Layers:**");
    for (const [dir, role] of topDirs) {
      lines.push(`- \`${dir}/\` — ${role}`);
    }
  }

  // Import flow between directories
  const dirImports = buildDirImportFlow(fileSignatures);
  if (dirImports.size > 0) {
    lines.push("");
    lines.push("**Import flow:**");
    for (const [fromDir, toDirs] of dirImports) {
      const targets = [...toDirs].slice(0, 5).join(", ");
      lines.push(`- \`${fromDir}/\` → {${targets}}`);
    }
  }

  // Entry points
  const entryPoints = findEntryPoints(allFiles);
  if (entryPoints.length > 0) {
    lines.push("");
    lines.push(`**Entry points:** ${entryPoints.map((e) => `\`${e}\``).join(", ")}`);
  }

  // Monorepo info
  if (project.monorepo) {
    lines.push("");
    lines.push(`**Monorepo (${project.monorepo.tool}):** ${project.monorepo.workspaces.length} workspaces`);
  }

  if (lines.length === 0) return null;

  const content = lines.join("\n");
  return {
    title: "Architecture (auto)",
    content,
    tokens: estimateTokens(content),
  };
}

/**
 * Analyze code conventions from file names, test patterns, and export styles.
 */
export function analyzeConventions(
  fileSignatures: FileSignatures[],
  allFiles: string[]
): KnowledgeEntry | null {
  const lines: string[] = [];

  // File naming conventions
  const namingStyle = detectNamingConvention(allFiles);
  if (namingStyle) {
    lines.push(`**File naming:** ${namingStyle}`);
  }

  // Test patterns
  const testPattern = detectTestPattern(allFiles);
  if (testPattern) {
    lines.push(`**Tests:** ${testPattern}`);
  }

  // Export style
  const exportInfo = analyzeExportStyle(fileSignatures);
  if (exportInfo) {
    lines.push(`**Exports:** ${exportInfo}`);
  }

  // Barrel files
  const barrelCount = fileSignatures.filter((fs) => {
    const reExports = fs.signatures.filter((s) => s.name.startsWith("re-export"));
    return fs.signatures.length > 0 && reExports.length / fs.signatures.length > 0.5;
  }).length;
  if (barrelCount > 0) {
    lines.push(`**Barrel files:** ${barrelCount} index re-export files`);
  }

  if (lines.length === 0) return null;

  const content = lines.join("\n");
  return {
    title: "Conventions (auto)",
    content,
    tokens: estimateTokens(content),
  };
}

/**
 * Analyze internal dependency graph and external dependencies.
 */
export function analyzeDependencies(
  fileSignatures: FileSignatures[]
): KnowledgeEntry | null {
  const lines: string[] = [];

  // Internal module dependency map (dir → dirs it imports)
  const dirDeps = buildDirImportFlow(fileSignatures);
  if (dirDeps.size > 0) {
    lines.push("**Internal deps:**");
    for (const [fromDir, toDirs] of dirDeps) {
      const targets = [...toDirs].slice(0, 6).join(", ");
      lines.push(`- \`${fromDir}/\` → {${targets}}`);
    }
  }

  // Hub files (most imported internally)
  const hubFiles = findHubFiles(fileSignatures);
  if (hubFiles.length > 0) {
    lines.push("");
    lines.push("**Hub files** (most imported):");
    for (const h of hubFiles.slice(0, 5)) {
      lines.push(`- \`${h.path}\` (${h.count} imports)`);
    }
  }

  // External dependencies
  const externalDeps = collectExternalDeps(fileSignatures);
  if (externalDeps.length > 0) {
    lines.push("");
    lines.push(`**External deps:** ${externalDeps.slice(0, 10).join(", ")}`);
  }

  if (lines.length === 0) return null;

  const content = lines.join("\n");
  return {
    title: "Dependencies (auto)",
    content,
    tokens: estimateTokens(content),
  };
}

/**
 * Generate auto-knowledge entries that fit within the remaining budget.
 */
export function generateAutoKnowledge(
  project: ProjectInfo,
  fileSignatures: FileSignatures[],
  allFiles: string[],
  budget: number
): KnowledgeEntry[] {
  if (budget <= 0) return [];

  const candidates: KnowledgeEntry[] = [];

  const arch = analyzeArchitecture(project, fileSignatures, allFiles);
  if (arch) candidates.push(arch);

  const conv = analyzeConventions(fileSignatures, allFiles);
  if (conv) candidates.push(conv);

  const deps = analyzeDependencies(fileSignatures);
  if (deps) candidates.push(deps);

  // Fit within budget
  const result: KnowledgeEntry[] = [];
  let remaining = budget;

  for (const entry of candidates) {
    const entryOverhead = estimateTokens(`### ${entry.title}\n\n`);
    const totalNeeded = entry.tokens + entryOverhead;
    if (totalNeeded <= remaining) {
      result.push(entry);
      remaining -= totalNeeded;
    }
  }

  return result;
}

// --- Internal helpers ---

function buildDirImportFlow(
  fileSignatures: FileSignatures[]
): Map<string, Set<string>> {
  const flow = new Map<string, Set<string>>();

  for (const fs of fileSignatures) {
    if (!fs.imports) continue;
    const fromDir = topLevelDir(fs.path);
    if (!fromDir) continue;

    for (const imp of fs.imports) {
      if (!imp.isRelative) continue;
      // Resolve relative import to approximate target directory
      const targetDir = resolveImportDir(fs.path, imp.source);
      if (targetDir && targetDir !== fromDir) {
        if (!flow.has(fromDir)) flow.set(fromDir, new Set());
        flow.get(fromDir)!.add(targetDir);
      }
    }
  }

  return flow;
}

function topLevelDir(filePath: string): string | null {
  const parts = filePath.split("/");
  if (parts.length < 2) return null;
  // For src/X/... return src/X, for X/... return X
  if (
    parts[0] === "src" ||
    parts[0] === "app" ||
    parts[0] === "lib" ||
    parts[0] === "packages"
  ) {
    return parts.length >= 3 ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  return parts[0]!;
}

function resolveImportDir(fromPath: string, importSource: string): string | null {
  // Simple resolution: from "src/routes/api.ts" importing "../services/db"
  // gives us "src/services"
  const fromParts = dirname(fromPath).split("/");
  const importParts = importSource.split("/");

  const resolved = [...fromParts];
  for (const part of importParts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== ".") {
      resolved.push(part);
    }
  }

  // Remove the file part (last segment if it looks like a file)
  if (resolved.length > 0) {
    const last = resolved[resolved.length - 1]!;
    if (last.includes(".")) resolved.pop();
  }

  if (resolved.length === 0) return null;

  // Return top-level dir using same logic
  const resolvedPath = resolved.join("/") + "/dummy";
  return topLevelDir(resolvedPath);
}

function findEntryPoints(allFiles: string[]): string[] {
  const entryNames = new Set([
    "index.ts",
    "index.tsx",
    "index.js",
    "main.ts",
    "main.tsx",
    "main.js",
    "main.go",
    "main.rs",
    "lib.rs",
    "main.py",
    "app.py",
    "__main__.py",
    "Main.java",
    "Application.java",
    "Program.cs",
  ]);

  return allFiles
    .filter((f) => {
      const name = basename(f);
      const depth = f.split("/").length;
      return entryNames.has(name) && depth <= 3;
    })
    .slice(0, 5);
}

function detectNamingConvention(allFiles: string[]): string | null {
  const sourceFiles = allFiles.filter((f) => {
    const ext = extname(f);
    return [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"].includes(ext);
  });

  if (sourceFiles.length < 3) return null;

  let kebab = 0;
  let camel = 0;
  let pascal = 0;
  let snake = 0;

  for (const f of sourceFiles) {
    const name = basename(f, extname(f));
    if (name.includes("-")) kebab++;
    else if (name.includes("_")) snake++;
    else if (/^[A-Z]/.test(name) && /[a-z]/.test(name)) pascal++;
    else if (/^[a-z]/.test(name) && /[A-Z]/.test(name)) camel++;
  }

  const total = sourceFiles.length;
  const styles: [string, number][] = [
    ["kebab-case", kebab],
    ["camelCase", camel],
    ["PascalCase", pascal],
    ["snake_case", snake],
  ];
  styles.sort((a, b) => b[1] - a[1]);

  const [topStyle, topCount] = styles[0]!;
  if (topCount / total > 0.3) return topStyle;
  return null;
}

function detectTestPattern(allFiles: string[]): string | null {
  let dotTest = 0;
  let dotSpec = 0;
  let testsDir = 0;

  for (const f of allFiles) {
    if (f.includes(".test.")) dotTest++;
    else if (f.includes(".spec.")) dotSpec++;
    if (f.includes("__tests__/") || f.startsWith("tests/") || f.startsWith("test/")) {
      testsDir++;
    }
  }

  const parts: string[] = [];
  if (dotTest > 0) parts.push(`*.test.* (${dotTest} files)`);
  if (dotSpec > 0) parts.push(`*.spec.* (${dotSpec} files)`);
  if (testsDir > 0) parts.push(`test dirs (${testsDir} files)`);

  return parts.length > 0 ? parts.join(", ") : null;
}

function analyzeExportStyle(fileSignatures: FileSignatures[]): string | null {
  let named = 0;
  let defaultExport = 0;

  for (const fs of fileSignatures) {
    for (const s of fs.signatures) {
      if (!s.exported) continue;
      if (s.signature.includes("export default")) {
        defaultExport++;
      } else {
        named++;
      }
    }
  }

  if (named + defaultExport === 0) return null;

  const total = named + defaultExport;
  if (named / total > 0.8) return "predominantly named exports";
  if (defaultExport / total > 0.8) return "predominantly default exports";
  return `mixed (${named} named, ${defaultExport} default)`;
}

function findHubFiles(
  fileSignatures: FileSignatures[]
): { path: string; count: number }[] {
  // Count how many files import each relative target
  const importCounts = new Map<string, number>();

  for (const fs of fileSignatures) {
    if (!fs.imports) continue;
    for (const imp of fs.imports) {
      if (!imp.isRelative) continue;
      // Normalize: resolve the import relative to the file
      const resolved = resolveRelativePath(fs.path, imp.source);
      if (resolved) {
        importCounts.set(resolved, (importCounts.get(resolved) || 0) + 1);
      }
    }
  }

  // Match against known file paths
  const filePaths = new Set(fileSignatures.map((fs) => fs.path));
  const hubs: { path: string; count: number }[] = [];

  for (const [target, count] of importCounts) {
    if (count < 2) continue;
    // Try to find a matching file
    const match = findMatchingFile(target, filePaths);
    if (match) {
      hubs.push({ path: match, count });
    }
  }

  hubs.sort((a, b) => b.count - a.count);
  return hubs;
}

function resolveRelativePath(fromFile: string, importSource: string): string | null {
  const fromDir = dirname(fromFile).split("/");
  const parts = importSource.split("/");

  const resolved = [...fromDir];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }

  return resolved.length > 0 ? resolved.join("/") : null;
}

function findMatchingFile(target: string, filePaths: Set<string>): string | null {
  // Direct match
  if (filePaths.has(target)) return target;
  // Try common extensions
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"]) {
    if (filePaths.has(target + ext)) return target + ext;
  }
  // Try index files
  for (const idx of ["/index.ts", "/index.tsx", "/index.js"]) {
    if (filePaths.has(target + idx)) return target + idx;
  }
  return null;
}

function collectExternalDeps(fileSignatures: FileSignatures[]): string[] {
  const deps = new Set<string>();

  for (const fs of fileSignatures) {
    if (!fs.imports) continue;
    for (const imp of fs.imports) {
      if (imp.isRelative) continue;
      // Get top-level package name (e.g. "@scope/pkg" or "pkg")
      const source = imp.source;
      if (source.startsWith("@")) {
        const parts = source.split("/");
        if (parts.length >= 2) deps.add(`${parts[0]}/${parts[1]}`);
      } else {
        deps.add(source.split("/")[0]!);
      }
    }
  }

  // Filter out Node built-ins
  const builtins = new Set([
    "fs", "path", "os", "http", "https", "url", "util", "crypto",
    "stream", "events", "child_process", "cluster", "net", "tls",
    "dns", "readline", "assert", "buffer", "console", "process",
    "querystring", "string_decoder", "timers", "tty", "v8", "vm",
    "zlib", "fs/promises", "node:fs", "node:path", "node:os",
  ]);

  return [...deps].filter((d) => !builtins.has(d)).sort();
}
