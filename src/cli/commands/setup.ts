import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { CONFIG, thinkPath, estimateTokens, formatTokens } from "../../core/config.ts";
import { ensureProfilesStructure } from "../../core/profiles.ts";
import { generatePlugin } from "../../core/generator.ts";
import { detectProject } from "../../core/project-detect.ts";
import type { ProjectInfo } from "../../core/project-detect.ts";
import {
  styleDescriptions,
  roleDescriptions,
  personalityDescriptions,
  planningDescriptions,
  testingDescriptions,
  reviewDescriptions,
  gitDescriptions,
  docDescriptions,
  debugDescriptions,
  refactorDescriptions,
  roleWorkflowDefaults,
} from "../../core/profile-generator.ts";

// ── Helpers ───────────────────────────────────────────────────────

function handleCancel(): never {
  p.cancel("Setup cancelled");
  process.exit(0);
}

function guard<T>(value: T | symbol): T {
  if (p.isCancel(value)) handleCancel();
  return value as T;
}

function phase(n: number, label: string): void {
  p.note(chalk.bold(`[${n}/5] ${label}`));
}

async function selectWithOther(
  message: string,
  options: { value: string; label: string; hint?: string }[],
  initialValue?: string
): Promise<string> {
  const allOptions = [...options, { value: "__other__", label: "Other" }];
  const selected = guard(
    await p.select({ message, options: allOptions, initialValue })
  ) as string;

  if (selected === "__other__") {
    const custom = guard(
      await p.text({ message: `Enter custom value:`, placeholder: "..." })
    ) as string;
    return custom;
  }
  return selected;
}

async function multiselectWithOther(
  message: string,
  options: { value: string; label: string; hint?: string }[],
  required = false
): Promise<string[]> {
  const allOptions = [...options, { value: "__other__", label: "Other" }];
  const selected = guard(
    await p.multiselect({ message, options: allOptions, required })
  ) as string[];

  if (selected.includes("__other__")) {
    const custom = guard(
      await p.text({
        message: `Enter custom values (comma-separated):`,
        placeholder: "e.g. Tool1, Tool2",
      })
    ) as string;
    const customValues = custom
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return [...selected.filter((s) => s !== "__other__"), ...customValues];
  }
  return selected;
}

// ── Main setup command ────────────────────────────────────────────

export async function setupCommand(options: { quick?: boolean }): Promise<void> {
  // First-run: auto-init if ~/.think doesn't exist
  if (!existsSync(CONFIG.thinkDir)) {
    ensureProfilesStructure();
  }

  p.intro(chalk.bgCyan(chalk.black(" think setup ")));

  // ═════════════════════════════════════════════════════════════════
  // Phase 1: Identity
  // ═════════════════════════════════════════════════════════════════
  phase(1, "Identity");

  const name = guard(
    await p.text({
      message: "What's your name?",
      placeholder: "Your name",
    })
  ) as string;

  const role = guard(
    await p.select({
      message: "What's your role?",
      options: [
        { value: "senior-dev", label: "Senior Developer", hint: "experienced, autonomous" },
        { value: "mid-dev", label: "Mid-level Developer", hint: "growing, some guidance helpful" },
        { value: "junior-dev", label: "Junior Developer", hint: "learning, more explanation needed" },
        { value: "founder", label: "Founder / Tech Lead", hint: "building fast, shipping matters" },
        { value: "student", label: "Student", hint: "learning fundamentals" },
        { value: "hobbyist", label: "Hobbyist", hint: "exploring for fun" },
      ],
    })
  ) as string;

  const claudePersonality = guard(
    await p.select({
      message: "How should Claude behave?",
      options: [
        { value: "pair-programmer", label: "Pair Programmer", hint: "collaborative, thinks out loud" },
        { value: "senior-dev", label: "Senior Dev", hint: "gives direction, reviews your approach" },
        { value: "assistant", label: "Efficient Assistant", hint: "executes tasks, minimal chatter" },
        { value: "mentor", label: "Mentor", hint: "teaches concepts, explains why" },
        { value: "rubber-duck", label: "Rubber Duck", hint: "helps you think, asks questions" },
      ],
    })
  ) as string;

  const style = guard(
    await p.select({
      message: "Communication style?",
      options: [
        { value: "direct", label: "Direct & minimal", hint: "no fluff, just answers" },
        { value: "conversational", label: "Conversational", hint: "friendly but efficient" },
        { value: "detailed", label: "Detailed", hint: "thorough explanations" },
      ],
    })
  ) as string;

  // ═════════════════════════════════════════════════════════════════
  // Phase 2: Workflow (skip if --quick)
  // ═════════════════════════════════════════════════════════════════
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const defaults = roleWorkflowDefaults[role] ?? roleWorkflowDefaults["senior-dev"]!;
  let planning = defaults.planning;
  let testing = defaults.testing;
  let review = defaults.review;
  let git = defaults.git;
  let docs = defaults.docs;
  let debug = defaults.debug;
  let refactor = defaults.refactor;

  if (!options.quick) {
    phase(2, "Workflow");

    planning = guard(
      await p.select({
        message: "Planning approach?",
        initialValue: defaults.planning,
        options: [
          { value: "plan-first", label: "Plan first", hint: "discuss architecture before coding" },
          { value: "iterate", label: "Iterate", hint: "rough plan, refine as we go" },
          { value: "dive-in", label: "Dive in", hint: "start coding, figure it out" },
        ],
      })
    ) as string;

    testing = guard(
      await p.select({
        message: "Testing approach?",
        initialValue: defaults.testing,
        options: [
          { value: "tdd", label: "TDD", hint: "write tests first" },
          { value: "test-after", label: "Test after", hint: "write tests after implementation" },
          { value: "critical-paths", label: "Critical paths only", hint: "test important stuff" },
          { value: "minimal", label: "Minimal", hint: "tests when necessary" },
        ],
      })
    ) as string;

    review = guard(
      await p.select({
        message: "Code review preference?",
        initialValue: defaults.review,
        options: [
          { value: "review-before-commit", label: "Review before commit", hint: "Claude reviews changes" },
          { value: "review-on-request", label: "On request", hint: "review when asked" },
          { value: "self-review", label: "Self review", hint: "I review my own code" },
        ],
      })
    ) as string;

    git = guard(
      await p.select({
        message: "Git workflow?",
        initialValue: defaults.git,
        options: [
          { value: "small-commits", label: "Small commits", hint: "atomic, frequent commits" },
          { value: "feature-branches", label: "Feature branches", hint: "branch per feature, squash merge" },
          { value: "trunk-based", label: "Trunk-based", hint: "commit to main, feature flags" },
          { value: "flexible", label: "Flexible", hint: "depends on the project" },
        ],
      })
    ) as string;

    docs = guard(
      await p.select({
        message: "Documentation approach?",
        initialValue: defaults.docs,
        options: [
          { value: "inline", label: "Inline comments", hint: "document as you code" },
          { value: "readme-driven", label: "README driven", hint: "docs first, then code" },
          { value: "minimal", label: "Minimal", hint: "self-documenting code" },
          { value: "on-request", label: "On request", hint: "document when asked" },
        ],
      })
    ) as string;

    debug = guard(
      await p.select({
        message: "Debugging style?",
        initialValue: defaults.debug,
        options: [
          { value: "systematic", label: "Systematic", hint: "isolate, reproduce, trace" },
          { value: "hypothesis", label: "Hypothesis-driven", hint: "guess likely causes first" },
          { value: "printf", label: "Printf debugging", hint: "add logs, observe behavior" },
          { value: "whatever-works", label: "Whatever works", hint: "just fix it" },
        ],
      })
    ) as string;

    refactor = guard(
      await p.select({
        message: "Refactoring preference?",
        initialValue: defaults.refactor,
        options: [
          { value: "proactive", label: "Proactive", hint: "Claude suggests improvements" },
          { value: "on-request", label: "On request", hint: "only when asked" },
          { value: "boy-scout", label: "Boy scout rule", hint: "leave code better than found" },
          { value: "if-broken", label: "If it ain't broke...", hint: "don't fix what works" },
        ],
      })
    ) as string;
  }

  // ═════════════════════════════════════════════════════════════════
  // Phase 3: Tech Stack (skip if --quick)
  // ═════════════════════════════════════════════════════════════════
  let packageManager = "bun";
  let bunFeatures: string[] = [];
  let languages: string[] = ["TypeScript"];
  let backend = "none";
  let frontend: string[] = [];
  let css: string[] = [];
  let database: string[] = [];
  let orm: string[] = [];
  let auth: string[] = [];
  let infrastructure: string[] = [];
  let monorepo: string[] = [];
  let testingTools: string[] = [];
  let linting: string[] = [];
  let validation: string[] = [];
  let editor = "VS Code";

  if (!options.quick) {
    phase(3, "Tech Stack");

    // Auto-detect from project directory
    let detected: ProjectInfo | null = null;
    try {
      detected = await detectProject(process.cwd());
    } catch {
      // Not in a project directory, that's fine
    }

    if (detected && (detected.frameworks.length > 0 || detected.tooling.length > 0)) {
      const detectedInfo = [
        detected.runtime !== "unknown" ? `Runtime: ${detected.runtime}` : null,
        detected.frameworks.length > 0 ? `Frameworks: ${detected.frameworks.join(", ")}` : null,
        detected.tooling.length > 0 ? `Tooling: ${detected.tooling.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n  ");

      console.log(
        `  ${chalk.cyan("\u25C6")} Detected from ${chalk.bold(detected.name)}:\n  ${chalk.dim(detectedInfo)}`
      );
      console.log();

      const useDetected = guard(
        await p.confirm({
          message: "Use detected stack as starting point?",
          initialValue: true,
        })
      ) as boolean;

      if (useDetected) {
        // Pre-fill from detection
        if (detected.runtime === "bun") packageManager = "bun";
        else if (detected.runtime === "node") packageManager = "npm";

        // Map detected frameworks to our categories
        const frameworkSet = new Set(detected.frameworks);
        const toolingSet = new Set(detected.tooling);

        if (frameworkSet.has("React")) frontend = [...frontend, "React"];
        if (frameworkSet.has("Vue")) frontend = [...frontend, "Vue"];
        if (frameworkSet.has("Svelte")) frontend = [...frontend, "Svelte"];
        if (frameworkSet.has("Angular")) frontend = [...frontend, "Angular"];
        if (frameworkSet.has("Solid")) frontend = [...frontend, "Solid"];

        if (frameworkSet.has("Express")) backend = "Express";
        if (frameworkSet.has("Hono")) backend = "Hono";
        if (frameworkSet.has("Fastify")) backend = "Fastify";

        if (toolingSet.has("Tailwind")) css = [...css, "Tailwind"];
        if (toolingSet.has("Prisma")) orm = [...orm, "Prisma"];
        if (toolingSet.has("Drizzle")) orm = [...orm, "Drizzle"];
        if (toolingSet.has("TypeScript")) languages = [...new Set([...languages, "TypeScript"])];
        if (toolingSet.has("Biome")) linting = [...linting, "Biome"];
        if (toolingSet.has("ESLint")) linting = [...linting, "ESLint"];
        if (toolingSet.has("Prettier")) linting = [...linting, "Prettier"];
        if (toolingSet.has("Vitest")) testingTools = [...testingTools, "Vitest"];
        if (toolingSet.has("Jest")) testingTools = [...testingTools, "Jest"];
        if (toolingSet.has("Playwright")) testingTools = [...testingTools, "Playwright"];
        if (toolingSet.has("Docker")) infrastructure = [...infrastructure, "Docker Compose"];
        if (toolingSet.has("Turborepo")) monorepo = [...monorepo, "Turborepo"];
      }
    }

    const wantsCustomize =
      detected && (detected.frameworks.length > 0 || detected.tooling.length > 0)
        ? guard(
            await p.confirm({
              message: "Customize further?",
              initialValue: true,
            })
          ) as boolean
        : true;

    if (wantsCustomize) {
      packageManager = await selectWithOther("Preferred package manager?", [
        { value: "bun", label: "Bun" },
        { value: "pnpm", label: "pnpm" },
        { value: "npm", label: "npm" },
        { value: "yarn", label: "yarn" },
      ], packageManager);

      if (packageManager === "bun") {
        bunFeatures = await multiselectWithOther("Bun features you use?", [
          { value: "catalog", label: "Dependency catalog" },
          { value: "workspaces", label: "Bun workspaces" },
          { value: "macros", label: "Bun macros" },
          { value: "shell", label: "Bun shell ($``)" },
          { value: "sqlite", label: "bun:sqlite" },
          { value: "test", label: "bun test" },
        ]);
      }

      languages = await multiselectWithOther(
        "Primary programming languages?",
        [
          { value: "TypeScript", label: "TypeScript" },
          { value: "JavaScript", label: "JavaScript" },
          { value: "Python", label: "Python" },
          { value: "Ruby", label: "Ruby" },
          { value: "Rust", label: "Rust" },
          { value: "Go", label: "Go" },
          { value: "Java", label: "Java" },
          { value: "C#", label: "C#" },
          { value: "PHP", label: "PHP" },
          { value: "Elixir", label: "Elixir" },
        ],
        true
      );

      backend = await selectWithOther("Backend framework?", [
        { value: "none", label: "None / Custom" },
        { value: "Rails", label: "Ruby on Rails" },
        { value: "Django", label: "Django" },
        { value: "FastAPI", label: "FastAPI" },
        { value: "Express", label: "Express.js" },
        { value: "Hono", label: "Hono" },
        { value: "Phoenix", label: "Phoenix (Elixir)" },
        { value: "Spring", label: "Spring Boot" },
        { value: "ASP.NET", label: "ASP.NET Core" },
        { value: "Laravel", label: "Laravel" },
      ], backend);

      frontend = await multiselectWithOther("Frontend frameworks?", [
        { value: "React", label: "React" },
        { value: "Vue", label: "Vue.js" },
        { value: "Svelte", label: "Svelte" },
        { value: "Angular", label: "Angular" },
        { value: "Solid", label: "SolidJS" },
        { value: "HTMX", label: "HTMX" },
      ]);

      css = await multiselectWithOther("CSS / UI frameworks?", [
        { value: "Tailwind", label: "Tailwind CSS" },
        { value: "Vuetify", label: "Vuetify" },
        { value: "Bootstrap", label: "Bootstrap" },
        { value: "Material UI", label: "Material UI" },
        { value: "shadcn/ui", label: "shadcn/ui" },
        { value: "CSS Modules", label: "CSS Modules" },
        { value: "styled-components", label: "styled-components" },
      ]);

      database = await multiselectWithOther("Databases?", [
        { value: "PostgreSQL", label: "PostgreSQL" },
        { value: "MySQL", label: "MySQL" },
        { value: "MongoDB", label: "MongoDB" },
        { value: "SQLite", label: "SQLite" },
        { value: "Redis", label: "Redis" },
        { value: "Supabase", label: "Supabase" },
        { value: "Firebase", label: "Firebase" },
      ]);

      orm = await multiselectWithOther("ORM / database tools?", [
        { value: "Prisma", label: "Prisma" },
        { value: "Drizzle", label: "Drizzle" },
        { value: "TypeORM", label: "TypeORM" },
        { value: "Kysely", label: "Kysely" },
        { value: "Sequelize", label: "Sequelize" },
        { value: "Mongoose", label: "Mongoose" },
        { value: "ActiveRecord", label: "ActiveRecord (Rails)" },
        { value: "SQLAlchemy", label: "SQLAlchemy" },
        { value: "Django ORM", label: "Django ORM" },
      ]);

      auth = await multiselectWithOther("Authentication?", [
        { value: "better-auth", label: "better-auth" },
        { value: "Auth.js", label: "Auth.js (NextAuth)" },
        { value: "Lucia", label: "Lucia" },
        { value: "Clerk", label: "Clerk" },
        { value: "Supabase Auth", label: "Supabase Auth" },
        { value: "Firebase Auth", label: "Firebase Auth" },
        { value: "Passport.js", label: "Passport.js" },
        { value: "Devise", label: "Devise (Rails)" },
      ]);

      infrastructure = await multiselectWithOther("Infrastructure / deployment?", [
        { value: "Docker Compose", label: "Docker + Compose" },
        { value: "Docker", label: "Docker only" },
        { value: "Kubernetes", label: "Kubernetes" },
        { value: "Fly.io", label: "Fly.io" },
        { value: "Vercel", label: "Vercel" },
        { value: "Railway", label: "Railway" },
        { value: "Render", label: "Render" },
      ]);

      monorepo = await multiselectWithOther("Monorepo tooling?", [
        { value: "Turborepo", label: "Turborepo" },
        { value: "Bun workspaces", label: "Bun workspaces" },
        { value: "Nx", label: "Nx" },
        { value: "pnpm workspaces", label: "pnpm workspaces" },
        { value: "Lerna", label: "Lerna" },
      ]);

      testingTools = await multiselectWithOther("Testing frameworks?", [
        { value: "bun test", label: "bun test" },
        { value: "Vitest", label: "Vitest" },
        { value: "Jest", label: "Jest" },
        { value: "RSpec", label: "RSpec" },
        { value: "pytest", label: "pytest" },
        { value: "Playwright", label: "Playwright (E2E)" },
        { value: "Cypress", label: "Cypress (E2E)" },
      ]);

      linting = await multiselectWithOther("Linting & formatting?", [
        { value: "Biome", label: "Biome" },
        { value: "ESLint", label: "ESLint" },
        { value: "Prettier", label: "Prettier" },
        { value: "oxlint", label: "oxlint" },
        { value: "Rubocop", label: "Rubocop" },
        { value: "Ruff", label: "Ruff (Python)" },
        { value: "rustfmt", label: "rustfmt" },
        { value: "gofmt", label: "gofmt" },
      ]);

      validation = await multiselectWithOther("Validation & schema libraries?", [
        { value: "Zod", label: "Zod" },
        { value: "Yup", label: "Yup" },
        { value: "Valibot", label: "Valibot" },
        { value: "ArkType", label: "ArkType" },
        { value: "io-ts", label: "io-ts" },
        { value: "TypeBox", label: "TypeBox" },
        { value: "Pydantic", label: "Pydantic" },
        { value: "Joi", label: "Joi" },
      ]);

      editor = await selectWithOther("Primary editor?", [
        { value: "Zed", label: "Zed" },
        { value: "VS Code", label: "VS Code" },
        { value: "Cursor", label: "Cursor" },
        { value: "Neovim", label: "Neovim" },
        { value: "WebStorm", label: "WebStorm" },
      ]);
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // Phase 4: Anti-patterns (skip if --quick)
  // ═════════════════════════════════════════════════════════════════
  let antiPatternLevel = "moderate";
  let customAntiPatterns = "";

  if (!options.quick) {
    phase(4, "Anti-patterns");

    antiPatternLevel = guard(
      await p.select({
        message: "How strict should Claude be about anti-patterns?",
        options: [
          { value: "strict", label: "Strict", hint: "enforce all anti-patterns strongly" },
          { value: "moderate", label: "Moderate", hint: "reasonable defaults" },
          { value: "relaxed", label: "Relaxed", hint: "minimal restrictions" },
          { value: "skip", label: "Skip", hint: "no anti-pattern rules" },
        ],
      })
    ) as string;

    if (antiPatternLevel !== "skip") {
      const wantsCustom = guard(
        await p.confirm({
          message: "Add custom anti-patterns?",
          initialValue: false,
        })
      ) as boolean;

      if (wantsCustom) {
        customAntiPatterns = guard(
          await p.text({
            message: "Custom anti-patterns (one per line, prefix with -):",
            placeholder: "- Don't use class components\n- Don't use var",
          })
        ) as string;
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // Phase 5: Summary + Sync
  // ═════════════════════════════════════════════════════════════════
  phase(5, "Summary");

  const s = p.spinner();
  s.start("Generating profile");

  // ── Write profile.md ────────────────────────────────────────────
  const profileContent = `---
name: ${name}
role: ${role}
style: ${style}
personality: ${claudePersonality}
---

# Who I Am

${roleDescriptions[role] ?? role}

# How Claude Should Behave

${(personalityDescriptions[claudePersonality] ?? []).join(". ")}.

# Communication Style

${(styleDescriptions[style] ?? []).join(". ")}. No emojis unless explicitly requested. Show code when it's clearer than explanation.

# Development Workflow

Planning: ${planningDescriptions[planning] ?? planning}. Testing: ${testingDescriptions[testing] ?? testing}. Code review: ${reviewDescriptions[review] ?? review}. Git: ${gitDescriptions[git] ?? git}. Documentation: ${docDescriptions[docs] ?? docs}. Debugging: ${debugDescriptions[debug] ?? debug}. Refactoring: ${refactorDescriptions[refactor] ?? refactor}.
`;

  await writeFile(thinkPath(CONFIG.files.profile), profileContent);

  // ── Write tools.md ──────────────────────────────────────────────
  if (!options.quick) {
    const toolsSections: string[] = ["# Tool Preferences"];

    // Runtime & Package Manager
    const pmAlternatives = ["npm", "pnpm", "yarn", "Node.js"].filter(
      (pm) => pm.toLowerCase() !== packageManager.toLowerCase()
    );
    const pmSection = [
      `- Use ${packageManager === "bun" ? "Bun" : packageManager}${pmAlternatives.length ? ` (not ${pmAlternatives.join(", ")})` : ""}`,
    ];

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

    toolsSections.push(`\n## Runtime & Package Manager\n${pmSection.join("\n")}`);

    toolsSections.push(`\n## Languages\n${languages.map((l) => `- ${l}`).join("\n")}`);

    if (backend !== "none") {
      toolsSections.push(`\n## Backend\n- ${backend}`);
    }

    if (frontend.length > 0) {
      toolsSections.push(
        `\n## Frontend\n${frontend.map((f) => `- ${f}`).join("\n")}\n- Prefer functional components with hooks`
      );
    }

    if (css.length > 0) {
      toolsSections.push(`\n## CSS / UI\n${css.map((c) => `- ${c}`).join("\n")}`);
    }

    if (database.length > 0) {
      toolsSections.push(`\n## Database\n${database.map((d) => `- ${d}`).join("\n")}`);
    }

    if (orm.length > 0) {
      toolsSections.push(`\n## ORM / Database Tools\n${orm.map((o) => `- ${o}`).join("\n")}`);
    }

    if (auth.length > 0) {
      toolsSections.push(`\n## Authentication\n${auth.map((a) => `- ${a}`).join("\n")}`);
    }

    if (infrastructure.length > 0) {
      toolsSections.push(`\n## Infrastructure\n${infrastructure.map((i) => `- ${i}`).join("\n")}`);
    }

    if (monorepo.length > 0) {
      toolsSections.push(`\n## Monorepo\n${monorepo.map((m) => `- ${m}`).join("\n")}`);
    }

    if (testingTools.length > 0) {
      toolsSections.push(`\n## Testing\n${testingTools.map((t) => `- ${t}`).join("\n")}`);
    }

    if (linting.length > 0) {
      toolsSections.push(
        `\n## Linting & Formatting\n${linting.map((l) => `- ${l}`).join("\n")}\n- Use project's existing config when present`
      );
    }

    if (validation.length > 0) {
      toolsSections.push(`\n## Validation & Schema\n${validation.map((v) => `- ${v}`).join("\n")}`);
    }

    toolsSections.push(`\n## Editor\n- Primary: ${editor}`);

    await writeFile(thinkPath(CONFIG.files.tools), toolsSections.join("\n"));
  }

  // ── Write anti-patterns.md ──────────────────────────────────────
  if (!options.quick && antiPatternLevel !== "skip") {
    const antiSections: string[] = [];

    antiSections.push("# Anti-Patterns to Avoid");

    if (antiPatternLevel === "strict" || antiPatternLevel === "moderate") {
      antiSections.push(`
## Code Style
Do not add comments for obvious code. Do not add type annotations that can be inferred. Do not create abstractions for one-time use.`);
    }

    if (antiPatternLevel === "strict" || antiPatternLevel === "moderate") {
      antiSections.push(`
## Architecture
Do not over-engineer solutions. Do not add features that were not requested. Do not create unnecessary indirection or "future-proofing" complexity.`);
    }

    // Tech choices to avoid
    const techAvoid: string[] = [];
    if (packageManager === "bun") {
      techAvoid.push("Do not suggest npm/yarn/pnpm — use Bun.");
    }
    if (frontend.includes("React") && !frontend.includes("Next.js")) {
      techAvoid.push("Do not suggest Next.js — use plain React.");
    }
    if (
      (infrastructure.includes("Docker") || infrastructure.includes("Docker Compose")) &&
      !infrastructure.includes("Kubernetes")
    ) {
      techAvoid.push("Do not suggest Kubernetes — use Docker.");
    }

    if (techAvoid.length > 0) {
      antiSections.push(`\n## Tech Choices\n${techAvoid.join(" ")}`);
    }

    if (antiPatternLevel === "strict" || antiPatternLevel === "moderate") {
      antiSections.push(`
## Communication
Do not explain obvious things. Do not repeat back what was just said. Do not pad responses with unnecessary context.`);
    }

    if (customAntiPatterns.trim()) {
      antiSections.push(`\n## Custom\n${customAntiPatterns.trim()}`);
    }

    antiSections.push("");

    await writeFile(thinkPath(CONFIG.files.antiPatterns), antiSections.join("\n"));
  }

  s.stop("Profile created");

  // ── Sync ────────────────────────────────────────────────────────
  const syncSpinner = p.spinner();
  syncSpinner.start("Syncing to ~/.claude/CLAUDE.md");

  await generatePlugin();

  let tokenInfo = "";
  if (existsSync(CONFIG.claudeMdPath)) {
    const content = await readFile(CONFIG.claudeMdPath, "utf-8");
    const tokens = estimateTokens(content);
    tokenInfo = ` (${formatTokens(tokens)} tokens)`;
  }

  syncSpinner.stop("Synced");

  // ── Summary ─────────────────────────────────────────────────────
  const summaryLines = [
    `Name: ${name}`,
    `Role: ${roleDescriptions[role] ?? role}`,
    `Style: ${style}`,
    `Personality: ${claudePersonality}`,
  ];
  p.note(summaryLines.join("\n"), "Profile summary");

  p.outro(chalk.green(`Your profile is ready!${tokenInfo}`));

  console.log();
  console.log(`  Run ${chalk.cyan("think context")} in a project to generate project-specific context.`);
  console.log();
}
