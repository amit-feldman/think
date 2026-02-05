import { existsSync } from "fs";
import { readFile, readdir } from "fs/promises";
import chalk from "chalk";
import { CONFIG, thinkPath, pluginPath } from "../../core/config";
import { extractLearnings } from "../../core/dedup";
import { printBanner } from "../../core/banner";

/**
 * Show current status of think configuration
 */
export async function statusCommand(): Promise<void> {
  printBanner();

  // Check initialization
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("Not initialized. Run `think init` first."));
    return;
  }

  console.log(chalk.green("✓ ~/.think initialized"));

  // Check plugin
  if (existsSync(CONFIG.pluginDir)) {
    console.log(chalk.green("✓ Plugin generated at ~/.claude/plugins/think"));
  } else {
    console.log(chalk.yellow("○ Plugin not generated. Run `think sync`"));
  }

  console.log();

  // Count learnings
  const learningsPath = thinkPath(CONFIG.files.learnings);
  if (existsSync(learningsPath)) {
    const content = await readFile(learningsPath, "utf-8");
    const learnings = extractLearnings(content);
    console.log(`Learnings: ${chalk.cyan(learnings.length)}`);
  }

  // Count pending
  const pendingPath = thinkPath(CONFIG.files.pending);
  if (existsSync(pendingPath)) {
    const content = await readFile(pendingPath, "utf-8");
    const pending = extractLearnings(content);
    if (pending.length > 0) {
      console.log(`Pending review: ${chalk.yellow(pending.length)}`);
    } else {
      console.log(`Pending review: ${chalk.dim("0")}`);
    }
  }

  // Count skills
  const skillsDir = thinkPath(CONFIG.dirs.skills);
  if (existsSync(skillsDir)) {
    const skills = (await readdir(skillsDir)).filter((f) => f.endsWith(".md"));
    console.log(`Custom skills: ${chalk.cyan(skills.length)}`);
  }

  // Count agents
  const agentsDir = thinkPath(CONFIG.dirs.agents);
  if (existsSync(agentsDir)) {
    const agents = (await readdir(agentsDir)).filter((f) => f.endsWith(".md"));
    console.log(`Custom agents: ${chalk.cyan(agents.length)}`);
  }

  console.log();
}
