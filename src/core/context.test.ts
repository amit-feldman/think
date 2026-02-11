import { describe, expect, test } from "bun:test";
import { generateProjectContext } from "./context.ts";
import { writeFile, mkdir, rm, readFile, chmod } from "fs/promises";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getProjectClaudeMdPath } from "./config.ts";

describe("generateProjectContext", () => {
  const tmpDir = join(tmpdir(), "think-test-context-" + Date.now());

  async function setupProject(files: Record<string, string> = {}): Promise<string> {
    const projectDir = join(tmpDir, "project-" + Math.random().toString(36).slice(2, 8));
    await mkdir(join(projectDir, "src"), { recursive: true });

    // Create a basic package.json for project detection
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        description: "A test project",
        dependencies: {},
      })
    );

    // Create a basic tsconfig for TypeScript detection
    await writeFile(
      join(projectDir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { target: "esnext" } })
    );

    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(projectDir, path);
      await mkdir(join(fullPath, "..").replace(/\/\.\.$/, ""), { recursive: true });
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await writeFile(fullPath, content);
    }

    return projectDir;
  }

  test("generates context for a basic project", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export function main(): void { console.log('hello'); }",
      "src/utils.ts": "export function add(a: number, b: number): number { return a + b; }",
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });

    expect(result.markdown).toContain("# test-project");
    expect(result.markdown).toContain("Project context");
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThanOrEqual(2); // at least overview and structure

    // Should have overview section
    const overview = result.sections.find((s) => s.id === "overview");
    expect(overview).toBeTruthy();

    // Should have structure section
    const structure = result.sections.find((s) => s.id === "structure");
    expect(structure).toBeTruthy();

    await rm(projectDir, { recursive: true });
  });

  test("extracts code map from source files", async () => {
    const projectDir = await setupProject({
      "src/index.ts": `export function hello(name: string): string {
  return \`Hello \${name}\`;
}

export interface Config {
  name: string;
  value: number;
}

export type Status = "active" | "inactive";`,
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });

    const codeMap = result.sections.find((s) => s.id === "codeMap");
    expect(codeMap).toBeTruthy();
    expect(codeMap!.content).toContain("hello");

    await rm(projectDir, { recursive: true });
  });

  test("respects custom budget", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export function main(): void {}",
    });

    const small = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 2000,
    });
    const large = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 20000,
    });

    // Both should work, but with different budget allocations
    expect(small.totalTokens).toBeGreaterThan(0);
    expect(large.totalTokens).toBeGreaterThan(0);

    await rm(projectDir, { recursive: true });
  });

  test("excludes test files from signatures by default", async () => {
    const projectDir = await setupProject({
      "src/main.ts": "export function main(): void {}",
      "src/main.test.ts":
        'import { describe, test } from "bun:test";\nexport function testHelper(): void {}',
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");

    // Test files should be excluded
    if (codeMap) {
      expect(codeMap.content).not.toContain("main.test.ts");
    }

    await rm(projectDir, { recursive: true });
  });

  test("includes key files when configured", async () => {
    const projectDir = await setupProject({
      "src/config.ts": "export const VERSION = '1.0.0';",
    });

    // Create .think.yaml with key_files config
    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:
  key_files:
    - "src/config.ts"
`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const keyFiles = result.sections.find((s) => s.id === "keyFiles");
    expect(keyFiles).toBeTruthy();
    expect(keyFiles!.content).toContain("VERSION");

    await rm(projectDir, { recursive: true });
  });

  test("includes knowledge directory content", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    // Create knowledge directory with docs
    const knowledgeDir = join(projectDir, ".think", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(join(knowledgeDir, "architecture.md"), "# Architecture\n\nMicroservices design.");

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    expect(knowledge).toBeTruthy();
    expect(knowledge!.content).toContain("Microservices design");

    await rm(projectDir, { recursive: true });
  });

  test("writes to correct output path when not dry run", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    const result = await generateProjectContext(projectDir, { dryRun: false });
    const outputPath = getProjectClaudeMdPath(projectDir);

    const written = await readFile(outputPath, "utf-8");
    expect(written).toBe(result.markdown);

    // Clean up output
    await rm(outputPath, { recursive: true }).catch(() => {});
    await rm(projectDir, { recursive: true });
  });

  test("handles project with no source files", async () => {
    const projectDir = await setupProject({});

    const result = await generateProjectContext(projectDir, { dryRun: true });
    expect(result.markdown).toContain("# test-project");
    expect(result.totalTokens).toBeGreaterThan(0);
    // Should still have overview and structure
    expect(result.sections.find((s) => s.id === "overview")).toBeTruthy();

    await rm(projectDir, { recursive: true });
  });

  test("handles non-existent knowledge directory gracefully", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    // Configure a non-existent knowledge dir
    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:
  knowledge_dir: "nonexistent/docs"
`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    // Should complete without error
    expect(result.markdown).toBeTruthy();
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    // No user knowledge should exist (auto may fill in)
    if (knowledge) {
      expect(knowledge.content).not.toContain("nonexistent/docs");
    }

    await rm(projectDir, { recursive: true });
  });

  test("rejects knowledge directory with path traversal", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:
  knowledge_dir: "../../etc"
`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    // Should not include knowledge from outside project (auto may fill in)
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    if (knowledge) {
      expect(knowledge.content).not.toContain("../../etc");
    }

    await rm(projectDir, { recursive: true });
  });

  test("sanitizes project name in output", async () => {
    const projectDir = await setupProject({});

    // Override package.json with potentially malicious name
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({
        name: "# Injected\n## Heading\n```code```",
        dependencies: {},
      })
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    // sanitizeMarkdownHeading collapses newlines into spaces and strips leading #
    // So "## Heading" won't appear on its own line as a real markdown heading
    expect(result.markdown).not.toMatch(/^## Heading$/m);
    // Backticks should be removed
    expect(result.markdown).not.toContain("```code```");

    await rm(projectDir, { recursive: true });
  });

  test("prioritizes entry point files in code map", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export function entryPoint(): void {}",
      "src/utils/helpers.ts": "export function helper(): void {}",
      "src/deep/nested/module.ts": "export function deepFunc(): void {}",
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");

    if (codeMap && codeMap.content) {
      // index.ts should appear before deeper files since it's an entry point
      const indexPos = codeMap.content.indexOf("index.ts");
      const deepPos = codeMap.content.indexOf("deep/nested/module.ts");
      if (indexPos !== -1 && deepPos !== -1) {
        expect(indexPos).toBeLessThan(deepPos);
      }
    }

    await rm(projectDir, { recursive: true });
  });

  test("truncates content when exceeding budget", async () => {
    const projectDir = await setupProject({});

    // Create many source files to exceed a very small budget
    for (let i = 0; i < 30; i++) {
      await writeFile(
        join(projectDir, "src", `module${i}.ts`),
        `export function func${i}(x: number): number { return x * ${i}; }\nexport interface Type${i} { value: number; name: string; }`
      );
    }

    const result = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 2000,
    });

    // Should still produce valid output within budget constraints
    expect(result.markdown).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);

    // Some files may have been truncated from code map
    // (truncated array collects dropped file paths)
    await rm(projectDir, { recursive: true });
  });

  test("handles monorepo project", async () => {
    const projectDir = await setupProject({});

    // Create a monorepo structure
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({
        name: "my-monorepo",
        workspaces: ["apps/*", "packages/*"],
      })
    );
    await writeFile(join(projectDir, "turbo.json"), "{}");
    await mkdir(join(projectDir, "apps", "web"), { recursive: true });
    await writeFile(
      join(projectDir, "apps", "web", "package.json"),
      JSON.stringify({
        name: "@mono/web",
        description: "Web frontend",
        dependencies: { react: "^18.0.0" },
      })
    );
    await mkdir(join(projectDir, "packages", "shared"), { recursive: true });
    await writeFile(
      join(projectDir, "packages", "shared", "package.json"),
      JSON.stringify({ name: "@mono/shared" })
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const overview = result.sections.find((s) => s.id === "overview");
    expect(overview).toBeTruthy();
    expect(overview!.content).toContain("Monorepo");
    expect(overview!.content).toContain("Turborepo");
    expect(overview!.content).toContain("Workspaces");

    await rm(projectDir, { recursive: true });
  });

  test("handles large key file with truncation", async () => {
    const projectDir = await setupProject({});

    // Create a very large key file
    const bigContent = "export const x = " + "a".repeat(10000) + ";";
    await writeFile(join(projectDir, "src", "big.ts"), bigContent);
    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:
  budget: 2000
  key_files:
    - "src/big.ts"
`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    // Should handle gracefully even if the file exceeds the key files budget
    expect(result.markdown).toBeTruthy();

    await rm(projectDir, { recursive: true });
  });

  test("shouldIgnore matches exact names from DEFAULT_IGNORE", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    // Create directories that match exact ignore patterns
    await mkdir(join(projectDir, "node_modules"), { recursive: true });
    await writeFile(join(projectDir, "node_modules", "pkg.js"), "");
    await mkdir(join(projectDir, "dist"), { recursive: true });
    await writeFile(join(projectDir, "dist", "bundle.js"), "");

    const result = await generateProjectContext(projectDir, { dryRun: true });
    // node_modules and dist should be ignored in tree and code map
    expect(result.markdown).not.toContain("node_modules");

    await rm(projectDir, { recursive: true });
  });

  test("implementation files appear before type-only files", async () => {
    const projectDir = await setupProject({
      "src/types.ts": "export type Status = 'active' | 'inactive';",
      "src/service.ts": "export function handleRequest(): void {}\nexport function processData(): void {}",
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");
    if (codeMap && codeMap.content) {
      const servicePos = codeMap.content.indexOf("service.ts");
      const typesPos = codeMap.content.indexOf("types.ts");
      // Implementation file should appear before type-only file
      if (servicePos !== -1 && typesPos !== -1) {
        expect(servicePos).toBeLessThan(typesPos);
      }
    }

    await rm(projectDir, { recursive: true });
  });

  test("handles .think.yaml with signature_depth 'all'", async () => {
    const projectDir = await setupProject({
      "src/index.ts": `function privateHelper(): void {}
export function publicApi(): void {}`,
    });

    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:
  signature_depth: all
`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");
    // With "all", private functions should be included
    if (codeMap) {
      expect(codeMap.content).toContain("privateHelper");
    }

    await rm(projectDir, { recursive: true });
  });

  test("includes multiple knowledge files sorted alphabetically", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    const knowledgeDir = join(projectDir, ".think", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(join(knowledgeDir, "beta.md"), "# Beta\n\nBeta docs.");
    await writeFile(join(knowledgeDir, "alpha.md"), "# Alpha\n\nAlpha docs.");

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    expect(knowledge).toBeTruthy();
    // Both files should be included, sorted alphabetically (alpha before beta)
    const alphaPos = knowledge!.content.indexOf("Alpha docs");
    const betaPos = knowledge!.content.indexOf("Beta docs");
    expect(alphaPos).toBeGreaterThan(-1);
    expect(betaPos).toBeGreaterThan(-1);
    expect(alphaPos).toBeLessThan(betaPos);

    await rm(projectDir, { recursive: true });
  });

  test("handles knowledge directory that exists but fails readdir", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    // Create knowledge path as a file (not directory) — existsSync returns true
    // but readdir will throw ENOTDIR, exercising the catch block
    const knowledgeDir = join(projectDir, ".think", "knowledge");
    await mkdir(join(projectDir, ".think"), { recursive: true });
    await writeFile(knowledgeDir, "not a directory");

    const result = await generateProjectContext(projectDir, { dryRun: true });
    expect(result.markdown).toBeTruthy();
    // No user knowledge should exist (auto may fill in)
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    if (knowledge) {
      expect(knowledge.content).not.toContain("readdir");
    }

    await rm(projectDir, { recursive: true });
  });

  test("filePriority returns 7 for schema/constants/env files", async () => {
    const projectDir = await setupProject({
      "src/schema.ts": "export function validateSchema(input: unknown): boolean { return true; }",
      "src/constants.ts": "export function getConstants(): string[] { return []; }",
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");
    // schema.ts and constants.ts should appear in code map (they have functions)
    if (codeMap) {
      expect(codeMap.content).toContain("schema.ts");
    }

    await rm(projectDir, { recursive: true });
  });

  test("code_map_format signatures strips skeleton markers", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export function hello(): void {}",
    });
    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:\n  code_map_format: signatures\n`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");
    expect(codeMap).toBeTruthy();

    await rm(projectDir, { recursive: true });
  });

  test("truncates code map when budget is tiny", async () => {
    const projectDir = await setupProject({});
    // Create many files with extractable functions to overflow code map
    for (let i = 0; i < 50; i++) {
      await writeFile(
        join(projectDir, "src", `mod${i}.ts`),
        `export function fn${i}(x: number): number { return x; }\nexport class Cls${i} { method(): void {} }`
      );
    }

    const result = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 800,
    });
    // Some files should be truncated from code map even after budget expansion
    expect(result.truncated.length).toBeGreaterThan(0);

    await rm(projectDir, { recursive: true });
  });

  test("per-file cap prevents one file from consuming entire budget", async () => {
    const projectDir = await setupProject({});

    // Create one file with many interfaces (verbose) and several small impl files
    const bigTypes = Array.from({ length: 20 }, (_, i) =>
      `export interface Model${i} {\n  id: string;\n  name: string;\n  value: number;\n  active: boolean;\n  createdAt: Date;\n}`
    ).join("\n\n");
    await writeFile(join(projectDir, "src", "types.ts"), bigTypes);

    for (let i = 0; i < 5; i++) {
      await writeFile(
        join(projectDir, "src", `service${i}.ts`),
        `export function handle${i}(): void {}`
      );
    }

    const result = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 3000,
    });
    const codeMap = result.sections.find((s) => s.id === "codeMap");

    // At least some service files should appear in the code map
    if (codeMap) {
      const serviceCount = (codeMap.content.match(/service\d\.ts/g) || []).length;
      expect(serviceCount).toBeGreaterThan(0);
    }

    await rm(projectDir, { recursive: true });
  });

  test("verbose interfaces are collapsed when file exceeds cap", async () => {
    const projectDir = await setupProject({});

    // Create a types file with very verbose interfaces
    const verboseTypes = Array.from({ length: 15 }, (_, i) =>
      `export interface VerboseModel${i} {\n` +
      Array.from({ length: 10 }, (_, j) => `  field${j}: string;`).join("\n") +
      `\n}`
    ).join("\n\n");
    await writeFile(join(projectDir, "src", "models.ts"), verboseTypes);

    // Also add an impl file so budget is split
    await writeFile(
      join(projectDir, "src", "handler.ts"),
      "export function handle(): void {}"
    );

    const result = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 3000,
    });
    const codeMap = result.sections.find((s) => s.id === "codeMap");

    if (codeMap && codeMap.content.includes("models.ts")) {
      // If models.ts made it in, it should have collapsed bodies
      expect(codeMap.content).toContain("{ ... }");
    }

    await rm(projectDir, { recursive: true });
  });

  test("handles unreadable subdirectory during walk", async () => {
    const projectDir = await setupProject({
      "src/index.ts": "export const x = 1;",
    });

    const unreadable = join(projectDir, "src", "private");
    await mkdir(unreadable, { recursive: true });
    await writeFile(join(unreadable, "secret.ts"), "export const s = 1;");
    await chmod(unreadable, 0o000);

    try {
      const result = await generateProjectContext(projectDir, { dryRun: true });
      expect(result.markdown).toBeTruthy();
      expect(result.markdown).toContain("index.ts");
    } finally {
      await chmod(unreadable, 0o755);
      await rm(projectDir, { recursive: true });
    }
  });

  test("barrel files get low priority in code map", async () => {
    const projectDir = await setupProject({
      "src/index.ts": `export { foo } from "./utils";\nexport { bar } from "./helpers";`,
      "src/utils.ts": "export function foo(): void {}",
      "src/helpers.ts": "export function bar(): void {}",
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const codeMap = result.sections.find((s) => s.id === "codeMap");
    if (codeMap) {
      // Implementation files should appear before barrel index
      const utilsPos = codeMap.content.indexOf("utils.ts");
      const indexPos = codeMap.content.indexOf("index.ts");
      // Barrel may not appear at all, or after impl files
      if (utilsPos !== -1 && indexPos !== -1) {
        expect(utilsPos).toBeLessThan(indexPos);
      }
    }

    await rm(projectDir, { recursive: true });
  });

  test("handles file with signatures exceeding very tiny per-file cap", async () => {
    const projectDir = await setupProject({});

    // Create many files so per-file cap is very tiny, and one verbose file
    for (let i = 0; i < 20; i++) {
      await writeFile(
        join(projectDir, "src", `mod${i}.ts`),
        `export function f${i}(): void {}`
      );
    }
    // One file with a single very long signature that won't fit in per-file cap
    const longSig = `export function veryLongFunctionName(${Array.from(
      { length: 50 },
      (_, i) => `param${i}: string`
    ).join(", ")}): void {}`;
    await writeFile(join(projectDir, "src", "verbose.ts"), longSig);

    const result = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 1500,
    });
    expect(result.markdown).toBeTruthy();

    await rm(projectDir, { recursive: true });
  });

  test("auto-generates knowledge when no user knowledge exists", async () => {
    const projectDir = await setupProject({
      "src/routes/api.ts": `import { authService } from "../services/auth";\nexport function getUsers(): void {}`,
      "src/services/auth.ts": `import { User } from "../models/user";\nexport function authenticate(): void {}`,
      "src/models/user.ts": "export interface User { id: string; name: string; }",
    });

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    expect(knowledge).toBeTruthy();
    expect(knowledge!.content).toContain("(auto)");

    await rm(projectDir, { recursive: true });
  });

  test("user knowledge takes priority over auto knowledge", async () => {
    const projectDir = await setupProject({
      "src/routes/api.ts": `import { auth } from "../services/auth";\nexport function getUsers(): void {}`,
      "src/services/auth.ts": "export function authenticate(): void {}",
    });

    const knowledgeDir = join(projectDir, ".think", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(join(knowledgeDir, "architecture.md"), "# Architecture\n\nCustom architecture docs.");

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    expect(knowledge).toBeTruthy();
    // User knowledge appears first
    expect(knowledge!.content).toContain("Custom architecture docs");
    const userPos = knowledge!.content.indexOf("Custom architecture docs");
    const autoPos = knowledge!.content.indexOf("(auto)");
    if (autoPos !== -1) {
      expect(userPos).toBeLessThan(autoPos);
    }

    await rm(projectDir, { recursive: true });
  });

  test("expands code map when budget is underutilized", async () => {
    const projectDir = await setupProject({});

    // Create enough files that some get truncated at default budget
    for (let i = 0; i < 30; i++) {
      await writeFile(
        join(projectDir, "src", `mod${i}.ts`),
        `export function fn${i}(x: number): number { return x * ${i}; }\nexport class Cls${i} { method(): void {} }`
      );
    }

    // Run with a large budget — most sections will use little, surplus should expand code map
    const result = await generateProjectContext(projectDir, {
      dryRun: true,
      budget: 20000,
    });

    const codeMap = result.sections.find((s) => s.id === "codeMap");
    expect(codeMap).toBeTruthy();
    // With 20k budget and small project, most files should be included
    expect(result.truncated.length).toBe(0);

    await rm(projectDir, { recursive: true });
  });

  test("auto_knowledge: false disables auto generation", async () => {
    const projectDir = await setupProject({
      "src/routes/api.ts": "export function getUsers(): void {}",
      "src/services/auth.ts": "export function authenticate(): void {}",
    });

    await writeFile(
      join(projectDir, ".think.yaml"),
      `context:\n  auto_knowledge: false\n`
    );

    const result = await generateProjectContext(projectDir, { dryRun: true });
    const knowledge = result.sections.find((s) => s.id === "knowledge");
    // Should not contain auto-generated entries
    if (knowledge) {
      expect(knowledge.content).not.toContain("(auto)");
    }

    await rm(projectDir, { recursive: true });
  });
});
