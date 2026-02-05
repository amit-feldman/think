import chalk from "chalk";
import { printBanner } from "../../core/banner";

/**
 * Show help with command reference
 */
export async function helpCommand(): Promise<void> {
  printBanner();

  console.log(chalk.bold("Commands:\n"));

  const commands = [
    { cmd: "think", desc: "Launch interactive TUI" },
    { cmd: "think init", desc: "Initialize ~/.think with templates" },
    { cmd: "think setup", desc: "Interactive profile setup wizard" },
    { cmd: "think sync", desc: "Regenerate Claude plugin from ~/.think" },
    { cmd: "think status", desc: "Show current status" },
    { cmd: "", desc: "" },
    { cmd: "think learn <text>", desc: "Add a learning" },
    { cmd: "think review", desc: "Review pending learnings from Claude" },
    { cmd: "", desc: "" },
    { cmd: "think profile", desc: "Edit profile in $EDITOR" },
    { cmd: "think edit <file>", desc: "Edit any ~/.think file" },
    { cmd: "", desc: "" },
    { cmd: "think allow <cmd>", desc: "Add command to allowed list" },
    { cmd: "", desc: "" },
    { cmd: "think tree", desc: "Preview file tree for current directory" },
    { cmd: "think project learn", desc: "Generate CLAUDE.md for project" },
  ];

  for (const { cmd, desc } of commands) {
    if (!cmd) {
      console.log();
      continue;
    }
    console.log(`  ${chalk.green(cmd.padEnd(22))} ${chalk.dim(desc)}`);
  }

  console.log();
  console.log(chalk.bold("Edit shortcuts:\n"));

  const shortcuts = [
    "profile",
    "tools",
    "patterns",
    "anti-patterns",
    "commands",
    "learnings",
    "corrections",
    "pending",
    "subagents",
    "workflows",
  ];

  console.log(`  ${chalk.dim("think edit")} ${chalk.cyan(shortcuts.join(" | "))}`);

  console.log();
  console.log(chalk.bold("Files:\n"));
  console.log(`  ${chalk.dim("Source:")}   ~/.think/`);
  console.log(`  ${chalk.dim("Output:")}   ~/.claude/CLAUDE.md`);

  console.log();
}
