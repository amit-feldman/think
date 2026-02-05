import chalk from "chalk";

// Clean flush banner
const BANNER = `
╭────────────────────────────────────────────╮
│                                            │
│   ████████╗██╗  ██╗██╗███╗   ██╗██╗  ██╗   │
│   ╚══██╔══╝██║  ██║██║████╗  ██║██║ ██╔╝   │
│      ██║   ███████║██║██╔██╗ ██║█████╔╝    │
│      ██║   ██╔══██║██║██║╚██╗██║██╔═██╗    │
│      ██║   ██║  ██║██║██║ ╚████║██║  ██╗   │
│      ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝   │
│                                            │
│        Personal Context for Claude         │
│                                            │
╰────────────────────────────────────────────╯
`;

export function printBanner(): void {
  console.log(chalk.green(BANNER));
}

export function printCompactBanner(): void {
  console.log(chalk.green.bold("\n  THINK") + chalk.dim("  Personal Context for Claude\n"));
}
