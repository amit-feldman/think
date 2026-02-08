import { describe, expect, test } from "bun:test";
import { extractSignatures, extractFileSignatures } from "./extractor.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("extractSignatures", () => {
  test("returns empty for unsupported language", () => {
    expect(extractSignatures("fn main() {}", "rust")).toEqual([]);
  });

  test("extracts exported function declarations", () => {
    const code = `export function hello(name: string): void {
  console.log(name);
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("function");
    expect(sigs[0]!.name).toBe("hello");
    expect(sigs[0]!.exported).toBe(true);
    expect(sigs[0]!.signature).toContain("hello");
  });

  test("extracts async functions", () => {
    const code = `export async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("fetchData");
    expect(sigs[0]!.signature).toContain("async");
  });

  test("extracts non-exported functions", () => {
    const code = `function helper(x: number): number {
  return x + 1;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.exported).toBe(false);
  });

  test("extracts arrow functions", () => {
    const code = `export const greet = (name: string) => {
  return \`Hello \${name}\`;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("function");
    expect(sigs[0]!.name).toBe("greet");
    expect(sigs[0]!.signature).toContain("=>");
  });

  test("extracts type aliases", () => {
    const code = `export type Runtime = "bun" | "node" | "deno"`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("type");
    expect(sigs[0]!.name).toBe("Runtime");
  });

  test("extracts interfaces with body", () => {
    const code = `export interface Config {
  name: string;
  value: number;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("interface");
    expect(sigs[0]!.name).toBe("Config");
    expect(sigs[0]!.signature).toContain("name: string");
  });

  test("extracts classes with methods", () => {
    const code = `export class MyService {
  private db: Database;
  public getData(id: string): Data {
    return this.db.get(id);
  }
  async save(data: Data): Promise<void> {
    await this.db.save(data);
  }
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("class");
    expect(sigs[0]!.name).toBe("MyService");
    expect(sigs[0]!.signature).toContain("getData");
    expect(sigs[0]!.signature).toContain("save");
  });

  test("extracts enums", () => {
    const code = `export enum Color {
  Red = "red",
  Blue = "blue",
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("enum");
    expect(sigs[0]!.name).toBe("Color");
  });

  test("extracts exported const with type", () => {
    const code = `export const CONFIG: AppConfig = { ... }`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("const");
    expect(sigs[0]!.name).toBe("CONFIG");
  });

  test("extracts exported const without type (as const)", () => {
    const code = `export const WEIGHTS = {} as const`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("const");
    expect(sigs[0]!.name).toBe("WEIGHTS");
  });

  test("extracts re-exports", () => {
    const code = `export { foo, bar } from "./utils"`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toContain("re-export");
    expect(sigs[0]!.exported).toBe(true);
  });

  test("extracts export * from", () => {
    const code = `export * from "./types"`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toContain("re-export");
  });

  test("extracts type re-exports", () => {
    const code = `export type { Config } from "./config"`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
  });

  test("skips comment lines", () => {
    const code = `// export function fake(): void {}
/* export function alsoFake(): void {} */
* not a real export
export function real(): void {}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("real");
  });

  test("handles multi-line function signatures", () => {
    // The regex-based extractor requires params on the first line
    // Multi-line params where ( is not closed on line 1 won't match
    // But functions with all params on one line do match
    const code = `export function create(name: string, options: Options): Result {
  return new Result();
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("create");
  });

  test("handles multi-line arrow function", () => {
    const code = `export const handler = async (
  req: Request,
  res: Response
) => {
  return res.json({});
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("handler");
  });

  test("handles type with block body", () => {
    const code = `export type Complex = {
  name: string;
  value: number;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("type");
    expect(sigs[0]!.signature).toContain("name: string");
  });

  test("handles type spanning multiple lines (union)", () => {
    const code = `export type Status =
  | "pending"
  | "active"
  | "done"`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.signature).toContain("pending");
  });

  test("handles interface with extends", () => {
    const code = `export interface ExtendedConfig extends BaseConfig {
  extra: boolean;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("interface");
    expect(sigs[0]!.signature).toContain("extends");
  });

  test("handles interface with opening brace on next line", () => {
    const code = `export interface Config
{
  name: string;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.signature).toContain("name: string");
  });

  test("handles abstract class", () => {
    const code = `export abstract class Base {
  abstract method(): void;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("Base");
  });

  test("handles class with opening brace on next line", () => {
    const code = `export class Foo
{
  bar(): string { return ""; }
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.signature).toContain("bar()");
  });

  test("handles javascript language string", () => {
    const code = `export function hello() {}`;
    const sigs = extractSignatures(code, "javascript");
    expect(sigs.length).toBe(1);
  });

  test("handles class properties", () => {
    const code = `export class Service {
  readonly name: string
  private count: number
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.signature).toContain("name: string");
    expect(sigs[0]!.signature).toContain("count: number");
  });

  test("handles export * as namespace", () => {
    const code = `export * as utils from "./utils"`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
  });

  test("handles const enum", () => {
    const code = `export const enum Direction { Up, Down }`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.kind).toBe("enum");
  });

  test("handles function with body brace on next line", () => {
    const code = `export function hello(): void
{
  return;
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("hello");
    // Signature should be cleaned (no body)
    expect(sigs[0]!.signature).toContain("hello");
  });

  test("handles interface where next line has no brace", () => {
    // Interface declaration without { on same or next line
    const code = `export interface Orphan
  // no brace ever`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("Orphan");
  });

  test("handles class with brace on distant line", () => {
    // Class without { within the next 2 lines
    const code = `export class Distant
  // no brace
  // still no brace
  // still no brace
{
  method(): void {}
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("Distant");
  });

  test("handles unbalanced braces in interface (findClosingBrace returns -1)", () => {
    // Interface with opening { but no closing } within 20 lines
    const code = `export interface Broken {
  name: string;
  value: number;`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("Broken");
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
    const filePath = join(tmpDir, "test.py");
    await writeFile(filePath, "def hello(): pass");
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

  test("handles multi-line function signature spanning 3+ lines", () => {
    // The return type is on a separate line from the closing paren,
    // requiring j++ in the multi-line signature collector
    const code = `export function processData(input: string)
  :
  Promise<void> {
  return Promise.resolve();
}`;
    const sigs = extractSignatures(code, "typescript");
    expect(sigs.length).toBe(1);
    expect(sigs[0]!.name).toBe("processData");
    expect(sigs[0]!.signature).toContain("processData");
  });

  test("returns null when file read fails", async () => {
    await mkdir(tmpDir, { recursive: true });
    // Create a directory with a .ts extension — readFile will throw
    const dirAsFile = join(tmpDir, "fake.ts");
    mkdirSync(dirAsFile, { recursive: true });
    const result = await extractFileSignatures(dirAsFile, tmpDir);
    expect(result).toBeNull();
    await rm(tmpDir, { recursive: true });
  });
});
