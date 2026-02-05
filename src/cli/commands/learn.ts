import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";
import { addLearning } from "../../core/dedup";
import { syncCommand } from "./sync";

/**
 * Add a new learning with deduplication
 */
export async function learnCommand(
  learning: string,
  options: { noSync?: boolean }
): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  const learningsPath = thinkPath(CONFIG.files.learnings);

  // Read existing content
  let content = "";
  if (existsSync(learningsPath)) {
    content = await readFile(learningsPath, "utf-8");
  }

  // Try to add learning with deduplication
  const result = addLearning(content, learning);

  if (!result.added) {
    console.log(chalk.yellow("Similar learning already exists:"));
    console.log(chalk.dim(`  "${result.similar}"`));
    console.log();
    console.log("Learning not added (duplicate detected).");
    return;
  }

  // Write updated content
  await writeFile(learningsPath, result.newContent);

  console.log(chalk.green("Learning added:"));
  console.log(chalk.dim(`  "${learning}"`));

  // Auto-sync unless disabled
  if (!options.noSync) {
    console.log();
    await syncCommand();
  }
}
