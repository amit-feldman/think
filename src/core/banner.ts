import chalk from "chalk";

export function printCompactBanner(): void {
  console.log(
    chalk.cyan.bold("  think") + chalk.dim(" · Personal Context for Claude")
  );
  console.log();
}
