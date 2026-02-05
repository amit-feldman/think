import { existsSync } from "fs";
import { readFile } from "fs/promises";
import chalk from "chalk";
import { CONFIG, getActiveProfile } from "../../core/config";
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

  const profile = getActiveProfile();
  console.log(chalk.blue(`Syncing profile "${chalk.cyan(profile)}" to ~/.claude/CLAUDE.md...`));

  try {
    await generatePlugin();

    // Calculate token estimate
    const content = await readFile(CONFIG.claudeMdPath, "utf-8");
    const tokens = Math.ceil(content.length / 4);

    console.log(chalk.green("Done!"));
    console.log();
    console.log(`Generated: ${chalk.cyan(CONFIG.claudeMdPath)}`);
    console.log(`Size: ~${chalk.magenta(formatTokens(tokens))} tokens`);
    console.log();
    console.log("Claude will automatically load your context in new sessions.");
  } catch (error) {
    console.error(chalk.red("Failed to sync:"), error);
    process.exit(1);
  }
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}
