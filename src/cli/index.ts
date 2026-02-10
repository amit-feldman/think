import { existsSync } from "fs";
import { Command } from "commander";
import { CONFIG } from "../core/config.ts";
import { ensureProfilesStructure, listProfiles } from "../core/profiles.ts";
import { launchTui } from "../tui/index.tsx";
import pkg from "../../package.json";

const program = new Command();

program
  .name("think")
  .description("Personal context manager for Claude")
  .version(pkg.version);

// Setup wizard
program
  .command("setup")
  .description("Interactive profile setup wizard")
  .option("-q, --quick", "Accept role-based defaults after identity phase")
  .action(async (options: { quick?: boolean }) => {
    const { setupCommand } = await import("./commands/setup.ts");
    await setupCommand(options);
  });

// Switch profile
program
  .command("switch <profile>")
  .description("Switch profile and auto-sync")
  .action(async (profileName: string) => {
    const { switchCommand } = await import("./commands/switch.ts");
    await switchCommand(profileName);
  });

// Project context
program
  .command("context")
  .description("Scan project and write project CLAUDE.md")
  .option("-b, --budget <tokens>", "Token budget (e.g. 8000)")
  .option("-f, --force", "Force regeneration")
  .option("-n, --dry-run", "Show breakdown without writing")
  .action(async (options: { budget?: string; force?: boolean; dryRun?: boolean }) => {
    const { contextCommand } = await import("./commands/context.ts");
    await contextCommand(options);
  });

// Agents management
const agents = program
  .command("agents")
  .description("Manage custom agents");

agents
  .command("add")
  .description("Create a new agent from a template")
  .option("-t, --template <name>", "Template name (frontend, backend, reviewer, tester)")
  .action(async (options: { template?: string }) => {
    const { agentsAddCommand } = await import("./commands/agents.ts");
    await agentsAddCommand(options);
  });

// Quick-add learning
program
  .command("learn <text>")
  .description("Quick-add a learning and auto-sync")
  .action(async (text: string) => {
    const { learnCommand } = await import("./commands/learn.ts");
    await learnCommand(text);
  });

// Status
program
  .command("status")
  .description("Show active profile, token counts, project context status")
  .action(async () => {
    const { statusCommand } = await import("./commands/status.ts");
    await statusCommand();
  });

// Default action (no subcommand)
program.action(async () => {
  // First-run: if ~/.think doesn't exist or has no profiles, auto-init and launch setup
  if (!existsSync(CONFIG.thinkDir) || listProfiles().length === 0) {
    ensureProfilesStructure();
    const { setupCommand } = await import("./commands/setup.ts");
    await setupCommand({});
    return;
  }

  // TTY available: launch TUI
  if (process.stdin.isTTY) {
    await launchTui();
    return;
  }

  // Non-TTY: show help
  program.help();
});

program.parse();
