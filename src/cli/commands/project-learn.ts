import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import { detectProject } from "../../core/project-detect";

/**
 * Generate a project CLAUDE.md with detected info
 */
export async function projectLearnCommand(options: {
  force?: boolean;
}): Promise<void> {
  const cwd = process.cwd();
  const claudeMdPath = join(cwd, "CLAUDE.md");

  if (existsSync(claudeMdPath) && !options.force) {
    console.log(chalk.yellow("CLAUDE.md already exists."));
    console.log(chalk.dim("Use --force to overwrite."));
    return;
  }

  console.log(chalk.blue("Analyzing project..."));

  const project = await detectProject(cwd);
  const lines: string[] = [];

  // Header
  lines.push(`# ${project.name}`);
  lines.push("");

  // Description
  if (project.description) {
    lines.push(project.description);
    lines.push("");
  }

  // Runtime & Stack summary
  const stackParts: string[] = [];
  stackParts.push(project.runtime.charAt(0).toUpperCase() + project.runtime.slice(1));
  if (project.monorepo) {
    stackParts.push(project.monorepo.tool);
  }
  if (project.frameworks.length > 0) {
    stackParts.push(...project.frameworks.slice(0, 3));
  }
  lines.push(`**Stack:** ${stackParts.join(", ")}`);
  lines.push("");

  // Monorepo structure
  if (project.monorepo) {
    lines.push("## Workspaces");
    lines.push("");

    // Group by type
    const grouped = new Map<string, typeof project.monorepo.workspaces>();
    for (const ws of project.monorepo.workspaces) {
      const type = ws.type || "other";
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(ws);
    }

    // Output grouped
    const typeOrder = ["app", "server", "service", "package", "cli", "tool", "other"];
    for (const type of typeOrder) {
      const workspaces = grouped.get(type);
      if (!workspaces || workspaces.length === 0) continue;

      const typeLabel = type === "other" ? "Other" : type.charAt(0).toUpperCase() + type.slice(1) + "s";
      lines.push(`### ${typeLabel}`);
      for (const ws of workspaces) {
        const desc = ws.description ? ` - ${ws.description}` : "";
        lines.push(`- \`${ws.path}\` (${ws.name})${desc}`);
      }
      lines.push("");
    }
  }

  // Tooling
  if (project.tooling.length > 0) {
    lines.push("## Tooling");
    lines.push("");
    lines.push(project.tooling.join(", "));
    lines.push("");
  }

  // Frameworks (if not already shown in stack or there are more)
  if (project.frameworks.length > 3) {
    lines.push("## Frameworks");
    lines.push("");
    lines.push(project.frameworks.join(", "));
    lines.push("");
  }

  const content = lines.join("\n");
  await writeFile(claudeMdPath, content);

  console.log(chalk.green("Created CLAUDE.md"));
  console.log(chalk.dim(`${lines.length} lines, ${content.length} bytes`));

  // Show summary
  console.log("");
  console.log(chalk.cyan("Detected:"));
  console.log(`  Runtime: ${project.runtime}`);
  if (project.monorepo) {
    console.log(`  Monorepo: ${project.monorepo.tool} (${project.monorepo.workspaces.length} workspaces)`);
  }
  if (project.frameworks.length > 0) {
    console.log(`  Frameworks: ${project.frameworks.join(", ")}`);
  }
  if (project.tooling.length > 0) {
    console.log(`  Tooling: ${project.tooling.join(", ")}`);
  }
}
