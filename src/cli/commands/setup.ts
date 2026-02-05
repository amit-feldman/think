import { writeFile } from "fs/promises";
import { existsSync } from "fs";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { CONFIG, thinkPath } from "../../core/config";
import { printBanner } from "../../core/banner";
import { syncCommand } from "./sync";

/**
 * Interactive profile setup wizard
 */
export async function setupCommand(): Promise<void> {
  if (!existsSync(CONFIG.thinkDir)) {
    console.log(chalk.red("~/.think not found. Run `think init` first."));
    process.exit(1);
  }

  printBanner();

  p.intro(chalk.bgCyan(chalk.black(" think setup ")));

  const name = await p.text({
    message: "What's your name?",
    placeholder: "Your name",
  });
  if (p.isCancel(name)) return handleCancel();

  const style = await p.select({
    message: "What communication style do you prefer?",
    options: [
      { value: "direct", label: "Direct & minimal", hint: "no fluff, just answers" },
      { value: "conversational", label: "Conversational", hint: "friendly but efficient" },
      { value: "detailed", label: "Detailed", hint: "thorough explanations" },
    ],
  });
  if (p.isCancel(style)) return handleCancel();

  // === PROFILE & PERSONALITY ===
  p.note("Let's understand who you are and how you work");

  const role = await p.select({
    message: "What's your role?",
    options: [
      { value: "senior-dev", label: "Senior Developer", hint: "experienced, autonomous" },
      { value: "mid-dev", label: "Mid-level Developer", hint: "growing, some guidance helpful" },
      { value: "junior-dev", label: "Junior Developer", hint: "learning, more explanation needed" },
      { value: "founder", label: "Founder / Tech Lead", hint: "building fast, shipping matters" },
      { value: "student", label: "Student", hint: "learning fundamentals" },
      { value: "hobbyist", label: "Hobbyist", hint: "exploring for fun" },
    ],
  });
  if (p.isCancel(role)) return handleCancel();

  const claudePersonality = await p.select({
    message: "How should Claude behave?",
    options: [
      { value: "pair-programmer", label: "Pair Programmer", hint: "collaborative, thinks out loud" },
      { value: "senior-dev", label: "Senior Dev", hint: "gives direction, reviews your approach" },
      { value: "assistant", label: "Efficient Assistant", hint: "executes tasks, minimal chatter" },
      { value: "mentor", label: "Mentor", hint: "teaches concepts, explains why" },
      { value: "rubber-duck", label: "Rubber Duck", hint: "helps you think, asks questions" },
    ],
  });
  if (p.isCancel(claudePersonality)) return handleCancel();

  // === SDLC PREFERENCES ===
  p.note("How do you like to work through the development lifecycle?");

  const planningApproach = await p.select({
    message: "Planning approach?",
    options: [
      { value: "plan-first", label: "Plan first", hint: "discuss architecture before coding" },
      { value: "iterate", label: "Iterate", hint: "rough plan, refine as we go" },
      { value: "dive-in", label: "Dive in", hint: "start coding, figure it out" },
    ],
  });
  if (p.isCancel(planningApproach)) return handleCancel();

  const testingApproach = await p.select({
    message: "Testing approach?",
    options: [
      { value: "tdd", label: "TDD", hint: "write tests first" },
      { value: "test-after", label: "Test after", hint: "write tests after implementation" },
      { value: "critical-paths", label: "Critical paths only", hint: "test important stuff" },
      { value: "minimal", label: "Minimal", hint: "tests when necessary" },
    ],
  });
  if (p.isCancel(testingApproach)) return handleCancel();

  const codeReview = await p.select({
    message: "Code review preference?",
    options: [
      { value: "review-before-commit", label: "Review before commit", hint: "Claude reviews changes" },
      { value: "review-on-request", label: "On request", hint: "review when asked" },
      { value: "self-review", label: "Self review", hint: "I review my own code" },
    ],
  });
  if (p.isCancel(codeReview)) return handleCancel();

  const gitWorkflow = await p.select({
    message: "Git workflow?",
    options: [
      { value: "small-commits", label: "Small commits", hint: "atomic, frequent commits" },
      { value: "feature-branches", label: "Feature branches", hint: "branch per feature, squash merge" },
      { value: "trunk-based", label: "Trunk-based", hint: "commit to main, feature flags" },
      { value: "flexible", label: "Flexible", hint: "depends on the project" },
    ],
  });
  if (p.isCancel(gitWorkflow)) return handleCancel();

  const documentationApproach = await p.select({
    message: "Documentation approach?",
    options: [
      { value: "inline", label: "Inline comments", hint: "document as you code" },
      { value: "readme-driven", label: "README driven", hint: "docs first, then code" },
      { value: "minimal", label: "Minimal", hint: "self-documenting code" },
      { value: "on-request", label: "On request", hint: "document when asked" },
    ],
  });
  if (p.isCancel(documentationApproach)) return handleCancel();

  const debuggingStyle = await p.select({
    message: "Debugging style?",
    options: [
      { value: "systematic", label: "Systematic", hint: "isolate, reproduce, trace" },
      { value: "hypothesis", label: "Hypothesis-driven", hint: "guess likely causes first" },
      { value: "printf", label: "Printf debugging", hint: "add logs, observe behavior" },
      { value: "whatever-works", label: "Whatever works", hint: "just fix it" },
    ],
  });
  if (p.isCancel(debuggingStyle)) return handleCancel();

  const refactoringPreference = await p.select({
    message: "Refactoring preference?",
    options: [
      { value: "proactive", label: "Proactive", hint: "Claude suggests improvements" },
      { value: "on-request", label: "On request", hint: "only when asked" },
      { value: "boy-scout", label: "Boy scout rule", hint: "leave code better than found" },
      { value: "if-broken", label: "If it ain't broke...", hint: "don't fix what works" },
    ],
  });
  if (p.isCancel(refactoringPreference)) return handleCancel();

  // === TECH STACK ===
  p.note("Now let's configure your tech stack");

  const packageManager = await p.select({
    message: "Preferred package manager?",
    options: [
      { value: "bun", label: "Bun" },
      { value: "pnpm", label: "pnpm" },
      { value: "npm", label: "npm" },
      { value: "yarn", label: "yarn" },
    ],
  });
  if (p.isCancel(packageManager)) return handleCancel();

  let bunFeatures: string[] = [];
  if (packageManager === "bun") {
    const features = await p.multiselect({
      message: "Bun features you use?",
      options: [
        { value: "catalog", label: "Dependency catalog" },
        { value: "workspaces", label: "Bun workspaces" },
        { value: "macros", label: "Bun macros" },
        { value: "shell", label: "Bun shell ($``)" },
        { value: "sqlite", label: "bun:sqlite" },
        { value: "test", label: "bun test" },
      ],
      required: false,
    });
    if (p.isCancel(features)) return handleCancel();
    bunFeatures = features as string[];
  }

  const languages = await p.multiselect({
    message: "Primary programming languages?",
    options: [
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
    required: true,
  });
  if (p.isCancel(languages)) return handleCancel();

  const backend = await p.select({
    message: "Backend framework?",
    options: [
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
    ],
  });
  if (p.isCancel(backend)) return handleCancel();

  const frontend = await p.multiselect({
    message: "Frontend frameworks?",
    options: [
      { value: "React", label: "React" },
      { value: "Vue", label: "Vue.js" },
      { value: "Svelte", label: "Svelte" },
      { value: "Angular", label: "Angular" },
      { value: "Solid", label: "SolidJS" },
      { value: "HTMX", label: "HTMX" },
    ],
    required: false,
  });
  if (p.isCancel(frontend)) return handleCancel();

  const css = await p.multiselect({
    message: "CSS / UI frameworks?",
    options: [
      { value: "Tailwind", label: "Tailwind CSS" },
      { value: "Vuetify", label: "Vuetify" },
      { value: "Bootstrap", label: "Bootstrap" },
      { value: "Material UI", label: "Material UI" },
      { value: "shadcn/ui", label: "shadcn/ui" },
      { value: "CSS Modules", label: "CSS Modules" },
      { value: "styled-components", label: "styled-components" },
    ],
    required: false,
  });
  if (p.isCancel(css)) return handleCancel();

  const database = await p.multiselect({
    message: "Databases?",
    options: [
      { value: "PostgreSQL", label: "PostgreSQL" },
      { value: "MySQL", label: "MySQL" },
      { value: "MongoDB", label: "MongoDB" },
      { value: "SQLite", label: "SQLite" },
      { value: "Redis", label: "Redis" },
      { value: "Supabase", label: "Supabase" },
      { value: "Firebase", label: "Firebase" },
    ],
    required: false,
  });
  if (p.isCancel(database)) return handleCancel();

  const orm = await p.multiselect({
    message: "ORM / database tools?",
    options: [
      { value: "Prisma", label: "Prisma" },
      { value: "Drizzle", label: "Drizzle" },
      { value: "TypeORM", label: "TypeORM" },
      { value: "Kysely", label: "Kysely" },
      { value: "Sequelize", label: "Sequelize" },
      { value: "Mongoose", label: "Mongoose" },
      { value: "ActiveRecord", label: "ActiveRecord (Rails)" },
      { value: "SQLAlchemy", label: "SQLAlchemy" },
      { value: "Django ORM", label: "Django ORM" },
    ],
    required: false,
  });
  if (p.isCancel(orm)) return handleCancel();

  const auth = await p.multiselect({
    message: "Authentication?",
    options: [
      { value: "better-auth", label: "better-auth" },
      { value: "Auth.js", label: "Auth.js (NextAuth)" },
      { value: "Lucia", label: "Lucia" },
      { value: "Clerk", label: "Clerk" },
      { value: "Supabase Auth", label: "Supabase Auth" },
      { value: "Firebase Auth", label: "Firebase Auth" },
      { value: "Passport.js", label: "Passport.js" },
      { value: "Devise", label: "Devise (Rails)" },
    ],
    required: false,
  });
  if (p.isCancel(auth)) return handleCancel();

  const infrastructure = await p.multiselect({
    message: "Infrastructure / deployment?",
    options: [
      { value: "Docker Compose", label: "Docker + Compose" },
      { value: "Docker", label: "Docker only" },
      { value: "Kubernetes", label: "Kubernetes" },
      { value: "Fly.io", label: "Fly.io" },
      { value: "Vercel", label: "Vercel" },
      { value: "Railway", label: "Railway" },
      { value: "Render", label: "Render" },
    ],
    required: false,
  });
  if (p.isCancel(infrastructure)) return handleCancel();

  const monorepo = await p.select({
    message: "Monorepo tooling?",
    options: [
      { value: "none", label: "None / Single repo" },
      { value: "Turborepo", label: "Turborepo" },
      { value: "Bun workspaces", label: "Bun workspaces" },
      { value: "Nx", label: "Nx" },
      { value: "pnpm workspaces", label: "pnpm workspaces" },
      { value: "Lerna", label: "Lerna" },
    ],
  });
  if (p.isCancel(monorepo)) return handleCancel();

  const testing = await p.multiselect({
    message: "Testing frameworks?",
    options: [
      { value: "bun test", label: "bun test" },
      { value: "Vitest", label: "Vitest" },
      { value: "Jest", label: "Jest" },
      { value: "RSpec", label: "RSpec" },
      { value: "pytest", label: "pytest" },
      { value: "Playwright", label: "Playwright (E2E)" },
      { value: "Cypress", label: "Cypress (E2E)" },
    ],
    required: false,
  });
  if (p.isCancel(testing)) return handleCancel();

  const linting = await p.multiselect({
    message: "Linting & formatting?",
    options: [
      { value: "Biome", label: "Biome" },
      { value: "ESLint", label: "ESLint" },
      { value: "Prettier", label: "Prettier" },
      { value: "oxlint", label: "oxlint" },
      { value: "Rubocop", label: "Rubocop" },
      { value: "Ruff", label: "Ruff (Python)" },
      { value: "rustfmt", label: "rustfmt" },
      { value: "gofmt", label: "gofmt" },
    ],
    required: false,
  });
  if (p.isCancel(linting)) return handleCancel();

  const validation = await p.multiselect({
    message: "Validation & schema libraries?",
    options: [
      { value: "Zod", label: "Zod" },
      { value: "Yup", label: "Yup" },
      { value: "Valibot", label: "Valibot" },
      { value: "ArkType", label: "ArkType" },
      { value: "io-ts", label: "io-ts" },
      { value: "TypeBox", label: "TypeBox" },
      { value: "Pydantic", label: "Pydantic" },
      { value: "Joi", label: "Joi" },
    ],
    required: false,
  });
  if (p.isCancel(validation)) return handleCancel();

  const editor = await p.select({
    message: "Primary editor?",
    options: [
      { value: "Zed", label: "Zed" },
      { value: "VS Code", label: "VS Code" },
      { value: "Cursor", label: "Cursor" },
      { value: "Neovim", label: "Neovim" },
      { value: "WebStorm", label: "WebStorm" },
    ],
  });
  if (p.isCancel(editor)) return handleCancel();

  const avoidAnswer = await p.select({
    message: "What should Claude avoid?",
    options: [
      { value: "all", label: "All", hint: "over-engineering, verbose explanations, extra features" },
      { value: "some", label: "Just over-engineering" },
      { value: "none", label: "No specific restrictions" },
    ],
  });
  if (p.isCancel(avoidAnswer)) return handleCancel();

  const s = p.spinner();
  s.start("Generating profile");

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

  const roleDescriptions: Record<string, string> = {
    "senior-dev": "Senior developer - experienced and autonomous, prefers concise guidance",
    "mid-dev": "Mid-level developer - competent but appreciates context on complex topics",
    "junior-dev": "Junior developer - learning, benefits from more explanation and examples",
    "founder": "Founder/Tech Lead - focused on shipping, pragmatic decisions over perfect code",
    "student": "Student - learning fundamentals, explain concepts when relevant",
    "hobbyist": "Hobbyist - exploring for fun, balance learning with getting things done",
  };

  const personalityDescriptions: Record<string, string[]> = {
    "pair-programmer": [
      "Act as a pair programmer - think out loud, collaborate on solutions",
      "Discuss trade-offs and alternatives when relevant",
      "Catch potential issues early, suggest improvements as we go",
    ],
    "senior-dev": [
      "Act as a senior developer - give direction, review approaches",
      "Point out potential issues and better patterns",
      "Be opinionated when it matters, flexible when it doesn't",
    ],
    "assistant": [
      "Act as an efficient assistant - execute tasks with minimal chatter",
      "Ask clarifying questions only when truly needed",
      "Focus on delivering what was asked",
    ],
    "mentor": [
      "Act as a mentor - teach concepts, explain the 'why'",
      "Use opportunities to share knowledge",
      "Suggest learning resources when helpful",
    ],
    "rubber-duck": [
      "Act as a rubber duck - help me think through problems",
      "Ask probing questions rather than giving immediate answers",
      "Help me discover solutions myself",
    ],
  };

  const planningDescriptions: Record<string, string> = {
    "plan-first": "Discuss architecture and approach before writing code",
    "iterate": "Start with a rough plan, refine as we go",
    "dive-in": "Start coding quickly, figure out structure as needed",
  };

  const testingDescriptions: Record<string, string> = {
    "tdd": "Write tests first (TDD), then implement",
    "test-after": "Write tests after implementation",
    "critical-paths": "Test critical paths and edge cases",
    "minimal": "Minimal testing - add tests when necessary",
  };

  const reviewDescriptions: Record<string, string> = {
    "review-before-commit": "Review changes before committing - catch issues early",
    "review-on-request": "Review code when explicitly asked",
    "self-review": "I review my own code, no automatic reviews needed",
  };

  const gitDescriptions: Record<string, string> = {
    "small-commits": "Small, atomic commits - easy to review and revert",
    "feature-branches": "Feature branches with squash merges",
    "trunk-based": "Trunk-based development with feature flags",
    "flexible": "Flexible git workflow based on project needs",
  };

  const docDescriptions: Record<string, string> = {
    "inline": "Document with inline comments as code is written",
    "readme-driven": "README-driven development - docs first",
    "minimal": "Minimal documentation - code should be self-documenting",
    "on-request": "Add documentation when requested",
  };

  const debugDescriptions: Record<string, string> = {
    "systematic": "Debug systematically - isolate, reproduce, trace",
    "hypothesis": "Hypothesis-driven debugging - test likely causes first",
    "printf": "Printf debugging - add logs and observe",
    "whatever-works": "Whatever works to fix the issue quickly",
  };

  const refactorDescriptions: Record<string, string> = {
    "proactive": "Proactively suggest refactoring opportunities",
    "on-request": "Refactor only when asked",
    "boy-scout": "Boy scout rule - leave code better than you found it",
    "if-broken": "Don't refactor working code unless necessary",
  };

  const profileContent = `---
name: ${name}
role: ${role}
style: ${style}
personality: ${claudePersonality}
---

# Who I Am

${roleDescriptions[role as string]}

# How Claude Should Behave

${personalityDescriptions[claudePersonality as string].map((s) => `- ${s}`).join("\n")}

# Communication Style

${styleDescriptions[style as string].map((s) => `- ${s}`).join("\n")}
- No emojis unless explicitly requested
- Show code when it's clearer than explanation

# Development Workflow

## Planning
- ${planningDescriptions[planningApproach as string]}

## Testing
- ${testingDescriptions[testingApproach as string]}

## Code Review
- ${reviewDescriptions[codeReview as string]}

## Git Workflow
- ${gitDescriptions[gitWorkflow as string]}

## Documentation
- ${docDescriptions[documentationApproach as string]}

## Debugging
- ${debugDescriptions[debuggingStyle as string]}

## Refactoring
- ${refactorDescriptions[refactoringPreference as string]}
`;

  await writeFile(thinkPath(CONFIG.files.profile), profileContent);

  // Generate tools preferences
  const toolsSections: string[] = ["# Tool Preferences"];

  // Runtime & Package Manager
  const pmAlternatives = ["npm", "pnpm", "yarn", "Node.js"].filter(
    (pm) => pm.toLowerCase() !== (packageManager as string).toLowerCase()
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
${(languages as string[]).map((l) => `- ${l}`).join("\n")}`);

  // Backend
  if (backend !== "none") {
    toolsSections.push(`
## Backend
- ${backend}`);
  }

  // Frontend
  if ((frontend as string[]).length > 0) {
    toolsSections.push(`
## Frontend
${(frontend as string[]).map((f) => `- ${f}`).join("\n")}
- Prefer functional components with hooks`);
  }

  // CSS
  if ((css as string[]).length > 0) {
    toolsSections.push(`
## CSS / UI
${(css as string[]).map((c) => `- ${c}`).join("\n")}`);
  }

  // Database
  if ((database as string[]).length > 0) {
    toolsSections.push(`
## Database
${(database as string[]).map((d) => `- ${d}`).join("\n")}`);
  }

  // ORM
  if ((orm as string[]).length > 0) {
    toolsSections.push(`
## ORM / Database Tools
${(orm as string[]).map((o) => `- ${o}`).join("\n")}`);
  }

  // Auth
  if ((auth as string[]).length > 0) {
    toolsSections.push(`
## Authentication
${(auth as string[]).map((a) => `- ${a}`).join("\n")}`);
  }

  // Infrastructure
  if ((infrastructure as string[]).length > 0) {
    toolsSections.push(`
## Infrastructure
${(infrastructure as string[]).map((i) => `- ${i}`).join("\n")}`);
  }

  // Monorepo
  if (monorepo !== "none") {
    toolsSections.push(`
## Monorepo
- ${monorepo}`);
  }

  // Testing
  if ((testing as string[]).length > 0) {
    toolsSections.push(`
## Testing
${(testing as string[]).map((t) => `- ${t}`).join("\n")}`);
  }

  // Linting & Formatting
  if ((linting as string[]).length > 0) {
    toolsSections.push(`
## Linting & Formatting
${(linting as string[]).map((l) => `- ${l}`).join("\n")}
- Use project's existing config when present`);
  }

  // Validation
  if ((validation as string[]).length > 0) {
    toolsSections.push(`
## Validation & Schema
${(validation as string[]).map((v) => `- ${v}`).join("\n")}`);
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
    if ((frontend as string[]).includes("React") && !(frontend as string[]).includes("Next.js")) {
      techAvoid.push("- Don't suggest Next.js - use plain React");
    }
    if ((infrastructure as string[]).includes("Docker") || (infrastructure as string[]).includes("Docker Compose")) {
      if (!(infrastructure as string[]).includes("Kubernetes")) {
        techAvoid.push("- Don't suggest Kubernetes - use Docker");
      }
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

  s.stop("Profile created");

  // Sync
  await syncCommand();

  p.outro(chalk.green("Your profile is ready!"));

  console.log();
  console.log("To customize further:");
  console.log(`  ${chalk.cyan("think edit profile")}    Edit your profile`);
  console.log(`  ${chalk.cyan("think edit patterns")}   Add coding patterns`);
  console.log(`  ${chalk.cyan("think learn \"...\"")}    Add learnings over time`);
}

function handleCancel(): void {
  p.cancel("Setup cancelled");
  process.exit(0);
}
