#!/usr/bin/env bun
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { syncCommand } from "./commands/sync";
import { learnCommand } from "./commands/learn";
import { statusCommand } from "./commands/status";
import { profileCommand } from "./commands/profile";
import { editCommand } from "./commands/edit";
import { allowCommand } from "./commands/allow";
import { reviewCommand } from "./commands/review";
import { treeCommand } from "./commands/tree";
import { projectInitCommand } from "./commands/project";
import { helpCommand } from "./commands/help";
import { setupCommand } from "./commands/setup";
import { printBanner } from "../core/banner";
import { launchTui } from "../tui";
import pkg from "../../package.json";

const program = new Command();

program
  .name("think")
  .description("Personal context manager for Claude")
  .version(pkg.version);

// Initialize ~/.think
program
  .command("init")
  .description("Initialize ~/.think with starter templates")
  .option("-f, --force", "Reinitialize even if already exists")
  .action(initCommand);

// Sync to Claude plugin
program
  .command("sync")
  .description("Regenerate Claude plugin from ~/.think")
  .action(syncCommand);

// Add a learning
program
  .command("learn <learning>")
  .description("Add a new learning")
  .option("--no-sync", "Don't auto-sync after adding")
  .action(learnCommand);

// Show status
program
  .command("status")
  .description("Show current think status")
  .action(statusCommand);

// Edit profile
program
  .command("profile")
  .description("Open profile.md in $EDITOR")
  .action(profileCommand);

// Edit any file
program
  .command("edit <file>")
  .description("Open a ~/.think file in $EDITOR")
  .action(editCommand);

// Allow a command
program
  .command("allow <command>")
  .description("Add a command to the allowed list")
  .option("--no-sync", "Don't auto-sync after adding")
  .action(allowCommand);

// Review pending learnings
program
  .command("review")
  .description("Review pending learnings from Claude")
  .action(reviewCommand);

// File tree preview
program
  .command("tree")
  .description("Preview file tree for current directory")
  .action(treeCommand);

// Project commands
const projectCmd = program
  .command("project")
  .description("Project-specific commands");

projectCmd
  .command("init")
  .description("Initialize .think.yaml for current project")
  .option("-f, --force", "Overwrite existing config")
  .action(projectInitCommand);

// Help command
program
  .command("help")
  .description("Show help and command reference")
  .action(helpCommand);

// Setup wizard
program
  .command("setup")
  .description("Interactive profile setup wizard")
  .action(setupCommand);

// Default action (no subcommand) - launch TUI
program.action(async () => {
  // Check if we have a TTY (required for TUI)
  if (!process.stdin.isTTY) {
    printBanner();
    console.log("TUI requires an interactive terminal.\n");
    console.log("Available commands:");
    console.log("  think init      Initialize ~/.think");
    console.log("  think sync      Sync to Claude plugin");
    console.log("  think status    Show status");
    console.log("  think learn     Add a learning");
    console.log("  think review    Review pending learnings");
    console.log("  think profile   Edit profile");
    console.log("  think edit      Edit any file");
    console.log("  think allow     Allow a command");
    console.log();
    return;
  }
  launchTui();
});

program.parse();
