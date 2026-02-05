import { mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import chalk from "chalk";
import { CONFIG, profileFilePath } from "../../core/config";
import { ensureProfilesStructure } from "../../core/profiles";

const TEMPLATE_DIR = join(dirname(dirname(dirname(__dirname))), "src", "templates");

/**
 * Initialize ~/.think with starter templates
 */
export async function initCommand(options: { force?: boolean }): Promise<void> {
  const { force } = options;

  // Check if already initialized
  if (existsSync(CONFIG.profilesDir) && !force) {
    console.log(chalk.yellow(`~/.think already initialized. Use --force to reinitialize.`));
    return;
  }

  console.log(chalk.blue("Initializing ~/.think..."));

  // Ensure base structure exists
  await mkdir(CONFIG.thinkDir, { recursive: true });
  ensureProfilesStructure();

  // Create directory structure in default profile
  const profileRoot = profileFilePath(CONFIG.defaultProfile);
  const dirs = [
    profileRoot,
    join(profileRoot, CONFIG.dirs.preferences),
    join(profileRoot, CONFIG.dirs.permissions),
    join(profileRoot, CONFIG.dirs.skills),
    join(profileRoot, CONFIG.dirs.agents),
    join(profileRoot, CONFIG.dirs.memory),
    join(profileRoot, CONFIG.dirs.automation),
    join(profileRoot, CONFIG.dirs.templates),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  // Copy templates to default profile
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
    const destPath = profileFilePath(CONFIG.defaultProfile, dest);

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
  console.log(`  1. Run ${chalk.cyan("think setup")} to configure your profile`);
  console.log(`  2. Run ${chalk.cyan("think sync")} to generate CLAUDE.md`);
  console.log(`  3. Start using Claude with your personal context!`);
  console.log();
  console.log(chalk.gray(`Profile: default (at ~/.think/profiles/default/)`));
}
