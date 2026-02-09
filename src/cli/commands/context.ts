import chalk from "chalk";
import { getProjectClaudeMdPath } from "../../core/config.ts";
import { generateProjectContext } from "../../core/context.ts";
import type { ContextResult } from "../../core/context.ts";
import { loadContextConfig } from "../../core/project-config.ts";

export async function contextCommand(options: {
  budget?: string;
  force?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  const projectDir = process.cwd();

  console.log(`  ${chalk.dim("Scanning project...")}`);

  let result: ContextResult;
  try {
    result = await generateProjectContext(projectDir, {
      budget: options.budget ? parseInt(options.budget, 10) : undefined,
      force: options.force,
      dryRun: options.dryRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${chalk.red("\u25C6")} ${message}`);
    process.exit(1);
  }

  // Section summary
  const sectionCount = result.sections.length;
  const truncatedCount = result.truncated.length;

  console.log(
    `  ${chalk.cyan("\u25C6")} ${sectionCount} section${sectionCount !== 1 ? "s" : ""} generated` +
      (truncatedCount > 0
        ? chalk.dim(` · ${truncatedCount} truncated`)
        : "")
  );

  // Token budget (reflect actual default from .think.yaml or built-in defaults)
  let budgetValue: number;
  if (options.budget) {
    budgetValue = parseInt(options.budget, 10);
  } else {
    const cfg = await loadContextConfig(projectDir);
    budgetValue = cfg.budget;
  }
  const usedK = (result.totalTokens / 1000).toFixed(1);
  const budgetK = (budgetValue / 1000).toFixed(0);
  console.log(
    `  ${chalk.cyan("\u25C6")} Project context: ${chalk.bold(usedK + "k")} of ${budgetK}k token budget`
  );

  if (options.dryRun) {
    // Show section breakdown
    console.log();
    console.log(chalk.dim("  Section breakdown:"));
    for (const section of result.sections) {
      const sTokens = (section.tokens / 1000).toFixed(1);
      console.log(
        `    ${chalk.dim(String(section.priority).padStart(2))}  ${section.title.padEnd(30)} ${chalk.dim(sTokens + "k tokens")}`
      );
    }
    console.log();
    console.log(chalk.dim("  Dry run — nothing written."));
  } else {
    const outputPath = getProjectClaudeMdPath(projectDir);
    const shortPath = outputPath.replace(
      process.env.HOME || "~",
      "~"
    );
    console.log(
      `  ${chalk.cyan("\u25C6")} Written to ${chalk.dim(shortPath)}`
    );
  }
}
