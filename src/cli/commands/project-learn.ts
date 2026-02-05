import { existsSync } from "fs";
import { writeFile, readFile, readdir, stat } from "fs/promises";
import { join, basename } from "path";
import chalk from "chalk";
import { detectProject, ProjectType } from "../../core/project-detect";

const IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".venv", "venv", "target", ".cache", "coverage", ".turbo", ".DS_Store",
  ".idea", ".vscode", "vendor", "tmp", "temp", "logs",
]);

/**
 * Generate a compact project CLAUDE.md
 * Efficient: just structure summary, no AI, minimal context usage
 */
export async function projectLearnCommand(options: {
  force?: boolean;
}): Promise<void> {
  const cwd = process.cwd();
  const claudeMdPath = join(cwd, "CLAUDE.md");

  if (existsSync(claudeMdPath) && !options.force) {
    console.log(chalk.yellow("CLAUDE.md already exists."));
    console.log(chalk.dim("Use --force to overwrite."));
    return;
  }

  console.log(chalk.blue("Scanning project..."));

  const project = await detectProject(cwd);
  const structure = await scanStructure(cwd);
  const entryPoints = findEntryPoints(cwd, project.type);

  // Build compact CLAUDE.md
  const lines: string[] = [];

  lines.push(`# ${project.name}`);
  lines.push("");
  lines.push(`${project.type} project${structure.description ? `: ${structure.description}` : ""}`);
  lines.push("");

  // Entry points (most important for navigation)
  if (entryPoints.length > 0) {
    lines.push(`**Entry:** ${entryPoints.join(", ")}`);
    lines.push("");
  }

  // Compact directory summary
  lines.push("**Structure:**");
  for (const dir of structure.dirs) {
    lines.push(`- \`${dir.name}/\` ${dir.count} files${dir.hint ? ` - ${dir.hint}` : ""}`);
  }

  // Root files (configs, docs)
  if (structure.rootFiles.length > 0) {
    lines.push(`- root: ${structure.rootFiles.join(", ")}`);
  }
  lines.push("");

  await writeFile(claudeMdPath, lines.join("\n"));

  console.log(chalk.green("Created compact CLAUDE.md"));
  console.log(chalk.dim(`${lines.length} lines, ~${lines.join("\n").length} bytes`));
}

interface DirSummary {
  name: string;
  count: number;
  hint?: string;
}

interface StructureSummary {
  dirs: DirSummary[];
  rootFiles: string[];
  description?: string;
}

async function scanStructure(dir: string): Promise<StructureSummary> {
  const entries = await readdir(dir, { withFileTypes: true });
  const dirs: DirSummary[] = [];
  const rootFiles: string[] = [];
  let description: string | undefined;

  // Get description from package.json
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      description = pkg.description;
    } catch {}
  }

  for (const entry of entries) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      const count = await countFiles(join(dir, entry.name));
      if (count > 0) {
        dirs.push({
          name: entry.name,
          count,
          hint: getDirHint(entry.name),
        });
      }
    } else if (isRelevantRootFile(entry.name)) {
      rootFiles.push(entry.name);
    }
  }

  // Sort dirs by importance
  dirs.sort((a, b) => {
    const order = ["src", "app", "lib", "pages", "components", "api", "test", "tests", "scripts", "docs"];
    const aIdx = order.indexOf(a.name);
    const bIdx = order.indexOf(b.name);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return { dirs, rootFiles, description };
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        count += await countFiles(join(dir, entry.name));
      } else {
        count++;
      }
    }
  } catch {}
  return count;
}

function isRelevantRootFile(name: string): boolean {
  const relevant = [
    "package.json", "tsconfig.json", "Cargo.toml", "go.mod", "pyproject.toml",
    "Gemfile", "Makefile", "docker-compose.yml", "Dockerfile",
    "README.md", "CHANGELOG.md",
  ];
  return relevant.includes(name);
}

function getDirHint(name: string): string | undefined {
  const hints: Record<string, string> = {
    src: "source code",
    app: "application",
    lib: "library",
    pages: "routes",
    components: "UI",
    api: "endpoints",
    test: "tests",
    tests: "tests",
    scripts: "tooling",
    docs: "documentation",
    public: "static assets",
    assets: "resources",
    config: "configuration",
    utils: "utilities",
    hooks: "React hooks",
    services: "business logic",
    models: "data models",
    controllers: "request handlers",
    middleware: "middleware",
    types: "TypeScript types",
  };
  return hints[name];
}

function findEntryPoints(dir: string, type: ProjectType): string[] {
  const entries: string[] = [];

  // Try package.json bin/main first
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
      if (pkg.bin) {
        const bins = typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin);
        for (const bin of bins as string[]) {
          if (bin && !entries.includes(bin)) entries.push(bin);
        }
      }
      if (pkg.main && !entries.includes(pkg.main)) entries.push(pkg.main);
      if (pkg.module && !entries.includes(pkg.module)) entries.push(pkg.module);
    } catch {}
  }

  // Fallback to common patterns
  if (entries.length === 0) {
    const candidates = [
      "src/index.ts", "src/index.tsx", "src/main.ts", "src/main.tsx",
      "src/app.ts", "src/app.tsx", "src/server.ts",
      "app/page.tsx", "pages/index.tsx",
      "index.ts", "index.tsx", "main.ts", "main.py",
      "src/lib.rs", "src/main.rs",
      "cmd/main.go", "main.go",
      "app.rb", "config.ru",
    ];

    for (const candidate of candidates) {
      if (existsSync(join(dir, candidate))) {
        entries.push(candidate);
        if (entries.length >= 2) break;
      }
    }
  }

  return entries.slice(0, 3); // Max 3
}
