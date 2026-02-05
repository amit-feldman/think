import { existsSync } from "fs";
import chalk from "chalk";
import { CONFIG } from "../../core/config";
import { generatePlugin } from "../../core/generator";

/**
 * Regenerate the Claude plugin from ~/.think sources
 */
export async function syncCommand(): Promise<void> {
  // Check if ~/.think exists
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  console.log(chalk.blue("Syncing ~/.think to ~/.claude/CLAUDE.md..."));

  try {
    await generatePlugin();

    console.log(chalk.green("Done!"));
    console.log();
    console.log(`Generated: ${chalk.cyan(CONFIG.claudeMdPath)}`);
    console.log();
    console.log("Claude will automatically load your context in new sessions.");
  } catch (error) {
    console.error(chalk.red("Failed to sync:"), error);
    process.exit(1);
  }
}
