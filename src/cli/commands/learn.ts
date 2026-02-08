import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config.ts";
import { addLearning, extractLearnings } from "../../core/dedup.ts";
import { generatePlugin } from "../../core/generator.ts";

export async function learnCommand(learning: string): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(
      chalk.red(`  ~/.think not found. Run ${chalk.bold("think setup")} first.`)
    );
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
    console.log(
      `  ${chalk.yellow("\u25C6")} Similar learning already exists:`
    );
    console.log(chalk.dim(`    "${result.similar}"`));
    return;
  }

  // Write updated content
  await writeFile(learningsPath, result.newContent);

  // Count total learnings
  const total = extractLearnings(result.newContent).length;

  console.log(
    `  ${chalk.cyan("\u25C6")} Added learning (${chalk.bold(String(total))} total)`
  );

  // Auto-sync
  await generatePlugin();

  console.log(
    `  ${chalk.cyan("\u25C6")} Synced ~/.claude/CLAUDE.md`
  );
}
