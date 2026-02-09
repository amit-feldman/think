import { existsSync, mkdirSync, readdirSync } from "fs";
import { writeFile } from "fs/promises";
import chalk from "chalk";
import { select } from "@clack/prompts";
import { CONFIG, thinkPath } from "../../core/config.ts";
import { listAgentTemplates, loadAgentTemplate, getTemplateDescription } from "../../core/agent-templates.ts";
import { generateUniqueFilename } from "../../core/names.ts";
import { generatePlugin } from "../../core/generator.ts";

export async function agentsAddCommand(options: { template?: string }): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(
      chalk.red(`  ~/.think not found. Run ${chalk.bold("think setup")} first.`)
    );
    process.exit(1);
  }

  const agentsDir = thinkPath(CONFIG.dirs.agents);
  mkdirSync(agentsDir, { recursive: true });

  const templates = await listAgentTemplates();
  let templateName: string;

  if (options.template) {
    if (options.template !== "blank" && !templates.includes(options.template)) {
      console.log(
        chalk.red(`  Unknown template "${options.template}". Available: blank, ${templates.join(", ")}`)
      );
      process.exit(1);
    }
    templateName = options.template;
  } else {
    // Interactive selection
    const choices: { value: string; label: string; hint?: string }[] = [
      { value: "blank", label: "Blank", hint: "Empty agent file" },
    ];
    for (const t of templates) {
      const desc = await getTemplateDescription(t);
      choices.push({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1), hint: desc });
    }

    const result = await select({
      message: "Choose a template",
      options: choices,
    });

    if (typeof result === "symbol") {
      // User cancelled
      return;
    }
    templateName = result as string;
  }

  // Avoid overwriting existing agents
  const existing = existsSync(agentsDir)
    ? readdirSync(agentsDir).filter(f => f.endsWith(".md")).map(f => f.replace(".md", ""))
    : [];

  let filename: string;
  if (templateName === "blank" || existing.includes(templateName)) {
    filename = generateUniqueFilename(existing);
  } else {
    filename = `${templateName}.md`;
  }
  const filePath = thinkPath(CONFIG.dirs.agents, filename);

  if (templateName !== "blank") {
    const content = await loadAgentTemplate(templateName);
    await writeFile(filePath, content);
  } else {
    await writeFile(
      filePath,
      `---\nname: New Agent\ndescription: \ntrigger: \ntools: []\n---\n\nAgent instructions here.\n`
    );
  }

  console.log(`  ${chalk.cyan("\u25C6")} Created ${chalk.bold(filename)} in agents/`);

  await generatePlugin();
  console.log(`  ${chalk.cyan("\u25C6")} Synced ~/.claude/CLAUDE.md`);
}
