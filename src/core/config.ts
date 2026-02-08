import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { isValidProfileName } from "./security";

export const CONFIG = {
  // Source directory (user's preferences)
  thinkDir: join(homedir(), ".think"),

  // Profiles directory
  profilesDir: join(homedir(), ".think", "profiles"),

  // Active profile file
  activeProfileFile: join(homedir(), ".think", "active"),

  // Output file (global CLAUDE.md that Claude reads automatically)
  claudeMdPath: join(homedir(), ".claude", "CLAUDE.md"),

  // Project context output directory
  claudeProjectsDir: join(homedir(), ".claude", "projects"),

  // Subdirectories in each profile
  dirs: {
    preferences: "preferences",
    skills: "skills",
    agents: "agents",
    memory: "memory",
    automation: "automation",
    templates: "templates",
  },

  // Core files (relative to profile root)
  files: {
    profile: "profile.md",
    tools: "preferences/tools.md",
    patterns: "preferences/patterns.md",
    antiPatterns: "preferences/anti-patterns.md",
    learnings: "memory/learnings.md",
    subagents: "automation/subagents.md",
    workflows: "automation/workflows.md",
    fileTree: "templates/file-tree.md",
  },

  // Initial profile name created during first-run
  defaultProfile: "default",
} as const;

/**
 * Get the project CLAUDE.md path for a given project directory.
 * Uses the same path convention Claude Code uses: ~/.claude/projects/<absolute-path>/CLAUDE.md
 */
export function getProjectClaudeMdPath(projectDir: string): string {
  // Convert absolute path to a safe directory name by replacing path separators
  const safePath = projectDir.replace(/^\//, "").replace(/\//g, "-");
  return join(CONFIG.claudeProjectsDir, safePath, "CLAUDE.md");
}

/**
 * Estimate token count from text (same heuristic used throughout)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}

/**
 * Get the currently active profile name
 */
export function getActiveProfile(): string {
  if (existsSync(CONFIG.activeProfileFile)) {
    const name = readFileSync(CONFIG.activeProfileFile, "utf-8").trim();
    // Validate profile name to prevent path traversal
    if (name && isValidProfileName(name) && existsSync(join(CONFIG.profilesDir, name))) {
      return name;
    }
  }
  // Fallback: return first available profile or "default"
  if (existsSync(CONFIG.profilesDir)) {
    const entries = readdirSync(CONFIG.profilesDir, { withFileTypes: true });
    const profiles = entries.filter(e => e.isDirectory() && isValidProfileName(e.name));
    if (profiles.length > 0) {
      return profiles[0]!.name;
    }
  }
  return CONFIG.defaultProfile;
}

/**
 * Set the active profile
 */
export function setActiveProfile(name: string): void {
  if (!isValidProfileName(name)) {
    throw new Error(`Invalid profile name "${name}"`);
  }
  writeFileSync(CONFIG.activeProfileFile, name);
}

/**
 * Get the path to a profile directory
 */
export function profilePath(profileName?: string): string {
  const name = profileName ?? getActiveProfile();
  return join(CONFIG.profilesDir, name);
}

/**
 * Helper to get full path within active profile
 */
export function thinkPath(...segments: string[]): string {
  // Check if we have the new profile structure
  if (existsSync(CONFIG.profilesDir)) {
    return join(profilePath(), ...segments);
  }
  // Fall back to legacy structure
  return join(CONFIG.thinkDir, ...segments);
}

/**
 * Helper to get full path within a specific profile
 */
export function profileFilePath(profileName: string, ...segments: string[]): string {
  return join(CONFIG.profilesDir, profileName, ...segments);
}
