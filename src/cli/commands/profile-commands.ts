import chalk from "chalk";
import * as p from "@clack/prompts";
import {
  listProfiles,
  switchProfile,
  createProfile,
  deleteProfile,
  profileExists,
} from "../../core/profiles";
import { getActiveProfile } from "../../core/config";
import { syncCommand } from "../commands/sync";

/**
 * List all profiles, showing which is active with a checkmark
 */
export async function profileListCommand(): Promise<void> {
  const profiles = listProfiles();

  if (profiles.length === 0) {
    console.log(chalk.yellow("No profiles found. Run `think init` first."));
    return;
  }

  console.log("Profiles:");
  for (const profile of profiles) {
    if (profile.isActive) {
      console.log(`  ${chalk.green("\u2713")} ${chalk.cyan(profile.name)} (active)`);
    } else {
      console.log(`    ${chalk.cyan(profile.name)}`);
    }
  }
}

/**
 * Switch to a profile, then run sync
 */
export async function profileUseCommand(name: string): Promise<void> {
  if (!profileExists(name)) {
    console.log(chalk.red(`Profile "${name}" does not exist.`));
    console.log();
    console.log("Available profiles:");
    const profiles = listProfiles();
    for (const profile of profiles) {
      console.log(`  - ${chalk.cyan(profile.name)}`);
    }
    process.exit(1);
  }

  const currentProfile = getActiveProfile();
  if (currentProfile === name) {
    console.log(chalk.yellow(`Already using profile "${name}".`));
    return;
  }

  try {
    switchProfile(name);
    console.log(chalk.green(`Switched to profile "${chalk.cyan(name)}".`));
    console.log();
    await syncCommand();
  } catch (error) {
    console.error(chalk.red(`Failed to switch profile: ${error}`));
    process.exit(1);
  }
}

/**
 * Create a new profile, optionally copying from an existing one
 */
export async function profileCreateCommand(
  name: string,
  options: { from?: string }
): Promise<void> {
  if (profileExists(name)) {
    console.log(chalk.red(`Profile "${name}" already exists.`));
    process.exit(1);
  }

  if (options.from && !profileExists(options.from)) {
    console.log(chalk.red(`Source profile "${options.from}" does not exist.`));
    process.exit(1);
  }

  try {
    createProfile(name, options.from);

    if (options.from) {
      console.log(
        chalk.green(
          `Created profile "${chalk.cyan(name)}" from "${chalk.cyan(options.from)}".`
        )
      );
    } else {
      console.log(chalk.green(`Created profile "${chalk.cyan(name)}".`));
    }

    console.log();
    console.log(`Run ${chalk.cyan(`think profile use ${name}`)} to switch to it.`);
  } catch (error) {
    console.error(chalk.red(`Failed to create profile: ${error}`));
    process.exit(1);
  }
}

/**
 * Delete a profile with confirmation
 */
export async function profileDeleteCommand(name: string): Promise<void> {
  if (!profileExists(name)) {
    console.log(chalk.red(`Profile "${name}" does not exist.`));
    process.exit(1);
  }

  const activeProfile = getActiveProfile();
  const isActive = activeProfile === name;

  const confirmMessage = isActive
    ? `Are you sure you want to delete the active profile "${name}"? This will switch to the default profile.`
    : `Are you sure you want to delete profile "${name}"?`;

  const confirmed = await p.confirm({
    message: confirmMessage,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    console.log(chalk.yellow("Deletion cancelled."));
    return;
  }

  try {
    deleteProfile(name);
    console.log(chalk.green(`Deleted profile "${chalk.cyan(name)}".`));

    if (isActive) {
      console.log();
      console.log(`Switched to default profile.`);
      await syncCommand();
    }
  } catch (error) {
    console.error(chalk.red(`Failed to delete profile: ${error}`));
    process.exit(1);
  }
}
