import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface ProjectInfo {
  type: ProjectType;
  name: string;
  root: string;
}

export type ProjectType =
  | "node"
  | "bun"
  | "deno"
  | "rust"
  | "python"
  | "go"
  | "java"
  | "ruby"
  | "unknown";

const PROJECT_MARKERS: Record<ProjectType, string[]> = {
  bun: ["bun.lockb", "bunfig.toml"],
  node: ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
  deno: ["deno.json", "deno.jsonc"],
  rust: ["Cargo.toml"],
  python: ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile"],
  go: ["go.mod"],
  java: ["pom.xml", "build.gradle", "build.gradle.kts"],
  ruby: ["Gemfile"],
  unknown: [],
};

/**
 * Detect project type from the given directory
 */
export async function detectProject(dir: string): Promise<ProjectInfo> {
  const root = dir;

  // Auto-detect based on marker files
  // Check Bun first (more specific than Node)
  for (const [type, markers] of Object.entries(PROJECT_MARKERS)) {
    for (const marker of markers) {
      if (existsSync(join(root, marker))) {
        return {
          type: type as ProjectType,
          name: detectProjectName(root),
          root,
        };
      }
    }
  }

  return {
    type: "unknown",
    name: detectProjectName(root),
    root,
  };
}

function detectProjectName(root: string): string {
  // Try to get name from package.json
  const pkgPath = join(root, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) return pkg.name;
    } catch {}
  }

  // Try Cargo.toml
  const cargoPath = join(root, "Cargo.toml");
  if (existsSync(cargoPath)) {
    // Simple parse - just look for name =
    try {
      const content = readFileSync(cargoPath, "utf-8");
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) return match[1];
    } catch {}
  }

  // Fall back to directory name
  return root.split("/").pop() || "project";
}
