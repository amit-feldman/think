import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import * as readline from "readline";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";
import { printBanner } from "../../core/banner";
import { syncCommand } from "./sync";

interface SetupAnswers {
  name: string;
  style: "direct" | "conversational" | "detailed";
  packageManager: "bun" | "pnpm" | "npm" | "yarn";
  languages: string[];
  backend: string;
  frontend: string;
  css: string;
  database: string;
  infrastructure: string;
  monorepo: string;
  testing: string[];
  linting: string[];
  validation: string[];
  editor: string;
  avoidAll: boolean;
}

/**
 * Interactive profile setup wizard
 */
export async function setupCommand(): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  printBanner();
  console.log(chalk.bold("Profile Setup\n"));
  console.log(chalk.dim("Let's configure your preferences.\n"));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  const select = async (
    prompt: string,
    options: { key: string; label: string }[]
  ): Promise<string> => {
    console.log(chalk.cyan(prompt));
    options.forEach((opt, i) => {
      console.log(`  ${chalk.green(i + 1)}) ${opt.label}`);
    });
    const answer = await question(chalk.dim("Enter number: "));
    const idx = parseInt(answer) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx].key;
    }
    return options[0].key;
  };

  const multiSelect = async (
    prompt: string,
    options: { key: string; label: string }[]
  ): Promise<string[]> => {
    console.log(chalk.cyan(prompt));
    options.forEach((opt, i) => {
      console.log(`  ${chalk.green(i + 1)}) ${opt.label}`);
    });
    const answer = await question(chalk.dim("Enter numbers (comma-separated): "));
    const indices = answer.split(",").map((s) => parseInt(s.trim()) - 1);
    return indices
      .filter((i) => i >= 0 && i < options.length)
      .map((i) => options[i].key);
  };

  try {
    // Name
    const name = await question(chalk.cyan("What's your name? "));
    console.log();

    // Communication style
    const style = await select("What communication style do you prefer?", [
      { key: "direct", label: "Direct & minimal - no fluff, just answers" },
      { key: "conversational", label: "Conversational - friendly but efficient" },
      { key: "detailed", label: "Detailed - thorough explanations" },
    ]);
    console.log();

    // Package manager
    const packageManager = await select("Preferred package manager?", [
      { key: "bun", label: "bun" },
      { key: "pnpm", label: "pnpm" },
      { key: "npm", label: "npm" },
      { key: "yarn", label: "yarn" },
    ]);
    console.log();

    // Bun-specific features
    let bunFeatures: string[] = [];
    if (packageManager === "bun") {
      bunFeatures = await multiSelect("Bun features you use?", [
        { key: "catalog", label: "Dependency catalog" },
        { key: "workspaces", label: "Bun workspaces" },
        { key: "macros", label: "Bun macros" },
        { key: "shell", label: "Bun shell ($``)" },
        { key: "sqlite", label: "bun:sqlite" },
        { key: "test", label: "bun test" },
      ]);
      console.log();
    }

    // Languages
    const languages = await multiSelect("Primary programming languages?", [
      { key: "TypeScript", label: "TypeScript" },
      { key: "JavaScript", label: "JavaScript" },
      { key: "Python", label: "Python" },
      { key: "Ruby", label: "Ruby" },
      { key: "Rust", label: "Rust" },
      { key: "Go", label: "Go" },
      { key: "Java", label: "Java" },
      { key: "C#", label: "C#" },
      { key: "PHP", label: "PHP" },
      { key: "Elixir", label: "Elixir" },
    ]);
    console.log();

    // Backend framework
    const backend = await select("Backend framework?", [
      { key: "none", label: "None / Custom" },
      { key: "Rails", label: "Ruby on Rails" },
      { key: "Django", label: "Django" },
      { key: "FastAPI", label: "FastAPI" },
      { key: "Express", label: "Express.js" },
      { key: "Hono", label: "Hono" },
      { key: "Phoenix", label: "Phoenix (Elixir)" },
      { key: "Spring", label: "Spring Boot" },
      { key: "ASP.NET", label: "ASP.NET Core" },
      { key: "Laravel", label: "Laravel" },
    ]);
    console.log();

    // Frontend framework
    const frontend = await select("Frontend framework?", [
      { key: "none", label: "None / Backend only" },
      { key: "React", label: "React" },
      { key: "Vue", label: "Vue.js" },
      { key: "Svelte", label: "Svelte" },
      { key: "Angular", label: "Angular" },
      { key: "Solid", label: "SolidJS" },
      { key: "HTMX", label: "HTMX" },
    ]);
    console.log();

    // CSS/UI framework
    const css = await select("CSS / UI framework?", [
      { key: "none", label: "Plain CSS / None" },
      { key: "Tailwind", label: "Tailwind CSS" },
      { key: "Vuetify", label: "Vuetify" },
      { key: "Bootstrap", label: "Bootstrap" },
      { key: "Material UI", label: "Material UI" },
      { key: "shadcn/ui", label: "shadcn/ui" },
      { key: "CSS Modules", label: "CSS Modules" },
      { key: "styled-components", label: "styled-components" },
    ]);
    console.log();

    // Database
    const database = await select("Primary database?", [
      { key: "none", label: "None" },
      { key: "PostgreSQL", label: "PostgreSQL" },
      { key: "MySQL", label: "MySQL" },
      { key: "MongoDB", label: "MongoDB" },
      { key: "SQLite", label: "SQLite" },
      { key: "Redis", label: "Redis" },
      { key: "Supabase", label: "Supabase" },
      { key: "Firebase", label: "Firebase" },
    ]);
    console.log();

    // ORM / Database tools
    const orm = await multiSelect("ORM / database tools?", [
      { key: "Prisma", label: "Prisma" },
      { key: "Drizzle", label: "Drizzle" },
      { key: "TypeORM", label: "TypeORM" },
      { key: "Kysely", label: "Kysely" },
      { key: "Sequelize", label: "Sequelize" },
      { key: "Mongoose", label: "Mongoose" },
      { key: "ActiveRecord", label: "ActiveRecord (Rails)" },
      { key: "SQLAlchemy", label: "SQLAlchemy" },
      { key: "Django ORM", label: "Django ORM" },
    ]);
    console.log();

    // Auth
    const auth = await multiSelect("Authentication?", [
      { key: "better-auth", label: "better-auth" },
      { key: "Auth.js", label: "Auth.js (NextAuth)" },
      { key: "Lucia", label: "Lucia" },
      { key: "Clerk", label: "Clerk" },
      { key: "Supabase Auth", label: "Supabase Auth" },
      { key: "Firebase Auth", label: "Firebase Auth" },
      { key: "Passport.js", label: "Passport.js" },
      { key: "Devise", label: "Devise (Rails)" },
    ]);
    console.log();

    // Infrastructure
    const infrastructure = await select("Infrastructure / containerization?", [
      { key: "none", label: "None" },
      { key: "Docker Compose", label: "Docker + Compose" },
      { key: "Docker", label: "Docker only" },
      { key: "Kubernetes", label: "Kubernetes" },
      { key: "Fly.io", label: "Fly.io" },
      { key: "Vercel", label: "Vercel" },
      { key: "Railway", label: "Railway" },
    ]);
    console.log();

    // Monorepo
    const monorepo = await select("Monorepo tooling?", [
      { key: "none", label: "None / Single repo" },
      { key: "Turborepo", label: "Turborepo" },
      { key: "Bun workspaces", label: "Bun workspaces" },
      { key: "Nx", label: "Nx" },
      { key: "pnpm workspaces", label: "pnpm workspaces" },
      { key: "Lerna", label: "Lerna" },
    ]);
    console.log();

    // Testing
    const testing = await multiSelect("Testing frameworks?", [
      { key: "bun test", label: "bun test" },
      { key: "Vitest", label: "Vitest" },
      { key: "Jest", label: "Jest" },
      { key: "RSpec", label: "RSpec" },
      { key: "pytest", label: "pytest" },
      { key: "Playwright", label: "Playwright (E2E)" },
      { key: "Cypress", label: "Cypress (E2E)" },
    ]);
    console.log();

    // Linting/Formatting
    const linting = await multiSelect("Linting & formatting?", [
      { key: "Biome", label: "Biome" },
      { key: "ESLint", label: "ESLint" },
      { key: "Prettier", label: "Prettier" },
      { key: "oxlint", label: "oxlint" },
      { key: "Rubocop", label: "Rubocop" },
      { key: "Ruff", label: "Ruff (Python)" },
      { key: "rustfmt", label: "rustfmt" },
      { key: "gofmt", label: "gofmt" },
    ]);
    console.log();

    // Validation/Schema
    const validation = await multiSelect("Validation & schema libraries?", [
      { key: "Zod", label: "Zod" },
      { key: "Yup", label: "Yup" },
      { key: "Valibot", label: "Valibot" },
      { key: "ArkType", label: "ArkType" },
      { key: "io-ts", label: "io-ts" },
      { key: "TypeBox", label: "TypeBox" },
      { key: "Pydantic", label: "Pydantic" },
      { key: "Joi", label: "Joi" },
    ]);
    console.log();

    // Editor
    const editor = await select("Primary editor?", [
      { key: "Zed", label: "Zed" },
      { key: "VS Code", label: "VS Code" },
      { key: "Cursor", label: "Cursor" },
      { key: "Neovim", label: "Neovim" },
    ]);
    console.log();

    // Avoid patterns
    const avoidAnswer = await select("What should Claude avoid?", [
      { key: "all", label: "All: over-engineering, verbose explanations, extra features" },
      { key: "some", label: "Just over-engineering" },
      { key: "none", label: "No specific restrictions" },
    ]);
    console.log();

    rl.close();

    // Generate profile
    const styleDescriptions: Record<string, string[]> = {
      direct: [
        "Be direct and minimal - no fluff, just answers and code",
        "Skip lengthy reasoning unless asked",
        "Don't explain obvious things",
      ],
      conversational: [
        "Be friendly but efficient",
        "Brief explanations when helpful",
        "Keep a conversational tone",
      ],
      detailed: [
        "Provide thorough explanations",
        "Include context and reasoning",
        "Explain trade-offs and alternatives",
      ],
    };

    const profileContent = `---
name: ${name}
style: ${style}
---

# Communication Preferences

${styleDescriptions[style].map((s) => `- ${s}`).join("\n")}
- No emojis unless explicitly requested
- Show code when it's clearer than explanation

# Work Style

- Prefer practical solutions over theoretical
- Match existing code patterns in the project
`;

    await writeFile(thinkPath(CONFIG.files.profile), profileContent);

    // Generate tools preferences
    const toolsSections: string[] = ["# Tool Preferences"];

    // Runtime & Package Manager
    const pmAlternatives = ["npm", "pnpm", "yarn", "Node.js"].filter(
      (p) => p.toLowerCase() !== packageManager.toLowerCase()
    );
    const pmSection = [`- Use ${packageManager === "bun" ? "Bun" : packageManager}${pmAlternatives.length ? ` (not ${pmAlternatives.join(", ")})` : ""}`];

    if (bunFeatures.length > 0) {
      if (bunFeatures.includes("catalog")) pmSection.push("- Use Bun dependency catalog for shared deps");
      if (bunFeatures.includes("workspaces")) pmSection.push("- Use Bun workspaces for monorepos");
      if (bunFeatures.includes("macros")) pmSection.push("- Use Bun macros for compile-time code");
      if (bunFeatures.includes("shell")) pmSection.push("- Use Bun shell ($``) for shell commands");
      if (bunFeatures.includes("sqlite")) pmSection.push("- Use bun:sqlite for embedded database");
      if (bunFeatures.includes("test")) pmSection.push("- Use `bun test` for testing");
    } else {
      pmSection.push(`- Use \`${packageManager} test\` for testing`);
    }

    toolsSections.push(`
## Runtime & Package Manager
${pmSection.join("\n")}`);

    // Languages
    toolsSections.push(`
## Languages
${languages.map((l) => `- ${l}`).join("\n")}`);

    // Backend
    if (backend !== "none") {
      toolsSections.push(`
## Backend
- ${backend}`);
    }

    // Frontend
    if (frontend !== "none") {
      const frontendAlternatives = ["Next.js", "Vue", "Svelte", "Angular"].filter(
        (f) => f.toLowerCase() !== frontend.toLowerCase()
      );
      toolsSections.push(`
## Frontend
- ${frontend}${frontendAlternatives.length ? ` (not ${frontendAlternatives.slice(0, 2).join(", ")})` : ""}
- Prefer functional components with hooks`);

      // CSS
      if (css !== "none") {
        toolsSections.push(`- ${css} for styling`);
      }
    }

    // Database
    if (database !== "none") {
      const dbAlternatives = ["SQLite", "MySQL", "MongoDB", "PostgreSQL"].filter(
        (d) => d.toLowerCase() !== database.toLowerCase()
      );
      toolsSections.push(`
## Database
- ${database}${dbAlternatives.length ? ` (not ${dbAlternatives.slice(0, 3).join(", ")})` : ""}`);
    }

    // ORM
    if (orm.length > 0) {
      toolsSections.push(`
## ORM / Database Tools
${orm.map((o) => `- ${o}`).join("\n")}`);
    }

    // Auth
    if (auth.length > 0) {
      toolsSections.push(`
## Authentication
${auth.map((a) => `- ${a}`).join("\n")}`);
    }

    // Infrastructure
    if (infrastructure !== "none") {
      const infraAlternatives = infrastructure.includes("Kubernetes")
        ? []
        : ["Kubernetes"];
      toolsSections.push(`
## Infrastructure
- ${infrastructure} for containerization${infraAlternatives.length ? ` (not ${infraAlternatives.join(", ")})` : ""}
- Prefer simple Docker Compose for local dev`);
    }

    // Monorepo
    if (monorepo !== "none") {
      toolsSections.push(`
## Monorepo
- ${monorepo}`);
    }

    // Testing
    if (testing.length > 0) {
      toolsSections.push(`
## Testing
${testing.map((t) => `- ${t}`).join("\n")}`);
    }

    // Linting & Formatting
    if (linting.length > 0) {
      toolsSections.push(`
## Linting & Formatting
${linting.map((l) => `- ${l}`).join("\n")}
- Use project's existing config when present`);
    }

    // Validation
    if (validation.length > 0) {
      toolsSections.push(`
## Validation & Schema
${validation.map((v) => `- ${v}`).join("\n")}`);
    }

    // Editor
    toolsSections.push(`
## Editor
- Primary: ${editor}`);

    const toolsContent = toolsSections.join("\n");

    await writeFile(thinkPath(CONFIG.files.tools), toolsContent);

    // Generate anti-patterns if selected
    if (avoidAnswer === "all") {
      const antiSections: string[] = [`# Anti-Patterns to Avoid

## Code Style
- Don't add comments for obvious code
- Don't add type annotations that can be inferred
- Don't create abstractions for one-time use

## Architecture
- Don't over-engineer solutions
- Don't add features that weren't requested
- Don't create unnecessary indirection
- Don't add "future-proofing" complexity`];

      // Tech choices to avoid
      const techAvoid: string[] = [];
      if (packageManager === "bun") {
        techAvoid.push("- Don't suggest npm/yarn/pnpm - use Bun");
      }
      if (frontend === "React") {
        techAvoid.push("- Don't suggest Next.js - use plain React");
      }
      if (infrastructure === "Docker" || infrastructure === "Docker Compose") {
        techAvoid.push("- Don't suggest Kubernetes - use Docker");
      }
      if (database === "PostgreSQL") {
        techAvoid.push("- Don't suggest SQLite/MySQL/MongoDB - use PostgreSQL");
      }

      if (techAvoid.length > 0) {
        antiSections.push(`
## Tech Choices
${techAvoid.join("\n")}`);
      }

      antiSections.push(`
## Communication
- Don't explain obvious things
- Don't repeat back what was just said
- Don't pad responses with unnecessary context
`);

      await writeFile(thinkPath(CONFIG.files.antiPatterns), antiSections.join("\n"));
    }

    console.log(chalk.green("Profile created!\n"));

    // Sync
    await syncCommand();

    console.log();
    console.log(chalk.bold("Your profile is ready."));
    console.log(chalk.dim("Start a new Claude session to use your context."));
    console.log();
    console.log("To customize further:");
    console.log(`  ${chalk.cyan("think edit profile")}    Edit your profile`);
    console.log(`  ${chalk.cyan("think edit patterns")}   Add coding patterns`);
    console.log(`  ${chalk.cyan("think learn \"...\"")}    Add learnings over time`);

  } catch (error) {
    rl.close();
    throw error;
  }
}
