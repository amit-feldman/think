import { mkdir, copyFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";

const TEMPLATE_DIR = join(dirname(dirname(dirname(__dirname))), "src", "templates");

/**
 * Initialize ~/.think with starter templates
 */
export async function initCommand(options: { force?: boolean }): Promise<void> {
  const { force } = options;

  // Check if already initialized
  if (existsSync(CONFIG.thinkDir) && !force) {
    console.log(chalk.yellow(`~/.think already exists. Use --force to reinitialize.`));
    return;
  }

  console.log(chalk.blue("Initializing ~/.think..."));

  // Create directory structure
  const dirs = [
    CONFIG.thinkDir,
    thinkPath(CONFIG.dirs.preferences),
    thinkPath(CONFIG.dirs.permissions),
    thinkPath(CONFIG.dirs.skills),
    thinkPath(CONFIG.dirs.agents),
    thinkPath(CONFIG.dirs.memory),
    thinkPath(CONFIG.dirs.automation),
    thinkPath(CONFIG.dirs.templates),
    thinkPath(CONFIG.dirs.projects),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  // Copy templates
  const templateMap: Record<string, string> = {
    "profile.md": CONFIG.files.profile,
    "tools.md": CONFIG.files.tools,
    "patterns.md": CONFIG.files.patterns,
    "anti-patterns.md": CONFIG.files.antiPatterns,
    "allowed-commands.md": CONFIG.files.allowedCommands,
    "settings.md": CONFIG.files.settings,
    "learnings.md": CONFIG.files.learnings,
    "corrections.md": CONFIG.files.corrections,
    "pending.md": CONFIG.files.pending,
    "subagents.md": CONFIG.files.subagents,
    "workflows.md": CONFIG.files.workflows,
    "file-tree.md": CONFIG.files.fileTree,
  };

  for (const [template, dest] of Object.entries(templateMap)) {
    const srcPath = join(TEMPLATE_DIR, template);
    const destPath = thinkPath(dest);

    // Only copy if destination doesn't exist (unless force)
    if (!existsSync(destPath) || force) {
      if (existsSync(srcPath)) {
        await copyFile(srcPath, destPath);
        console.log(chalk.green(`  Created ${dest}`));
      }
    }
  }

  console.log();
  console.log(chalk.green("Done! Your ~/.think directory is ready."));
  console.log();
  console.log("Next steps:");
  console.log(`  1. Edit ${chalk.cyan("~/.think/profile.md")} with your preferences`);
  console.log(`  2. Run ${chalk.cyan("think sync")} to generate the Claude plugin`);
  console.log(`  3. Start using Claude with your personal context!`);
}
