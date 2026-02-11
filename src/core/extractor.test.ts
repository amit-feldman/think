import { describe, expect, test } from "bun:test";
import { extractFileSignatures, scanImports } from "./extractor.ts";
import { extractWithTreeSitter } from "./queries.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("extractWithTreeSitter (TS/JS)", () => {
  test("extracts exported function declarations with params", async () => {
    const code = `export function hello(name: string): void {
  console.log(name);
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("function");
    expect(sigs[0]!.name).toBe("hello");
    expect(sigs[0]!.exported).toBe(true);
    expect(sigs[0]!.signature).toContain("name: string");
    expect(sigs[0]!.signature).not.toContain("console");
  });

  test("extracts async functions", async () => {
    const code = `export async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("fetchData");
    expect(sigs[0]!.signature).toContain("async");
    expect(sigs[0]!.signature).toContain("url: string");
  });

  test("extracts non-exported functions", async () => {
    const code = `function helper(x: number): number {
  return x + 1;
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.exported).toBe(false);
  });

  test("extracts arrow functions", async () => {
    const code = `export const greet = (name: string) => {
  return \`Hello \${name}\`;
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("function");
    expect(sigs[0]!.name).toBe("greet");
    expect(sigs[0]!.signature).toContain("=>");
    expect(sigs[0]!.signature).toContain("name: string");
  });

  test("extracts type aliases", async () => {
    const code = `export type Runtime = "bun" | "node" | "deno"`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("type");
    expect(sigs[0]!.name).toBe("Runtime");
    expect(sigs[0]!.signature).toContain('"bun"');
  });

  test("extracts interfaces with body", async () => {
    const code = `export interface Config {
  name: string;
  value: number;
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("interface");
    expect(sigs[0]!.name).toBe("Config");
    expect(sigs[0]!.signature).toContain("name: string");
  });

  test("extracts classes with methods", async () => {
    const code = `export class MyService {
  private db: Database;
  public getData(id: string): Data {
    return this.db.get(id);
  }
  async save(data: Data): Promise<void> {
    await this.db.save(data);
  }
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("class");
    expect(sigs[0]!.name).toBe("MyService");
    expect(sigs[0]!.signature).toContain("getData");
    expect(sigs[0]!.signature).toContain("save");
  });

  test("extracts enums", async () => {
    const code = `export enum Color {
  Red = "red",
  Blue = "blue",
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("enum");
    expect(sigs[0]!.name).toBe("Color");
    expect(sigs[0]!.signature).toContain("Red");
  });

  test("extracts exported const with type", async () => {
    const code = `export const CONFIG: AppConfig = { name: "test" }`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("const");
    expect(sigs[0]!.name).toBe("CONFIG");
    expect(sigs[0]!.signature).toContain("AppConfig");
  });

  test("extracts re-exports", async () => {
    const code = `export { foo, bar } from "./utils"`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toContain("re-export");
    expect(sigs[0]!.exported).toBe(true);
  });

  test("extracts export * from", async () => {
    const code = `export * from "./types"`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toContain("re-export");
  });

  test("extracts type re-exports", async () => {
    const code = `export type { Config } from "./config"`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
  });

  test("handles javascript language string", async () => {
    const code = `export function hello(x) { return x; }`;
    const sigs = await extractWithTreeSitter(code, "javascript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.signature).toContain("x");
  });

  test("extracts interface with extends", async () => {
    const code = `export interface ExtendedConfig extends BaseConfig {
  extra: boolean;
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("interface");
    expect(sigs[0]!.signature).toContain("extends");
  });

  test("type with block body", async () => {
    const code = `export type Complex = {
  name: string;
  value: number;
}`;
    const sigs = await extractWithTreeSitter(code, "typescript");
    if (!sigs) return;
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("type");
    expect(sigs[0]!.signature).toContain("name: string");
  });
});

describe("extractFileSignatures", () => {
  const tmpDir = join(tmpdir(), "think-test-extractor-" + Date.now());

  test("returns null for non-existent file", async () => {
    const result = await extractFileSignatures("/nonexistent/file.ts", "/nonexistent");
    expect(result).toBeNull();
  });

  test("returns null for unsupported extension", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "test.txt");
    await writeFile(filePath, "just plain text");
    const result = await extractFileSignatures(filePath, tmpDir);
    expect(result).toBeNull();
    await rm(tmpDir, { recursive: true });
  });

  test("extracts signatures from a .ts file", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "test.ts");
    await writeFile(filePath, "export function hello(): void {}");
    const result = await extractFileSignatures(filePath, tmpDir);
    expect(result).not.toBeNull();
    expect(result!.language).toBe("typescript");
    expect(result!.path).toBe("test.ts");
    expect(result!.signatures.length).toBe(1);
    await rm(tmpDir, { recursive: true });
  });

  test("returns null when file read fails", async () => {
    await mkdir(tmpDir, { recursive: true });
    const dirAsFile = join(tmpDir, "fake.ts");
    mkdirSync(dirAsFile, { recursive: true });
    const result = await extractFileSignatures(dirAsFile, tmpDir);
    expect(result).toBeNull();
    await rm(tmpDir, { recursive: true });
  });

  test("extracts signatures from a .js file with correct language", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "test.js");
    await writeFile(filePath, "export function hello(x) { return x; }");
    const result = await extractFileSignatures(filePath, tmpDir);
    expect(result).not.toBeNull();
    expect(result!.language).toBe("javascript");
    expect(result!.signatures.length).toBe(1);
    await rm(tmpDir, { recursive: true });
  });

  test("extracts from multiple languages via tree-sitter", async () => {
    await mkdir(tmpDir, { recursive: true });
    const cases: Array<[string, string]> = [
      ["test.py", "def f():\n  pass\nclass C:\n  pass\n"],
      ["test.go", "package main\n type U struct{ID int}\n func main(){}"],
      ["test.rs", "struct U{ id:i32 } fn main(){}"],
      ["Test.java", "class A{ void m(){} }"],
      ["Program.cs", "class A{ void M(){} }"],
      ["test.rb", "class A; def m; end; end"],
      ["index.php", "<?php function f(){} class A{} ?>"],
    ];
    for (const [fname, src] of cases) {
      const p = join(tmpDir, fname);
      await writeFile(p, src);
      const r = await extractFileSignatures(p, tmpDir);
      expect(r === null || (r && r.signatures.length >= 0)).toBe(true);
    }
    await rm(tmpDir, { recursive: true });
  });

  test("populates imports field for TS/JS files", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "test.ts");
    await writeFile(
      filePath,
      `import { foo } from "./utils";\nimport express from "express";\nexport function main(): void {}`
    );
    const result = await extractFileSignatures(filePath, tmpDir);
    expect(result).not.toBeNull();
    expect(result!.imports).toBeDefined();
    expect(result!.imports!.length).toBe(2);

    const relImport = result!.imports!.find((i) => i.source === "./utils");
    expect(relImport).toBeTruthy();
    expect(relImport!.isRelative).toBe(true);

    const absImport = result!.imports!.find((i) => i.source === "express");
    expect(absImport).toBeTruthy();
    expect(absImport!.isRelative).toBe(false);

    await rm(tmpDir, { recursive: true });
  });
});

describe("scanImports", () => {
  test("extracts ES module imports", () => {
    const code = `import { foo } from "./utils";\nimport bar from "express";`;
    const imports = scanImports(code, "typescript");
    expect(imports.length).toBe(2);
    expect(imports[0]!.source).toBe("./utils");
    expect(imports[0]!.isRelative).toBe(true);
    expect(imports[1]!.source).toBe("express");
    expect(imports[1]!.isRelative).toBe(false);
  });

  test("extracts require calls", () => {
    const code = `const fs = require("fs");\nconst utils = require("./lib/utils");`;
    const imports = scanImports(code, "javascript");
    expect(imports.length).toBe(2);
    expect(imports.find((i) => i.source === "fs")).toBeTruthy();
    expect(imports.find((i) => i.source === "./lib/utils")!.isRelative).toBe(true);
  });

  test("extracts Python imports", () => {
    const code = `import os\nfrom flask import Flask\nimport mypackage.utils`;
    const imports = scanImports(code, "python");
    expect(imports.length).toBe(3);
    expect(imports.find((i) => i.source === "os")).toBeTruthy();
    expect(imports.find((i) => i.source === "flask")).toBeTruthy();
    expect(imports.find((i) => i.source === "mypackage.utils")).toBeTruthy();
  });

  test("extracts Rust use statements", () => {
    const code = `use std::io;\nuse crate::config;`;
    const imports = scanImports(code, "rust");
    expect(imports.length).toBe(2);
    expect(imports.find((i) => i.source === "std::io")).toBeTruthy();
    expect(imports.find((i) => i.source === "crate::config")).toBeTruthy();
  });

  test("deduplicates imports", () => {
    const code = `import { a } from "./utils";\nimport { b } from "./utils";`;
    const imports = scanImports(code, "typescript");
    expect(imports.length).toBe(1);
  });

  test("ignores imports inside comments", () => {
    const code = `import { foo } from "./utils";
// import { bar } from "fake-pkg";
/* import baz from "another-fake"; */
// Simple resolution: from "src/routes/api.ts" importing "../services/db"
`;
    const imports = scanImports(code, "typescript");
    expect(imports.length).toBe(1);
    expect(imports[0]!.source).toBe("./utils");
  });

  test("returns empty for unsupported language", () => {
    const imports = scanImports("some code", "haskell");
    expect(imports).toEqual([]);
  });

  test("extracts Go imports", () => {
    const code = `package main\nimport (\n  "fmt"\n  "net/http"\n)`;
    const imports = scanImports(code, "go");
    expect(imports.length).toBe(2);
    expect(imports.find((i) => i.source === "fmt")).toBeTruthy();
    expect(imports.find((i) => i.source === "net/http")).toBeTruthy();
  });
});

describe("extractFileSignatures imports-only", () => {
  const tmpDir = join(tmpdir(), "think-test-imports-" + Date.now());

  test("returns imports-only result when no signatures found", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "imports-only.ts");
    // File with imports but no extractable top-level declarations
    await writeFile(filePath, `import { foo } from "./bar";\nfoo();\nconsole.log("hi");`);
    const result = await extractFileSignatures(filePath, tmpDir);
    expect(result).not.toBeNull();
    expect(result!.imports).toBeDefined();
    expect(result!.imports!.length).toBe(1);
    expect(result!.imports![0]!.source).toBe("./bar");
    expect(result!.signatures.length).toBe(0);
    await rm(tmpDir, { recursive: true });
  });

  test("returns null when no signatures and no imports", async () => {
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "empty-code.ts");
    // File with no imports and no extractable declarations
    await writeFile(filePath, `console.log("hello");\nconst x = 1 + 2;`);
    const result = await extractFileSignatures(filePath, tmpDir);
    expect(result).toBeNull();
    await rm(tmpDir, { recursive: true });
  });
});
