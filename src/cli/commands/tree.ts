import chalk from "chalk";
import { generateFileTree } from "../../core/file-tree";
import { detectProject } from "../../core/project-detect";

/**
 * Preview file tree for current directory
 */
export async function treeCommand(): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.blue("Detecting project..."));
  const project = await detectProject(cwd);

  console.log(chalk.dim(`Type: ${project.type}`));
  console.log(chalk.dim(`Name: ${project.name}`));
  if (project.configFile) {
    console.log(chalk.dim(`Config: ${project.configFile}`));
  }
  console.log();

  console.log(chalk.blue("Generating file tree...\n"));

  try {
    const tree = await generateFileTree(cwd);
    console.log(chalk.green(tree));
  } catch (error) {
    console.error(chalk.red("Failed to generate tree:"), error);
    process.exit(1);
  }
}
