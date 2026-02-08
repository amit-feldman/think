import { existsSync } from "fs";
import { readFile } from "fs/promises";
import chalk from "chalk";
import {
  CONFIG,
  getActiveProfile,
  thinkPath,
  getProjectClaudeMdPath,
  estimateTokens,
  formatTokens,
} from "../../core/config.ts";
import { parseMarkdown } from "../../core/parser.ts";
import { extractLearnings } from "../../core/dedup.ts";

export async function statusCommand(): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(
      chalk.red(`  ~/.think not found. Run ${chalk.bold("think setup")} first.`)
    );
    process.exit(1);
  }

  const profileName = getActiveProfile();

  // Read profile frontmatter for style/role
  const profilePath = thinkPath(CONFIG.files.profile);
  const profile = await parseMarkdown(profilePath);
  const role = profile?.frontmatter?.role as string | undefined;
  const style = profile?.frontmatter?.style as string | undefined;

  // Profile line
  const profileMeta = [profileName, style, role].filter(Boolean).join(" \u00B7 ");
  console.log(`  ${chalk.dim("Profile".padEnd(12))}${chalk.bold(profileMeta)}`);

  // Personal CLAUDE.md
  if (existsSync(CONFIG.claudeMdPath)) {
    const content = await readFile(CONFIG.claudeMdPath, "utf-8");
    const tokens = estimateTokens(content);
    console.log(
      `  ${chalk.dim("Personal".padEnd(12))}~/.claude/CLAUDE.md ${chalk.dim(`(${formatTokens(tokens)} tokens)`)}`
    );
  } else {
    console.log(
      `  ${chalk.dim("Personal".padEnd(12))}${chalk.yellow("not synced")} ${chalk.dim("- run think setup")}`
    );
  }

  // Project context
  const projectDir = process.cwd();
  const projectClaudeMdPath = getProjectClaudeMdPath(projectDir);

  if (existsSync(projectClaudeMdPath)) {
    const content = await readFile(projectClaudeMdPath, "utf-8");
    const tokens = estimateTokens(content);
    const dirName = projectDir.split("/").pop() || "project";
    const shortPath = projectClaudeMdPath.replace(process.env.HOME || "~", "~");
    console.log(
      `  ${chalk.dim("Project".padEnd(12))}${chalk.bold(dirName)} \u00B7 ${shortPath} ${chalk.dim(`(${formatTokens(tokens)} tokens)`)}`
    );
  } else {
    const dirName = projectDir.split("/").pop() || "project";
    console.log(
      `  ${chalk.dim("Project".padEnd(12))}${dirName} ${chalk.dim("- run think context")}`
    );
  }

  // Learnings count
  const learningsPath = thinkPath(CONFIG.files.learnings);
  let learningCount = 0;
  if (existsSync(learningsPath)) {
    const content = await readFile(learningsPath, "utf-8");
    learningCount = extractLearnings(content).length;
  }

  console.log(
    `  ${chalk.dim("Learnings".padEnd(12))}${learningCount}`
  );
}
