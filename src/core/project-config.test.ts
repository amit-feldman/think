import { describe, expect, test } from "bun:test";
import { loadContextConfig } from "./project-config.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("loadContextConfig", () => {
  const tmpBase = join(tmpdir(), "think-test-config-" + Date.now());

  test("returns defaults when no .think.yaml", async () => {
    const dir = join(tmpBase, "no-yaml");
    await mkdir(dir, { recursive: true });
    const config = await loadContextConfig(dir);
    expect(config.budget).toBe(12000);
    expect(config.key_files).toEqual([]);
    expect(config.knowledge_dir).toBe(".think/knowledge");
    expect(config.signature_depth).toBe("exports");
    await rm(dir, { recursive: true });
  });

  test("parses valid .think.yaml", async () => {
    const dir = join(tmpBase, "valid-yaml");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:
  budget: 8000
  signature_depth: all
  key_files:
    - "src/main.ts"
    - "src/config.ts"
  knowledge_dir: docs
`
    );
    const config = await loadContextConfig(dir);
    expect(config.budget).toBe(8000);
    expect(config.signature_depth).toBe("all");
    expect(config.key_files).toEqual(["src/main.ts", "src/config.ts"]);
    expect(config.knowledge_dir).toBe("docs");
    await rm(dir, { recursive: true });
  });

  test("parses inline arrays", async () => {
    const dir = join(tmpBase, "inline-array");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:
  key_files: ["a.ts", "b.ts"]
  exclude_signatures: []
`
    );
    const config = await loadContextConfig(dir);
    expect(config.key_files).toEqual(["a.ts", "b.ts"]);
    expect(config.exclude_signatures).toEqual([]);
    await rm(dir, { recursive: true });
  });

  test("handles malformed YAML gracefully", async () => {
    const dir = join(tmpBase, "bad-yaml");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".think.yaml"), "{{{{not yaml at all: ][");
    // Should not throw, returns defaults
    const config = await loadContextConfig(dir);
    expect(config.budget).toBe(12000);
    await rm(dir, { recursive: true });
  });

  test("handles non-context sections gracefully", async () => {
    const dir = join(tmpBase, "other-section");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `other:
  key: value
context:
  budget: 5000
`
    );
    const config = await loadContextConfig(dir);
    expect(config.budget).toBe(5000);
    await rm(dir, { recursive: true });
  });

  test("applies Zod defaults for missing fields", async () => {
    const dir = join(tmpBase, "partial-yaml");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:
  budget: 6000
`
    );
    const config = await loadContextConfig(dir);
    expect(config.budget).toBe(6000);
    expect(config.signature_depth).toBe("exports");
    expect(config.knowledge_dir).toBe(".think/knowledge");
    await rm(dir, { recursive: true });
  });

  test("handles comments in YAML", async () => {
    const dir = join(tmpBase, "yaml-comments");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `# Main config
context:
  # Token budget
  budget: 7000
  # Files to include
  key_files:
    - "src/index.ts"
`
    );
    const config = await loadContextConfig(dir);
    expect(config.budget).toBe(7000);
    expect(config.key_files).toEqual(["src/index.ts"]);
    await rm(dir, { recursive: true });
  });

  test("flushes pending array when hitting new section", async () => {
    const dir = join(tmpBase, "section-flush");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:
  key_files:
    - "src/a.ts"
    - "src/b.ts"
other:
  unrelated: true
`
    );
    const config = await loadContextConfig(dir);
    expect(config.key_files).toEqual(["src/a.ts", "src/b.ts"]);
    await rm(dir, { recursive: true });
  });

  test("warns and uses defaults for Zod-invalid values", async () => {
    const dir = join(tmpBase, "zod-invalid");
    await mkdir(dir, { recursive: true });
    // budget must be an integer >= 1000, so "not_a_number" should fail Zod
    await writeFile(
      join(dir, ".think.yaml"),
      `context:
  budget: not_a_number
  signature_depth: invalid_value
`
    );
    // Suppress console.error for this test
    const origError = console.error;
    let errorMsg = "";
    console.error = (msg: string) => { errorMsg = msg; };

    const config = await loadContextConfig(dir);
    console.error = origError;

    // Should have logged a warning
    expect(errorMsg).toContain("invalid fields");
    // Falls back to merged defaults
    expect(config.budget).toBeDefined();
    await rm(dir, { recursive: true });
  });

  test("handles file read error gracefully", async () => {
    const dir = join(tmpBase, "read-error");
    await mkdir(dir, { recursive: true });
    // Create .think.yaml as a directory (readFile will throw)
    await mkdir(join(dir, ".think.yaml"), { recursive: true });

    const origError = console.error;
    let errorMsg = "";
    console.error = (msg: string) => { errorMsg = msg; };

    const config = await loadContextConfig(dir);
    console.error = origError;

    expect(errorMsg).toContain("failed to parse");
    expect(config.budget).toBe(12000);
    await rm(dir, { recursive: true });
  });

  test("parses boolean values in YAML", async () => {
    const dir = join(tmpBase, "bool-yaml");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:\n  auto_knowledge: true\n`
    );
    const config = await loadContextConfig(dir);
    expect(config.auto_knowledge).toBe(true);
    await rm(dir, { recursive: true });
  });

  test("parses boolean false in YAML", async () => {
    const dir = join(tmpBase, "bool-false-yaml");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:\n  auto_knowledge: false\n`
    );
    const config = await loadContextConfig(dir);
    expect(config.auto_knowledge).toBe(false);
    await rm(dir, { recursive: true });
  });

  test("handles quoted scalar values", async () => {
    const dir = join(tmpBase, "quoted-yaml");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, ".think.yaml"),
      `context:
  knowledge_dir: "custom/docs"
  signature_depth: 'exports'
`
    );
    const config = await loadContextConfig(dir);
    expect(config.knowledge_dir).toBe("custom/docs");
    expect(config.signature_depth).toBe("exports");
    await rm(dir, { recursive: true });
  });
});
