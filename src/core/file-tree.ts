import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, basename } from "path";
import { parseMarkdown } from "./parser.ts";
import { thinkPath, CONFIG, estimateTokens } from "./config.ts";

export interface FileTreeConfig {
  ignorePatterns: string[];
  maxDepth: number;
  annotations: Record<string, string>;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  annotation?: string;
  children?: TreeNode[];
  collapsed?: boolean;
  fileCount?: number;
  dirCount?: number;
}

export const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".cache",
  "coverage",
  ".turbo",
  ".DS_Store",
  "*.pyc",
  "*.pyo",
  ".env",
  ".env.*",
  ".bun",
  ".parcel-cache",
  ".svelte-kit",
  "__snapshots__",
];

/** Files suppressed from tree display (not from signature extraction walk). */
export const TREE_NOISE = [
  // Lock files
  "package-lock.json", "bun.lock", "yarn.lock", "pnpm-lock.yaml",
  "Cargo.lock", "Gemfile.lock", "composer.lock", "poetry.lock",
  // Build artifacts
  "tsconfig.tsbuildinfo", "*.bun-build",
  // Config noise (not useful for code understanding)
  ".gitignore", ".gitkeep", ".gitattributes", ".editorconfig",
  ".prettierrc", ".prettierrc.*", ".prettierignore",
  ".eslintrc.*", ".eslintignore",
  ".lintstagedrc.*", ".commitlintrc.*",
  ".secretlintrc.*", ".secretlintignore",
  ".clippy.toml", "rustfmt.toml",
  ".npmrc", ".yarnrc.*",
  "*.log",
];

const DEFAULT_ANNOTATIONS: Record<string, string> = {
  "package.json": "project manifest",
  "tsconfig.json": "TypeScript config",
  "Cargo.toml": "Rust manifest",
  "pyproject.toml": "Python config",
  "go.mod": "Go module",
  "Gemfile": "Ruby dependencies",
  "README.md": "documentation",
  "CLAUDE.md": "Claude context",
  ".env.example": "environment template",
};

const DIR_COLLAPSE_THRESHOLD = 15;

/**
 * Load file tree configuration from ~/.think/templates/file-tree.md
 */
async function loadConfig(): Promise<FileTreeConfig> {
  const configPath = thinkPath(CONFIG.files.fileTree);

  if (!existsSync(configPath)) {
    return {
      ignorePatterns: DEFAULT_IGNORE,
      maxDepth: 4,
      annotations: DEFAULT_ANNOTATIONS,
    };
  }

  const parsed = await parseMarkdown(configPath);
  // parseMarkdown only returns null for non-existent files, which is handled above
  const content = parsed!.content;
  const ignorePatterns: string[] = [...DEFAULT_IGNORE];
  const annotations: Record<string, string> = { ...DEFAULT_ANNOTATIONS };
  let maxDepth = 4;

  // Parse ignore patterns section
  const ignoreMatch = content.match(/## Ignore Patterns[\s\S]*?(?=##|$)/);
  if (ignoreMatch) {
    const lines = ignoreMatch[0].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        ignorePatterns.push(trimmed.slice(2).trim());
      }
    }
  }

  // Parse max depth
  const depthMatch = content.match(/## Max Depth\s*\n\s*(\d+)/);
  if (depthMatch) {
    maxDepth = parseInt(depthMatch[1]!, 10);
  }

  // Parse annotations
  const annotMatch = content.match(/## Annotations[\s\S]*?(?=##|$)/);
  if (annotMatch) {
    const lines = annotMatch[0].split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        const [pattern, desc] = trimmed.slice(2).split(":").map((s) => s.trim());
        if (pattern && desc) {
          annotations[pattern] = desc;
        }
      }
    }
  }

  return { ignorePatterns, maxDepth, annotations };
}

/**
 * Check if a path should be ignored
 */
function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  for (const pattern of ignorePatterns) {
    if (pattern.includes("*")) {
      // Simple glob matching
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
 * Get annotation for a file
 */
function getAnnotation(
  name: string,
  relativePath: string,
  annotations: Record<string, string>
): string | undefined {
  // Check exact match first
  if (annotations[name]) return annotations[name];

  // Check path patterns
  for (const [pattern, desc] of Object.entries(annotations)) {
    if (pattern.includes("/") || pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      if (regex.test(relativePath)) {
        return desc;
      }
    }
  }

  return undefined;
}

/**
 * Check if a directory path contains any significant paths.
 */
function containsSignificant(
  dirRelPath: string,
  significantPaths: Set<string> | undefined
): boolean {
  if (!significantPaths || significantPaths.size === 0) return false;
  for (const sp of significantPaths) {
    if (sp.startsWith(dirRelPath + "/") || sp === dirRelPath) {
      return true;
    }
  }
  return false;
}

/**
 * Build file tree recursively with optional collapsing/significance support.
 */
async function buildTree(
  dir: string,
  rootDir: string,
  config: FileTreeConfig,
  depth: number = 0,
  significantPaths?: Set<string>
): Promise<TreeNode[]> {
  if (depth >= config.maxDepth) return [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: TreeNode[] = [];

  // Filter out ignored entries first
  const visible = entries.filter((e) => !shouldIgnore(e.name, config.ignorePatterns));

  // Sort: directories first, then files, alphabetically
  const sorted = visible.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  // Check for collapsing: if too many children and not significant
  const dirRelPath = relative(rootDir, dir);
  const isSignificant =
    dirRelPath === "" || containsSignificant(dirRelPath, significantPaths);

  if (
    sorted.length > DIR_COLLAPSE_THRESHOLD &&
    !isSignificant &&
    depth > 0
  ) {
    const fileCount = sorted.filter((e) => e.isFile()).length;
    const dirCount = sorted.filter((e) => e.isDirectory()).length;
    // Return a collapsed node representation — the parent will handle this
    // We return an empty array here but mark the info on the caller side
    return [
      {
        name: `(${fileCount} files, ${dirCount} dirs)`,
        path: dirRelPath,
        type: "file" as const,
        collapsed: true,
        fileCount,
        dirCount,
      },
    ];
  }

  for (const entry of sorted) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      const children = await buildTree(
        fullPath,
        rootDir,
        config,
        depth + 1,
        significantPaths
      );
      // Only include directory if it has visible children
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: relativePath,
          type: "directory",
          children,
        });
      }
    } else {
      if (shouldIgnore(entry.name, TREE_NOISE)) continue;
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "file",
        annotation: getAnnotation(entry.name, relativePath, config.annotations),
      });
    }
  }

  return nodes;
}

/**
 * Render tree to string
 */
function renderTree(nodes: TreeNode[], prefix: string = ""): string {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const isLast = i === nodes.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    let line = prefix + connector + node.name;
    if (node.annotation) {
      line += ` # ${node.annotation}`;
    }
    lines.push(line);

    if (node.children) {
      lines.push(renderTree(node.children, prefix + childPrefix));
    }
  }

  return lines.join("\n");
}

/**
 * Generate file tree for a project directory
 */
export async function generateFileTree(projectDir: string): Promise<string> {
  const config = await loadConfig();
  const nodes = await buildTree(projectDir, projectDir, config);
  const projectName = basename(projectDir);

  return `${projectName}/\n${renderTree(nodes)}`;
}

/**
 * Generate file tree and return as markdown
 */
export async function generateFileTreeMarkdown(projectDir: string): Promise<string> {
  const tree = await generateFileTree(projectDir);
  return `\`\`\`\n${tree}\n\`\`\``;
}

/**
 * Generate an adaptive file tree that fits within a token budget.
 * Starts at depth 4, reduces depth if the rendered tree exceeds the budget.
 * Collapses directories with many children and no significant files.
 */
export async function generateAdaptiveTree(
  projectDir: string,
  options?: { budgetTokens?: number; significantPaths?: Set<string> }
): Promise<string> {
  const baseConfig = await loadConfig();
  const budget = options?.budgetTokens ?? 1500;
  const significantPaths = options?.significantPaths;
  const projectName = basename(projectDir);

  // Try depths 4 down to 1; always accept at depth 1 regardless of budget
  let result = `${projectName}/\n`;
  for (const maxDepth of [4, 3, 2, 1]) {
    const config: FileTreeConfig = { ...baseConfig, maxDepth };
    const nodes = await buildTree(projectDir, projectDir, config, 0, significantPaths);
    result = `${projectName}/\n${renderTree(nodes)}`;
    if (estimateTokens(result) <= budget || maxDepth === 1) break;
  }
  return result;
}
