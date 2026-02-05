import { existsSync } from "fs";
import { readFile, readdir, stat } from "fs/promises";
import chalk from "chalk";
import { CONFIG, thinkPath, getActiveProfile } from "../../core/config";
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

  // Show active profile
  const profile = getActiveProfile();
  console.log(`Profile: ${chalk.cyan(profile)}`);

  // Check CLAUDE.md and show token estimate
  if (existsSync(CONFIG.claudeMdPath)) {
    const content = await readFile(CONFIG.claudeMdPath, "utf-8");
    const tokens = Math.ceil(content.length / 4);
    console.log(chalk.green(`✓ CLAUDE.md generated (~${formatTokens(tokens)} tokens)`));
  } else {
    console.log(chalk.yellow("○ CLAUDE.md not generated. Run `think sync`"));
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

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}
