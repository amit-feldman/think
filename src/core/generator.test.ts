import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  CONFIG,
  setActiveProfile,
  getActiveProfile,
} from "./config.ts";
import { generatePlugin } from "./generator.ts";

const TEST_PROFILE = "_thinktest_gen";
const testProfileDir = join(CONFIG.profilesDir, TEST_PROFILE);

function writeProfileFile(relPath: string, content: string): void {
  const full = join(testProfileDir, relPath);
  const dir = full.substring(0, full.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(full, content);
}

describe("generatePlugin", () => {
  let originalActive: string;
  let originalClaudeMd: string | null = null;

  beforeEach(() => {
    originalActive = getActiveProfile();
    if (existsSync(CONFIG.claudeMdPath)) {
      originalClaudeMd = readFileSync(CONFIG.claudeMdPath, "utf-8");
    }

    mkdirSync(testProfileDir, { recursive: true });
    for (const sub of [
      "preferences",
      "skills",
      "agents",
      "memory",
      "automation",
      "automation/workflows",
      "templates",
    ]) {
      mkdirSync(join(testProfileDir, sub), { recursive: true });
    }
    setActiveProfile(TEST_PROFILE);
  });

  afterEach(() => {
    try {
      setActiveProfile(originalActive);
    } catch {}
    if (originalClaudeMd !== null) {
      writeFileSync(CONFIG.claudeMdPath, originalClaudeMd);
    }
    if (existsSync(testProfileDir)) {
      rmSync(testProfileDir, { recursive: true });
    }
  });

  test("generates CLAUDE.md with profile section", async () => {
    writeProfileFile(
      "profile.md",
      `---
name: Alice
role: developer
---

# Who I Am

Senior TypeScript developer`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("# Personal Context");
    expect(output).toContain("Name: Alice");
    expect(output).toContain("Senior TypeScript developer");
  });

  test("includes tool preferences", async () => {
    writeProfileFile("profile.md", "---\nname: Bob\n---\n");
    writeProfileFile(
      "preferences/tools.md",
      `# Tool Preferences

## Runtime
- Use Bun

## Languages
- TypeScript`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Tool Preferences");
    expect(output).toContain("Use Bun");
  });

  test("includes patterns", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "preferences/patterns.md",
      `# Patterns

- Write tests first
- Small commits`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Patterns to Follow");
    expect(output).toContain("Write tests first");
  });

  test("includes anti-patterns", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "preferences/anti-patterns.md",
      `# Anti-Patterns

- Don't over-engineer`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Anti-Patterns to Avoid");
    expect(output).toContain("Don't over-engineer");
  });

  test("includes learnings", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "memory/learnings.md",
      `# Learnings

- Bun.serve needs explicit hostname for Docker`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Memory - Learnings");
    expect(output).toContain("Bun.serve needs explicit hostname");
  });

  test("includes skills from directory", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "skills/code-review.md",
      `---
name: Code Review
description: Review code for bugs
trigger: Before committing
---

Check for:
- Logic errors
- Security issues`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Skills");
    expect(output).toContain("### Code Review");
    expect(output).toContain("Review code for bugs");
    expect(output).toContain("**Trigger**: Before committing");
    expect(output).toContain("Logic errors");
  });

  test("includes agents from directory", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "agents/test-writer.md",
      `---
name: Test Writer
description: Writes tests
trigger: After implementing a feature
tools:
  - Bash
  - Read
  - Write
---

Write comprehensive tests following project patterns.`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Agents");
    expect(output).toContain("### Test Writer");
    expect(output).toContain("**Tools**: Bash, Read, Write");
    expect(output).toContain("**Trigger**: After implementing a feature");
  });

  test("includes workflow files from directory", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "automation/workflows/feature-dev.md",
      `---
name: Feature Development
---

## Steps
1. Explore patterns
2. Write tests
3. Implement`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Workflows");
    expect(output).toContain("### Feature Development");
    expect(output).toContain("Explore patterns");
  });

  test("includes subagent automation", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "automation/subagents.md",
      `# Subagent Rules

## Before Implementation
- Spawn Explore agent to understand patterns`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Subagent Automation");
    expect(output).toContain("Spawn Explore agent");
  });

  test("includes legacy workflows when no directory workflows", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "automation/workflows.md",
      `# Workflows

- Always run tests before committing`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("## Workflows");
    expect(output).toContain("Always run tests");
  });

  test("appends legacy workflows content when directory workflows exist", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "automation/workflows/feature.md",
      `---
name: Feature
---

Feature workflow steps`
    );
    writeProfileFile(
      "automation/workflows.md",
      `# Extra Workflows

- Additional workflow rules`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("Feature workflow steps");
    expect(output).toContain("Additional workflow rules");
  });

  test("handles empty profile gracefully", async () => {
    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("# Personal Context");
    expect(output).toContain("auto-generated by `think sync`");
  });

  test("handles profile with name but no content", async () => {
    writeProfileFile("profile.md", "---\nname: Minimal\n---\n");

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("Name: Minimal");
  });

  test("handles skill with tools but no trigger", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "agents/agent1.md",
      `---
name: Simple Agent
description: Does things
tools:
  - Read
  - Grep
---

Instructions here.`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("### Simple Agent");
    expect(output).toContain("**Tools**: Read, Grep");
    expect(output).not.toContain("**Trigger**:");
  });

  test("handles readdir failure in skills directory gracefully", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    // Make the skills directory a file instead of directory — readdir will throw
    const skillsPath = join(testProfileDir, "skills");
    rmSync(skillsPath, { recursive: true });
    writeFileSync(skillsPath, "not a directory");

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).toContain("# Personal Context");
    // Should not have skills section since readdir failed
    expect(output).not.toContain("## Skills");

    // Restore skills as a directory for cleanup
    const { unlinkSync: unlink } = require("fs");
    unlink(skillsPath);
    mkdirSync(skillsPath, { recursive: true });
  });

  test("skips workflow files without content", async () => {
    writeProfileFile("profile.md", "---\nname: Test\n---\n");
    writeProfileFile(
      "automation/workflows/empty.md",
      `---
name: Empty Workflow
---
`
    );

    await generatePlugin();

    const output = readFileSync(CONFIG.claudeMdPath, "utf-8");
    expect(output).not.toContain("### Empty Workflow");
  });
});
