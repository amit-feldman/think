import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import YAML from "gray-matter";

export interface ProjectInfo {
  type: ProjectType;
  name: string;
  root: string;
  configFile?: string;
  customConfig?: ThinkProjectConfig;
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

export interface ThinkProjectConfig {
  type?: ProjectType;
  name?: string;
  includes?: string[];
  excludes?: string[];
  annotations?: Record<string, string>;
}

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

  // Check for .think.yaml first
  const thinkConfigPath = join(root, ".think.yaml");
  let customConfig: ThinkProjectConfig | undefined;

  if (existsSync(thinkConfigPath)) {
    const content = await readFile(thinkConfigPath, "utf-8");
    const parsed = YAML.default(content);
    customConfig = parsed.data as ThinkProjectConfig;
  }

  // If custom config specifies type, use it
  if (customConfig?.type) {
    return {
      type: customConfig.type,
      name: customConfig.name || detectProjectName(root),
      root,
      configFile: thinkConfigPath,
      customConfig,
    };
  }

  // Auto-detect based on marker files
  // Check Bun first (more specific than Node)
  for (const [type, markers] of Object.entries(PROJECT_MARKERS)) {
    for (const marker of markers) {
      if (existsSync(join(root, marker))) {
        return {
          type: type as ProjectType,
          name: customConfig?.name || detectProjectName(root),
          root,
          configFile: existsSync(thinkConfigPath) ? thinkConfigPath : undefined,
          customConfig,
        };
      }
    }
  }

  return {
    type: "unknown",
    name: customConfig?.name || detectProjectName(root),
    root,
    configFile: existsSync(thinkConfigPath) ? thinkConfigPath : undefined,
    customConfig,
  };
}

function detectProjectName(root: string): string {
  // Try to get name from package.json
  const pkgPath = join(root, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = require(pkgPath);
      if (pkg.name) return pkg.name;
    } catch {}
  }

  // Try Cargo.toml
  const cargoPath = join(root, "Cargo.toml");
  if (existsSync(cargoPath)) {
    // Simple parse - just look for name =
    try {
      const content = require("fs").readFileSync(cargoPath, "utf-8");
      const match = content.match(/name\s*=\s*"([^"]+)"/);
      if (match) return match[1];
    } catch {}
  }

  // Fall back to directory name
  return root.split("/").pop() || "project";
}
