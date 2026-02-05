import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";
import { syncCommand } from "./sync";

/**
 * Add a command to the allowed list
 */
export async function allowCommand(
  command: string,
  options: { noSync?: boolean }
): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  const allowedPath = thinkPath(CONFIG.files.allowedCommands);

  // Read existing content
  let content = "";
  if (existsSync(allowedPath)) {
    content = await readFile(allowedPath, "utf-8");
  }

  // Check if command already exists
  if (content.includes(`- ${command}`)) {
    console.log(chalk.yellow("Command already in allowed list:"));
    console.log(chalk.dim(`  "${command}"`));
    return;
  }

  // Append command
  const newContent = content.trimEnd() + `\n- ${command}\n`;
  await writeFile(allowedPath, newContent);

  console.log(chalk.green("Command added to allowed list:"));
  console.log(chalk.dim(`  "${command}"`));

  // Auto-sync unless disabled
  if (!options.noSync) {
    console.log();
    await syncCommand();
  }
}
