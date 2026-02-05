import { homedir } from "os";
import { join } from "path";

export const CONFIG = {
  // Source directory (user's preferences)
  thinkDir: join(homedir(), ".think"),

  // Output file (global CLAUDE.md that Claude reads automatically)
  claudeMdPath: join(homedir(), ".claude", "CLAUDE.md"),

  // Subdirectories in ~/.think
  dirs: {
    preferences: "preferences",
    permissions: "permissions",
    skills: "skills",
    agents: "agents",
    memory: "memory",
    automation: "automation",
    templates: "templates",
    projects: "projects",
  },

  // Core files
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

  // Project config file name
  projectConfig: ".think.yaml",
} as const;

// Helper to get full path within ~/.think
export function thinkPath(...segments: string[]): string {
  return join(CONFIG.thinkDir, ...segments);
}

// Helper to get full path within plugin output
export function pluginPath(...segments: string[]): string {
  return join(CONFIG.pluginDir, ...segments);
}
