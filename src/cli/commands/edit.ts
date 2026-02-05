import { existsSync } from "fs";
import { spawn } from "child_process";
import chalk from "chalk";
import { CONFIG, thinkPath, profilePath } from "../../core/config";
import { isPathWithin } from "../../core/security";

/**
 * Open any ~/.think file in $EDITOR
 */
export async function editCommand(file: string): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  // Support shortcuts
  const shortcuts: Record<string, string> = {
    profile: CONFIG.files.profile,
    tools: CONFIG.files.tools,
    patterns: CONFIG.files.patterns,
    "anti-patterns": CONFIG.files.antiPatterns,
    commands: CONFIG.files.allowedCommands,
    learnings: CONFIG.files.learnings,
    corrections: CONFIG.files.corrections,
    pending: CONFIG.files.pending,
    subagents: CONFIG.files.subagents,
    workflows: CONFIG.files.workflows,
    "file-tree": CONFIG.files.fileTree,
  };

  const resolvedFile = shortcuts[file] || file;
  const filePath = thinkPath(resolvedFile);

  // Security: Validate path stays within the profile directory
  if (!isPathWithin(profilePath(), filePath)) {
    console.log(chalk.red(`Invalid path: "${file}" is outside the profile directory`));
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.log(chalk.red(`File not found: ${filePath}`));
    console.log();
    console.log("Available shortcuts:");
    for (const [shortcut, path] of Object.entries(shortcuts)) {
      console.log(`  ${chalk.cyan(shortcut)} -> ${path}`);
    }
    process.exit(1);
  }

  const editor = process.env.EDITOR || "vi";

  console.log(chalk.dim(`Opening ${filePath} in ${editor}...`));

  const child = spawn(editor, [filePath], {
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log();
      console.log(chalk.dim("Run `think sync` to apply changes."));
    }
  });
}
