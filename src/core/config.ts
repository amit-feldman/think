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

  // Subdirectories in each profile
  dirs: {
    preferences: "preferences",
    permissions: "permissions",
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
    allowedCommands: "permissions/allowed-commands.md",
    settings: "permissions/settings.md",
    learnings: "memory/learnings.md",
    corrections: "memory/corrections.md",
    pending: "memory/pending.md",
    subagents: "automation/subagents.md",
    workflows: "automation/workflows.md",
    fileTree: "templates/file-tree.md",
  },

  // Plugin output files
  plugin: {
    manifest: "plugin.json",
    claudeMd: "CLAUDE.md",
  },

  // Initial profile name created by `think init`
  defaultProfile: "default",
} as const;

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
      return profiles[0].name;
    }
  }
  return CONFIG.defaultProfile;
}

/**
 * Set the active profile
 */
export function setActiveProfile(name: string): void {
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
