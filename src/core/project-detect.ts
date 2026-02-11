import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface ProjectInfo {
  name: string;
  description?: string;
  root: string;
  runtime: Runtime;
  monorepo?: MonorepoInfo;
  frameworks: string[];
  tooling: string[];
}

export interface MonorepoInfo {
  tool: string;
  workspaces: WorkspaceInfo[];
}

export interface WorkspaceInfo {
  name: string;
  path: string;
  description?: string;
  type?: string; // "app" | "package" | "service" | etc.
}

export type Runtime = "bun" | "node" | "deno" | "rust" | "python" | "go" | "java" | "ruby" | "php" | "unknown";

/**
 * Detect project info from the given directory
 */
export async function detectProject(dir: string): Promise<ProjectInfo> {
  const pkg = readPackageJson(dir);

  // Check for monorepo first
  const monorepo = detectMonorepo(dir, pkg);

  // Collect all frameworks and tooling (including from workspaces)
  let frameworks = detectFrameworks(dir, pkg);
  let tooling = detectTooling(dir, pkg);

  // If monorepo, also scan workspaces for frameworks
  if (monorepo) {
    for (const ws of monorepo.workspaces) {
      const wsPath = join(dir, ws.path);
      const wsPkg = readPackageJson(wsPath);
      if (wsPkg) {
        frameworks = [...frameworks, ...detectFrameworks(wsPath, wsPkg)];
        // Only add key tooling from workspaces, not everything
        const wsTooling = detectFrameworks(wsPath, wsPkg);
        tooling = [...tooling, ...wsTooling.filter(t =>
          ["Tauri", "Electron", "React Native", "Expo"].includes(t)
        )];
      }
    }
  }

  const info: ProjectInfo = {
    name: pkg?.name || detectProjectName(dir),
    description: pkg?.description || extractReadmeDescription(dir),
    root: dir,
    runtime: detectRuntime(dir),
    frameworks: [...new Set(frameworks)],
    tooling: [...new Set(tooling)],
  };

  if (monorepo) {
    info.monorepo = monorepo;
  }

  return info;
}

function readPackageJson(dir: string): any | null {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
}

function detectRuntime(dir: string): Runtime {
  // Order matters - more specific first
  if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bunfig.toml"))) return "bun";
  if (existsSync(join(dir, "deno.json")) || existsSync(join(dir, "deno.jsonc"))) return "deno";
  if (existsSync(join(dir, "Cargo.toml"))) return "rust";
  if (existsSync(join(dir, "go.mod"))) return "go";
  if (existsSync(join(dir, "pyproject.toml")) || existsSync(join(dir, "requirements.txt"))) return "python";
  if (existsSync(join(dir, "composer.json")) || existsSync(join(dir, "public/index.php")) || existsSync(join(dir, "index.php"))) return "php";
  if (existsSync(join(dir, "Gemfile"))) return "ruby";
  if (existsSync(join(dir, "pom.xml")) || existsSync(join(dir, "build.gradle"))) return "java";
  if (existsSync(join(dir, "package.json"))) return "node";
  return "unknown";
}

function detectMonorepo(dir: string, pkg: any): MonorepoInfo | undefined {
  let tool: string | undefined;
  let workspacePatterns: string[] = [];

  // Detect monorepo tool
  if (existsSync(join(dir, "turbo.json"))) {
    tool = "Turborepo";
  } else if (existsSync(join(dir, "nx.json"))) {
    tool = "Nx";
  } else if (existsSync(join(dir, "lerna.json"))) {
    tool = "Lerna";
  } else if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
    tool = "pnpm workspaces";
    workspacePatterns = parsePnpmWorkspaces(dir);
  }

  // Get workspace patterns from package.json
  if (pkg?.workspaces) {
    const ws = pkg.workspaces;
    workspacePatterns = Array.isArray(ws) ? ws : ws.packages || [];

    if (!tool) {
      // Detect workspace tool from lockfile
      if (existsSync(join(dir, "bun.lock"))) tool = "Bun workspaces";
      else if (existsSync(join(dir, "pnpm-lock.yaml"))) tool = "pnpm workspaces";
      else if (existsSync(join(dir, "yarn.lock"))) tool = "Yarn workspaces";
      else tool = "npm workspaces";
    }
  }

  if (!tool || workspacePatterns.length === 0) return undefined;

  // Resolve workspaces
  const workspaces = resolveWorkspaces(dir, workspacePatterns);
  if (workspaces.length === 0) return undefined;

  return { tool, workspaces };
}

function parsePnpmWorkspaces(dir: string): string[] {
  const wsPath = join(dir, "pnpm-workspace.yaml");
  if (!existsSync(wsPath)) return [];
  try {
    const content = readFileSync(wsPath, "utf-8");
    const match = content.match(/packages:\s*\n((?:\s*-\s*.+\n?)+)/);
    if (match) {
      return match[1]!.split("\n")
        .map(line => line.replace(/^\s*-\s*['"]?|['"]?\s*$/g, ""))
        .filter(Boolean);
    }
  } catch {}
  return [];
}

function resolveWorkspaces(dir: string, patterns: string[]): WorkspaceInfo[] {
  const workspaces: WorkspaceInfo[] = [];

  for (const pattern of patterns) {
    // Handle glob patterns like "apps/*", "packages/*"
    if (pattern.endsWith("/*")) {
      const baseDir = pattern.slice(0, -2);
      const fullPath = join(dir, baseDir);
      if (existsSync(fullPath)) {
        try {
          const entries = readdirSync(fullPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              const wsPath = join(fullPath, entry.name);
              const wsPkg = readPackageJson(wsPath);
              workspaces.push({
                name: wsPkg?.name || entry.name,
                path: `${baseDir}/${entry.name}`,
                description: wsPkg?.description,
                type: inferWorkspaceType(baseDir, entry.name, wsPkg),
              });
            }
          }
        } catch {}
      }
    } else {
      // Direct path
      const wsPath = join(dir, pattern);
      if (existsSync(wsPath)) {
        const wsPkg = readPackageJson(wsPath);
        workspaces.push({
          name: wsPkg?.name || pattern.split("/").pop() || pattern,
          path: pattern,
          description: wsPkg?.description,
        });
      }
    }
  }

  return workspaces;
}

function inferWorkspaceType(baseDir: string, name: string, pkg: any): string | undefined {
  // From directory name
  if (baseDir === "apps" || baseDir === "applications") return "app";
  if (baseDir === "packages" || baseDir === "libs") return "package";
  if (baseDir === "services") return "service";
  if (baseDir === "tools" || baseDir === "tooling") return "tool";

  // From package.json hints
  if (pkg?.bin) return "cli";
  if (pkg?.main?.includes("server") || pkg?.name?.includes("server")) return "server";
  if (pkg?.name?.includes("client") || pkg?.dependencies?.react) return "app";

  return undefined;
}

function detectFrameworks(dir: string, pkg: any): string[] {
  const frameworks: string[] = [];
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };

  // Frontend
  if (deps?.react) frameworks.push("React");
  if (deps?.vue) frameworks.push("Vue");
  if (deps?.svelte) frameworks.push("Svelte");
  if (deps?.angular || deps?.["@angular/core"]) frameworks.push("Angular");
  if (deps?.solid || deps?.["solid-js"]) frameworks.push("Solid");

  // Meta-frameworks
  if (deps?.next) frameworks.push("Next.js");
  if (deps?.nuxt) frameworks.push("Nuxt");
  if (deps?.astro) frameworks.push("Astro");
  if (deps?.remix || deps?.["@remix-run/node"]) frameworks.push("Remix");

  // Backend
  if (deps?.express) frameworks.push("Express");
  if (deps?.fastify) frameworks.push("Fastify");
  if (deps?.hono) frameworks.push("Hono");
  if (deps?.elysia) frameworks.push("Elysia");
  if (deps?.["@nestjs/core"]) frameworks.push("NestJS");

  // Desktop/Mobile
  if (existsSync(join(dir, "tauri.conf.json")) || existsSync(join(dir, "src-tauri"))) {
    frameworks.push("Tauri");
  }
  if (deps?.electron) frameworks.push("Electron");
  if (deps?.["react-native"]) frameworks.push("React Native");
  if (deps?.expo) frameworks.push("Expo");

  // PHP (composer)
  const composerPath = join(dir, "composer.json");
  if (existsSync(composerPath)) {
    try {
      const composer = JSON.parse(readFileSync(composerPath, "utf-8"));
      const req = { ...(composer.require || {}), ...(composer["require-dev"] || {}) };
      if (req["laravel/framework"]) frameworks.push("Laravel");
      if (req["symfony/symfony"]) frameworks.push("Symfony");
    } catch {}
  }

  // C# (.csproj) — rough heuristic for ASP.NET Core
  const csproj = (readdirSync(dir, { withFileTypes: true }) || []).find((e) => e.isFile() && e.name.endsWith(".csproj"));
  if (csproj) {
    try {
      const content = readFileSync(join(dir, csproj.name), "utf-8");
      if (content.includes("Microsoft.AspNetCore")) frameworks.push("ASP.NET");
    } catch {}
  }

  // Java (pom.xml/gradle) — Spring Boot
  const pomPath = join(dir, "pom.xml");
  if (existsSync(pomPath)) {
    try {
      const pom = readFileSync(pomPath, "utf-8");
      if (pom.includes("spring-boot-starter")) frameworks.push("Spring Boot");
    } catch {}
  }
  const gradlePath = join(dir, "build.gradle");
  if (existsSync(gradlePath)) {
    try {
      const gradle = readFileSync(gradlePath, "utf-8");
      if (gradle.includes("org.springframework.boot")) frameworks.push("Spring Boot");
    } catch {}
  }

  // AI/ML
  if (deps?.["@anthropic-ai/sdk"] || deps?.["@anthropic-ai/claude-agent-sdk"]) {
    frameworks.push("Claude SDK");
  }
  if (deps?.openai) frameworks.push("OpenAI");
  if (deps?.langchain || deps?.["@langchain/core"]) frameworks.push("LangChain");

  // Rust detection
  const cargoPath = join(dir, "Cargo.toml");
  if (existsSync(cargoPath)) {
    try {
      const cargo = readFileSync(cargoPath, "utf-8");
      if (cargo.includes("tauri")) frameworks.push("Tauri");
      if (cargo.includes("actix")) frameworks.push("Actix");
      if (cargo.includes("axum")) frameworks.push("Axum");
      if (cargo.includes("rocket")) frameworks.push("Rocket");
    } catch {}
  }

  return [...new Set(frameworks)]; // dedupe
}

function detectTooling(dir: string, pkg: any): string[] {
  const tools: string[] = [];
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };

  // Build tools
  if (existsSync(join(dir, "turbo.json"))) tools.push("Turborepo");
  if (existsSync(join(dir, "nx.json"))) tools.push("Nx");
  if (deps?.vite) tools.push("Vite");
  if (deps?.webpack) tools.push("Webpack");
  if (deps?.esbuild) tools.push("esbuild");
  if (deps?.rollup) tools.push("Rollup");

  // Linting/Formatting
  if (deps?.["@biomejs/biome"] || existsSync(join(dir, "biome.json"))) tools.push("Biome");
  if (deps?.eslint || existsSync(join(dir, ".eslintrc.json"))) tools.push("ESLint");
  if (deps?.prettier || existsSync(join(dir, ".prettierrc"))) tools.push("Prettier");

  // Testing
  if (deps?.vitest) tools.push("Vitest");
  if (deps?.jest) tools.push("Jest");
  if (deps?.playwright || deps?.["@playwright/test"]) tools.push("Playwright");
  if (deps?.cypress) tools.push("Cypress");

  // Database/ORM
  if (deps?.prisma || deps?.["@prisma/client"]) tools.push("Prisma");
  if (deps?.drizzle || deps?.["drizzle-orm"]) tools.push("Drizzle");
  if (deps?.typeorm) tools.push("TypeORM");
  if (deps?.mongoose) tools.push("Mongoose");

  // Other
  if (existsSync(join(dir, "docker-compose.yml")) || existsSync(join(dir, "Dockerfile"))) {
    tools.push("Docker");
  }
  if (deps?.tailwindcss || existsSync(join(dir, "tailwind.config.js"))) tools.push("Tailwind");
  if (deps?.typescript || existsSync(join(dir, "tsconfig.json"))) tools.push("TypeScript");

  return [...new Set(tools)];
}

function extractReadmeDescription(dir: string): string | undefined {
  const readmePath = join(dir, "README.md");
  if (!existsSync(readmePath)) return undefined;

  try {
    const content = readFileSync(readmePath, "utf-8");

    // Try to find a tagline/description pattern (often in bold after title)
    // Match patterns like "**The Agentic Development Environment**"
    const taglineMatch = content.match(/\*\*([^*]{10,100})\*\*/);
    if (taglineMatch && !taglineMatch[1]!.includes("http") && !taglineMatch[1]!.includes("badge")) {
      return taglineMatch[1]!.trim();
    }

    // Try Overview/About section
    const overviewMatch = content.match(/##\s*(?:Overview|About|Description)\s*\n+([^\n#]+)/i);
    if (overviewMatch) {
      return cleanMarkdown(overviewMatch[1]!).slice(0, 200);
    }

    // Fall back to first paragraph
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip headings, badges, empty lines, HTML
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[") ||
          trimmed.startsWith("!") || trimmed.startsWith("<") ||
          trimmed.startsWith("*") || trimmed.startsWith("-") ||
          trimmed.startsWith("|") || trimmed.includes("badge")) {
        continue;
      }
      return cleanMarkdown(trimmed).slice(0, 200);
    }
  } catch {}

  return undefined;
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/`([^`]+)`/g, "$1") // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .trim();
}

function detectProjectName(root: string): string {
  // Try Cargo.toml
  const cargoPath = join(root, "Cargo.toml");
  if (existsSync(cargoPath)) {
    try {
      const content = readFileSync(cargoPath, "utf-8");
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) return match[1]!;
    } catch {}
  }

  // Fall back to directory name
  return root.split("/").pop() || "project";
}
