import { writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { detectProject } from "../../core/project-detect";
import { CONFIG } from "../../core/config";

/**
 * Initialize .think.yaml for current project
 */
export async function projectInitCommand(options: { force?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG.projectConfig);

  // Check if already exists
  if (existsSync(configPath) && !options.force) {
    console.log(chalk.yellow(`${CONFIG.projectConfig} already exists. Use --force to overwrite.`));
    return;
  }

  // Detect project type
  const project = await detectProject(cwd);

  const config = `# Think Project Configuration
# This file customizes how 'think' generates context for this project.

# Project type (auto-detected: ${project.type})
# Uncomment to override: type: ${project.type}

# Project name (auto-detected: ${project.name})
# name: ${project.name}

# Additional patterns to exclude from file tree
# excludes:
#   - "*.log"
#   - "tmp/"

# Additional patterns to include (overrides excludes)
# includes:
#   - "important.log"

# Custom file annotations
# annotations:
#   src/main.ts: "application entry point"
#   src/config.ts: "configuration loader"

# Project-specific context for Claude
# (This content will be included in the generated CLAUDE.md)
---

# Project Context

Add any project-specific context here that Claude should know about.
`;

  await writeFile(configPath, config);

  console.log(chalk.green(`Created ${CONFIG.projectConfig}`));
  console.log();
  console.log(`Detected type: ${chalk.cyan(project.type)}`);
  console.log(`Detected name: ${chalk.cyan(project.name)}`);
  console.log();
  console.log("Edit the file to customize, then run `think sync` to update the plugin.");
}
