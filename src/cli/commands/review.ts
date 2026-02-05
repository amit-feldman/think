import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";
import { extractLearnings, addLearning } from "../../core/dedup";
import { syncCommand } from "./sync";
import * as readline from "readline";

/**
 * Review pending learnings from Claude
 */
export async function reviewCommand(): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  const pendingPath = thinkPath(CONFIG.files.pending);
  const learningsPath = thinkPath(CONFIG.files.learnings);

  // Read pending
  if (!existsSync(pendingPath)) {
    console.log(chalk.dim("No pending learnings to review."));
    return;
  }

  const pendingContent = await readFile(pendingPath, "utf-8");
  const pendingItems = extractLearnings(pendingContent);

  if (pendingItems.length === 0) {
    console.log(chalk.dim("No pending learnings to review."));
    return;
  }

  console.log(chalk.bold(`\n${pendingItems.length} pending learning(s) to review:\n`));

  // Read existing learnings
  let learningsContent = "";
  if (existsSync(learningsPath)) {
    learningsContent = await readFile(learningsPath, "utf-8");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  const approved: string[] = [];
  const rejected: string[] = [];

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    console.log(chalk.cyan(`[${i + 1}/${pendingItems.length}]`), item);

    const answer = await question(
      chalk.dim("  (a)pprove / (r)eject / (e)dit / (s)kip? ")
    );

    const action = answer.trim().toLowerCase();

    if (action === "a" || action === "approve") {
      const result = addLearning(learningsContent, item);
      if (result.added) {
        learningsContent = result.newContent;
        approved.push(item);
        console.log(chalk.green("  ✓ Approved\n"));
      } else {
        console.log(chalk.yellow(`  ○ Skipped (similar exists: "${result.similar}")\n`));
        rejected.push(item);
      }
    } else if (action === "e" || action === "edit") {
      const edited = await question(chalk.dim("  Enter edited learning: "));
      if (edited.trim()) {
        const result = addLearning(learningsContent, edited.trim());
        if (result.added) {
          learningsContent = result.newContent;
          approved.push(edited.trim());
          console.log(chalk.green("  ✓ Approved (edited)\n"));
        } else {
          console.log(chalk.yellow(`  ○ Skipped (similar exists)\n`));
          rejected.push(item);
        }
      }
    } else if (action === "r" || action === "reject") {
      rejected.push(item);
      console.log(chalk.red("  ✗ Rejected\n"));
    } else {
      // Skip - leave in pending
      console.log(chalk.dim("  → Skipped (will remain pending)\n"));
    }
  }

  rl.close();

  // Write updated learnings
  if (approved.length > 0) {
    await writeFile(learningsPath, learningsContent);
  }

  // Clear reviewed items from pending, keep skipped
  const remaining = pendingItems.filter(
    (item) => !approved.includes(item) && !rejected.includes(item)
  );

  if (remaining.length > 0) {
    const newPendingContent = `# Pending Learnings\n\nClaude's suggestions awaiting your review.\nUse \`think review\` to approve or reject these.\n\n${remaining.map((r) => `- ${r}`).join("\n")}\n`;
    await writeFile(pendingPath, newPendingContent);
  } else {
    // Reset to template
    const templateContent = `# Pending Learnings\n\nClaude's suggestions awaiting your review.\nUse \`think review\` to approve or reject these.\n\n`;
    await writeFile(pendingPath, templateContent);
  }

  console.log(chalk.bold("\nReview complete:"));
  console.log(`  Approved: ${chalk.green(approved.length)}`);
  console.log(`  Rejected: ${chalk.red(rejected.length)}`);
  console.log(`  Remaining: ${chalk.dim(remaining.length)}`);

  // Auto-sync if changes were made
  if (approved.length > 0) {
    console.log();
    await syncCommand();
  }
}
