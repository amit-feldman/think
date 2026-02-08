import { readFile } from "fs/promises";
import { existsSync } from "fs";
import chalk from "chalk";
import { CONFIG, estimateTokens, formatTokens } from "../../core/config.ts";
import { profileExists, switchProfile } from "../../core/profiles.ts";
import { generatePlugin } from "../../core/generator.ts";

export async function switchCommand(profileName: string): Promise<void> {
  if (!profileExists(profileName)) {
    console.log(
      chalk.red(`  Profile "${profileName}" does not exist.`)
    );
    process.exit(1);
  }

  switchProfile(profileName);
  await generatePlugin();

  let tokenInfo = "";
  if (existsSync(CONFIG.claudeMdPath)) {
    const content = await readFile(CONFIG.claudeMdPath, "utf-8");
    const tokens = estimateTokens(content);
    tokenInfo = ` (${formatTokens(tokens)} tokens)`;
  }

  console.log(
    `  ${chalk.cyan("\u25C6")} Switched to ${chalk.bold(profileName)} profile`
  );
  console.log(
    `  ${chalk.cyan("\u25C6")} Synced ~/.claude/CLAUDE.md${chalk.dim(tokenInfo)}`
  );
}
