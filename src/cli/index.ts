#!/usr/bin/env bun
import { Command } from "commander";
import { initCommand } from "./commands/init";
import { syncCommand } from "./commands/sync";
import { learnCommand } from "./commands/learn";
import { statusCommand } from "./commands/status";
import { profileCommand } from "./commands/profile";
import {
  profileListCommand,
  profileUseCommand,
  profileCreateCommand,
  profileDeleteCommand,
} from "./commands/profile-commands";
import { editCommand } from "./commands/edit";
import { allowCommand } from "./commands/allow";
import { reviewCommand } from "./commands/review";
import { treeCommand } from "./commands/tree";
import { projectLearnCommand } from "./commands/project-learn";
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

// Profile management commands
const profileCmd = program
  .command("profile")
  .description("Manage profiles");

profileCmd
  .command("list")
  .description("List all profiles")
  .action(profileListCommand);

profileCmd
  .command("use <name>")
  .description("Switch to a profile")
  .action(profileUseCommand);

profileCmd
  .command("create <name>")
  .description("Create a new profile")
  .option("--from <profile>", "Copy from existing profile")
  .action(profileCreateCommand);

profileCmd
  .command("delete <name>")
  .description("Delete a profile")
  .action(profileDeleteCommand);

profileCmd
  .command("edit")
  .description("Open profile.md in $EDITOR")
  .action(profileCommand);

// Also allow `think profile` with no subcommand to edit
profileCmd.action(profileCommand);

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

// Project command - generate project CLAUDE.md
program
  .command("project")
  .description("Generate CLAUDE.md for current project")
  .alias("project learn")
  .option("-f, --force", "Overwrite existing CLAUDE.md")
  .action(projectLearnCommand);

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
