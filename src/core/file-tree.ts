import { readdir, stat, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, relative, basename } from "path";
import { parseMarkdown } from "./parser";
import { thinkPath, CONFIG } from "./config";

interface FileTreeConfig {
  ignorePatterns: string[];
  maxDepth: number;
  annotations: Record<string, string>;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  annotation?: string;
  children?: TreeNode[];
}

const DEFAULT_IGNORE = [
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
  if (!parsed) {
    return {
      ignorePatterns: DEFAULT_IGNORE,
      maxDepth: 4,
      annotations: DEFAULT_ANNOTATIONS,
    };
  }

  const content = parsed.content;
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
    maxDepth = parseInt(depthMatch[1], 10);
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
      if (regex.test(relativePath) || regex.test(name)) {
        return desc;
      }
    }
  }

  return undefined;
}

/**
 * Build file tree recursively
 */
async function buildTree(
  dir: string,
  rootDir: string,
  config: FileTreeConfig,
  depth: number = 0
): Promise<TreeNode[]> {
  if (depth >= config.maxDepth) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  // Sort: directories first, then files, alphabetically
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    if (shouldIgnore(entry.name, config.ignorePatterns)) continue;

    const fullPath = join(dir, entry.name);
    const relativePath = relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, rootDir, config, depth + 1);
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
    const node = nodes[i];
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
