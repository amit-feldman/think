import { existsSync } from "fs";
import { spawn } from "child_process";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";

/**
 * Open profile.md in $EDITOR
 */
export async function profileCommand(): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  const profilePath = thinkPath(CONFIG.files.profile);
  const editor = process.env.EDITOR || "vi";

  console.log(chalk.dim(`Opening ${profilePath} in ${editor}...`));

  const child = spawn(editor, [profilePath], {
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log();
      console.log(chalk.dim("Run `think sync` to apply changes."));
    }
  });
}
