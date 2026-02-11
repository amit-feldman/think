import { describe, expect, test } from "bun:test";
import { getSupportedExtensions, parseSource, __ts_test } from "./tree-sitter.ts";

describe("tree-sitter loader", () => {
  test("supported extensions include TS/JS and any shipped WASMs", async () => {
    const exts = await getSupportedExtensions();
    expect(exts).toContain(".ts");
    expect(exts).toContain(".js");
    // At least one non-JS language should be present (e.g., python)
    expect(exts.some((e) => [".py", ".go", ".rs", ".java", ".cs", ".rb", ".php"].includes(e))).toBe(true);
  });

  test("can parse simple JavaScript source when grammar is available", async () => {
    const tree = await parseSource("function hello(){}", "javascript" as any);
    expect(tree).not.toBeNull();
    expect(typeof tree).toBe("object");
  });

  test("pickWasmDir returns a valid directory path", async () => {
    const dir = await __ts_test.pickWasmDir();
    expect(typeof dir).toBe("string");
    expect(dir.length).toBeGreaterThan(0);
  });

  test("loadGrammar returns null for invalid WASM path", async () => {
    const result = await __ts_test.loadGrammar("/nonexistent/bad.wasm");
    expect(result).toBeNull();
  });
});
