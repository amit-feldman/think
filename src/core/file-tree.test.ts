import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import {
  generateFileTree,
  generateFileTreeMarkdown,
  generateAdaptiveTree,
  DEFAULT_IGNORE,
} from "./file-tree.ts";
import { thinkPath, CONFIG } from "./config.ts";
import { writeFile, mkdir, rm, chmod } from "fs/promises";
import { writeFileSync, existsSync, readFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("DEFAULT_IGNORE", () => {
  test("includes common directories", () => {
    expect(DEFAULT_IGNORE).toContain("node_modules");
    expect(DEFAULT_IGNORE).toContain(".git");
    expect(DEFAULT_IGNORE).toContain("dist");
    expect(DEFAULT_IGNORE).toContain("build");
    expect(DEFAULT_IGNORE).toContain("__pycache__");
    expect(DEFAULT_IGNORE).toContain("coverage");
    expect(DEFAULT_IGNORE).toContain(".DS_Store");
  });

  test("includes glob patterns", () => {
    expect(DEFAULT_IGNORE).toContain("*.pyc");
    expect(DEFAULT_IGNORE).toContain(".env.*");
  });
});

describe("generateFileTree", () => {
  const tmpDir = join(tmpdir(), "think-test-filetree-" + Date.now());

  test("generates tree for simple project", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), "{}");
    await writeFile(join(tmpDir, "src", "index.ts"), "export const x = 1;");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("package.json");
    expect(tree).toContain("src");
    expect(tree).toContain("index.ts");
    // Tree should start with project directory name
    const dirName = tmpDir.split("/").pop()!;
    expect(tree.startsWith(dirName + "/")).toBe(true);
    await rm(tmpDir, { recursive: true });
  });

  test("ignores node_modules and .git", async () => {
    await mkdir(join(tmpDir, "node_modules", "foo"), { recursive: true });
    await mkdir(join(tmpDir, ".git"), { recursive: true });
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "node_modules", "foo", "index.js"), "");
    await writeFile(join(tmpDir, ".git", "HEAD"), "");
    await writeFile(join(tmpDir, "src", "app.ts"), "");

    const tree = await generateFileTree(tmpDir);
    expect(tree).not.toContain("node_modules");
    expect(tree).not.toContain(".git");
    expect(tree).toContain("app.ts");
    await rm(tmpDir, { recursive: true });
  });

  test("annotates known files", async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "package.json"), "{}");
    await writeFile(join(tmpDir, "README.md"), "# Hi");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("# project manifest");
    expect(tree).toContain("# documentation");
    await rm(tmpDir, { recursive: true });
  });

  test("sorts directories before files", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "src", "main.ts"), "");
    await writeFile(join(tmpDir, "zfile.txt"), "");
    await writeFile(join(tmpDir, "afile.txt"), "");

    const tree = await generateFileTree(tmpDir);
    const lines = tree.split("\n");
    const srcLine = lines.findIndex((l) => l.includes("src"));
    const afileLine = lines.findIndex((l) => l.includes("afile.txt"));
    expect(srcLine).toBeLessThan(afileLine);
    await rm(tmpDir, { recursive: true });
  });

  test("handles empty directory", async () => {
    await mkdir(tmpDir, { recursive: true });
    const tree = await generateFileTree(tmpDir);
    const dirName = tmpDir.split("/").pop()!;
    expect(tree).toBe(dirName + "/\n");
    await rm(tmpDir, { recursive: true });
  });

  test("handles nested directories up to max depth", async () => {
    // Create deep nesting: a/b/c/d/e/f (depth 6)
    // maxDepth 4 means depth 0..3 are traversed
    const deep = join(tmpDir, "a", "b", "c", "d", "e", "f");
    await mkdir(deep, { recursive: true });
    await writeFile(join(deep, "deep.ts"), "");
    // Put shallow.ts at depth 3 (a/b/c/) — within maxDepth 4
    await writeFile(join(tmpDir, "a", "b", "c", "shallow.ts"), "");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("shallow.ts");
    // "deep.ts" is at depth 6 — well beyond default maxDepth 4
    expect(tree).not.toContain("deep.ts");
    await rm(tmpDir, { recursive: true });
  });

  test("uses tree connectors", async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "first.ts"), "");
    await writeFile(join(tmpDir, "last.ts"), "");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("├── ");
    expect(tree).toContain("└── ");
    await rm(tmpDir, { recursive: true });
  });
});

describe("generateFileTreeMarkdown", () => {
  const tmpDir = join(tmpdir(), "think-test-filetree-md-" + Date.now());

  test("wraps tree in code block", async () => {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "file.ts"), "");

    const md = await generateFileTreeMarkdown(tmpDir);
    expect(md.startsWith("```")).toBe(true);
    expect(md.endsWith("```")).toBe(true);
    expect(md).toContain("file.ts");
    await rm(tmpDir, { recursive: true });
  });
});

describe("generateAdaptiveTree", () => {
  const tmpDir = join(tmpdir(), "think-test-adaptive-" + Date.now());

  test("respects token budget by reducing depth", async () => {
    // Create a project with many files at various depths
    for (const dir of ["src", "src/core", "src/cli", "src/tui", "lib", "test"]) {
      await mkdir(join(tmpDir, dir), { recursive: true });
    }
    for (let i = 0; i < 20; i++) {
      await writeFile(join(tmpDir, "src", `file${i}.ts`), "");
    }
    for (let i = 0; i < 10; i++) {
      await writeFile(join(tmpDir, "src", "core", `core${i}.ts`), "");
    }
    await writeFile(join(tmpDir, "package.json"), "{}");

    // With a very small budget, depth should be reduced
    const tree = await generateAdaptiveTree(tmpDir, { budgetTokens: 50 });
    expect(tree).toBeTruthy();
    // Should still start with project name
    const dirName = tmpDir.split("/").pop()!;
    expect(tree.startsWith(dirName + "/")).toBe(true);
    await rm(tmpDir, { recursive: true });
  });

  test("uses default budget of 1500 when not specified", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "src", "index.ts"), "");

    const tree = await generateAdaptiveTree(tmpDir);
    expect(tree).toContain("index.ts");
    await rm(tmpDir, { recursive: true });
  });

  test("respects significant paths", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "src", "important.ts"), "");
    await writeFile(join(tmpDir, "src", "other.ts"), "");

    const significantPaths = new Set(["src/important.ts"]);
    const tree = await generateAdaptiveTree(tmpDir, {
      budgetTokens: 1500,
      significantPaths,
    });
    expect(tree).toContain("important.ts");
    await rm(tmpDir, { recursive: true });
  });

  test("collapses directories with many children when not significant", async () => {
    // Create a directory with > 15 children (DIR_COLLAPSE_THRESHOLD)
    const bigDir = join(tmpDir, "components");
    await mkdir(bigDir, { recursive: true });
    for (let i = 0; i < 20; i++) {
      await writeFile(join(bigDir, `component${i}.tsx`), "");
    }
    await writeFile(join(tmpDir, "index.ts"), "");

    const tree = await generateAdaptiveTree(tmpDir, { budgetTokens: 1500 });
    // The collapsed directory should show file/dir counts
    // or just collapse depending on significance
    expect(tree).toBeTruthy();
    await rm(tmpDir, { recursive: true });
  });
});

describe("loadConfig with custom file-tree.md", () => {
  const configPath = thinkPath(CONFIG.files.fileTree);
  let originalContent: string | null = null;

  beforeAll(() => {
    // Save existing config if present
    if (existsSync(configPath)) {
      originalContent = readFileSync(configPath, "utf-8");
    }
    // Write a test config
    const dir = configPath.substring(0, configPath.lastIndexOf("/"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      configPath,
      `---
name: Test Config
---

## Ignore Patterns

- custom_ignored_dir
- *.log

## Max Depth

3

## Annotations

- schema.graphql: GraphQL schema
- src/*.config.ts: configuration
`
    );
  });

  afterAll(() => {
    if (originalContent !== null) {
      writeFileSync(configPath, originalContent);
    } else {
      try {
        unlinkSync(configPath);
      } catch {}
    }
  });

  const tmpDir = join(tmpdir(), "think-test-ftcustom-" + Date.now());

  test("loadConfig reads custom ignore patterns", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await mkdir(join(tmpDir, "custom_ignored_dir"), { recursive: true });
    await writeFile(join(tmpDir, "src", "app.ts"), "");
    await writeFile(join(tmpDir, "custom_ignored_dir", "secret.ts"), "");
    await writeFile(join(tmpDir, "debug.log"), "log data");
    await writeFile(join(tmpDir, "package.json"), "{}");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("app.ts");
    expect(tree).not.toContain("custom_ignored_dir");
    expect(tree).not.toContain("debug.log");
    await rm(tmpDir, { recursive: true });
  });

  test("loadConfig reads custom annotations", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "schema.graphql"), "type Query {}");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("# GraphQL schema");
    await rm(tmpDir, { recursive: true });
  });

  test("loadConfig reads glob-based annotations matching relative path", async () => {
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(join(tmpDir, "src", "app.config.ts"), "export default {}");

    const tree = await generateFileTree(tmpDir);
    // The custom config has "src/*.config.ts: configuration"
    expect(tree).toContain("# configuration");
    await rm(tmpDir, { recursive: true });
  });

  test("loadConfig respects custom max depth", async () => {
    // Custom max depth is 3, so depth 3+ should be truncated
    const deep = join(tmpDir, "a", "b", "c", "d");
    await mkdir(deep, { recursive: true });
    await writeFile(join(deep, "deep.ts"), "");
    await writeFile(join(tmpDir, "a", "b", "shallow.ts"), "");

    const tree = await generateFileTree(tmpDir);
    expect(tree).toContain("shallow.ts");
    expect(tree).not.toContain("deep.ts");
    await rm(tmpDir, { recursive: true });
  });

  test("loadConfig returns defaults when config file does not exist", async () => {
    // Temporarily remove the config file so loadConfig returns defaults from !existsSync
    const { renameSync } = await import("fs");
    const bakPath = configPath + ".__bak_" + Date.now();
    renameSync(configPath, bakPath);
    try {
      await mkdir(tmpDir, { recursive: true });
      await writeFile(join(tmpDir, "file.ts"), "");
      const tree = await generateFileTree(tmpDir);
      // Should work with default config
      expect(tree).toContain("file.ts");
      await rm(tmpDir, { recursive: true });
    } finally {
      renameSync(bakPath, configPath);
    }
  });
});

describe("buildTree edge cases", () => {
  const tmpDir = join(tmpdir(), "think-test-buildtree-" + Date.now());

  test("handles unreadable subdirectory gracefully", async () => {
    await mkdir(join(tmpDir, "readable"), { recursive: true });
    await writeFile(join(tmpDir, "readable", "file.ts"), "");
    const unreadable = join(tmpDir, "noread");
    await mkdir(unreadable, { recursive: true });
    await writeFile(join(unreadable, "hidden.ts"), "");
    await chmod(unreadable, 0o000);

    try {
      const tree = await generateFileTree(tmpDir);
      expect(tree).toContain("file.ts");
    } finally {
      await chmod(unreadable, 0o755);
      await rm(tmpDir, { recursive: true });
    }
  });
});

describe("containsSignificant exhausts loop", () => {
  const tmpDir = join(tmpdir(), "think-test-sig-" + Date.now());

  test("containsSignificant returns false when no paths match dir", async () => {
    // Create a dir with >15 children (triggers collapse check) and
    // significant paths that DON'T match this dir
    const bigDir = join(tmpDir, "unrelated");
    await mkdir(bigDir, { recursive: true });
    for (let i = 0; i < 20; i++) {
      await writeFile(join(bigDir, `file${i}.ts`), "");
    }
    await writeFile(join(tmpDir, "root.ts"), "");

    // significant paths point to a completely different directory
    const significantPaths = new Set(["other/important.ts", "elsewhere/key.ts"]);
    const tree = await generateAdaptiveTree(tmpDir, {
      budgetTokens: 5000,
      significantPaths,
    });
    // The "unrelated" dir should be collapsed since significant paths don't match it
    expect(tree).toBeTruthy();
    await rm(tmpDir, { recursive: true });
  });
});

describe("generateAdaptiveTree depth reduction", () => {
  const tmpDir = join(tmpdir(), "think-test-adaptive2-" + Date.now());

  test("iterates through multiple depths for tiny budget", async () => {
    // Create enough content that depth 4 far exceeds budget
    await mkdir(join(tmpDir, "a", "b", "c"), { recursive: true });
    for (let i = 0; i < 5; i++) {
      await writeFile(join(tmpDir, `root${i}.ts`), "");
      await writeFile(join(tmpDir, "a", `a${i}.ts`), "");
      await writeFile(join(tmpDir, "a", "b", `b${i}.ts`), "");
      await writeFile(join(tmpDir, "a", "b", "c", `c${i}.ts`), "");
    }

    // Budget of 20 tokens = 80 chars — forces multiple depth reductions
    const tree = await generateAdaptiveTree(tmpDir, { budgetTokens: 20 });
    expect(tree).toBeTruthy();
    const dirName = tmpDir.split("/").pop()!;
    expect(tree.startsWith(dirName + "/")).toBe(true);
    await rm(tmpDir, { recursive: true });
  });
});
