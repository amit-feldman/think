import { describe, expect, test } from "bun:test";
import { extractWithTreeSitter, __queries_test } from "./queries.ts";

describe("extractWithTreeSitter", () => {
  test("returns null for unsupported language", async () => {
    const out = await extractWithTreeSitter("def f(): pass", "elixir" as any);
    expect(out).toBeNull();
  });

  // ── TypeScript ──────────────────────────────────────────────────

  test("TS: exported function with params and return type", async () => {
    const code = `export function hello(name: string): void {
  console.log(name);
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return; // grammar not available
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("function");
    expect(entries[0]!.name).toBe("hello");
    expect(entries[0]!.exported).toBe(true);
    expect(entries[0]!.signature).toContain("hello");
    expect(entries[0]!.signature).toContain("name: string");
    expect(entries[0]!.signature).toContain("void");
    expect(entries[0]!.signature).not.toContain("console");
  });

  test("TS: async function", async () => {
    const code = `export async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.signature).toContain("async");
    expect(entries[0]!.signature).toContain("url: string");
    expect(entries[0]!.signature).toContain("Promise<Response>");
  });

  test("TS: non-exported function", async () => {
    const code = `function helper(x: number): number {
  return x + 1;
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.exported).toBe(false);
    expect(entries[0]!.signature).toContain("x: number");
  });

  test("TS: arrow function", async () => {
    const code = `export const greet = (name: string) => {
  return \`Hello \${name}\`;
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("function");
    expect(entries[0]!.name).toBe("greet");
    expect(entries[0]!.signature).toContain("=>");
    expect(entries[0]!.signature).toContain("name: string");
  });

  test("TS: interface with body", async () => {
    const code = `export interface Config {
  name: string;
  value: number;
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("interface");
    expect(entries[0]!.name).toBe("Config");
    expect(entries[0]!.signature).toContain("name: string");
    expect(entries[0]!.signature).toContain("value: number");
  });

  test("TS: type alias", async () => {
    const code = `export type Runtime = "bun" | "node" | "deno"`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("type");
    expect(entries[0]!.name).toBe("Runtime");
    expect(entries[0]!.signature).toContain('"bun"');
  });

  test("TS: enum with members", async () => {
    const code = `export enum Color {
  Red = "red",
  Blue = "blue",
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("enum");
    expect(entries[0]!.name).toBe("Color");
    expect(entries[0]!.signature).toContain("Red");
    expect(entries[0]!.signature).toContain("Blue");
  });

  test("TS: class with method signatures", async () => {
    const code = `export class MyService {
  private db: Database;
  public getData(id: string): Data {
    return this.db.get(id);
  }
  async save(data: Data): Promise<void> {
    await this.db.save(data);
  }
}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("class");
    expect(entries[0]!.name).toBe("MyService");
    expect(entries[0]!.signature).toContain("getData");
    expect(entries[0]!.signature).toContain("save");
  });

  test("TS: re-export named", async () => {
    const code = `export { foo, bar } from "./utils"`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.name).toContain("re-export");
    expect(entries[0]!.exported).toBe(true);
    expect(entries[0]!.signature).toContain("foo");
  });

  test("TS: export * from", async () => {
    const code = `export * from "./types"`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.name).toContain("re-export");
  });

  test("TS: exported const with type", async () => {
    const code = `export const CONFIG: AppConfig = { name: "test" }`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("const");
    expect(entries[0]!.name).toBe("CONFIG");
    expect(entries[0]!.signature).toContain("AppConfig");
  });

  // ── JavaScript ──────────────────────────────────────────────────

  test("JS: function declaration", async () => {
    const code = `function a(x, y) { return x + y; } class C {}`;
    const entries = await extractWithTreeSitter(code, "javascript");
    if (!entries) return;
    expect(entries.length).toBe(2);
    expect(entries[0]!.signature).toContain("a");
    expect(entries[0]!.signature).toContain("x, y");
  });

  // ── TSX ─────────────────────────────────────────────────────────

  test("TSX: component function", async () => {
    const code = `export function Component(props: Props) { return <div/> }`;
    const entries = await extractWithTreeSitter(code, "tsx");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.signature).toContain("Component");
    expect(entries[0]!.signature).toContain("props: Props");
  });

  // ── Python ──────────────────────────────────────────────────────

  test("Python: function and class with methods", async () => {
    const code = `def greet(name: str) -> str:
    return f"Hello {name}"

class User:
    def __init__(self, name: str):
        self.name = name
    def get_name(self) -> str:
        return self.name
`;
    const entries = await extractWithTreeSitter(code, "python");
    if (!entries) return;
    expect(entries.length).toBe(2);
    expect(entries[0]!.kind).toBe("function");
    expect(entries[0]!.signature).toContain("name: str");
    expect(entries[0]!.signature).toContain("-> str");
    expect(entries[1]!.kind).toBe("class");
    expect(entries[1]!.signature).toContain("__init__");
    expect(entries[1]!.signature).toContain("get_name");
  });

  // ── Go ──────────────────────────────────────────────────────────

  test("Go: function and struct", async () => {
    const code = `package main

type User struct {
	ID   int
	Name string
}

func NewUser(id int, name string) *User {
	return &User{ID: id, Name: name}
}`;
    const entries = await extractWithTreeSitter(code, "go");
    if (!entries) return;
    expect(entries.length).toBe(2);
    // struct
    const structEntry = entries.find(e => e.name === "User");
    expect(structEntry).toBeDefined();
    expect(structEntry!.signature).toContain("ID");
    expect(structEntry!.signature).toContain("Name");
    // function
    const funcEntry = entries.find(e => e.name === "NewUser");
    expect(funcEntry).toBeDefined();
    expect(funcEntry!.signature).toContain("id int");
    expect(funcEntry!.signature).toContain("*User");
  });

  // ── Rust ────────────────────────────────────────────────────────

  test("Rust: function, struct, enum", async () => {
    const code = `struct User { id: i32, name: String }

fn create_user(id: i32, name: String) -> User {
    User { id, name }
}

enum Status { Active, Inactive }`;
    const entries = await extractWithTreeSitter(code, "rust");
    if (!entries) return;
    expect(entries.length).toBe(3);
    const func = entries.find(e => e.kind === "function");
    expect(func!.signature).toContain("id: i32");
    expect(func!.signature).toContain("-> User");
    const enm = entries.find(e => e.kind === "enum");
    expect(enm!.signature).toContain("Active");
  });

  // ── Java ────────────────────────────────────────────────────────

  test("Java: class with methods", async () => {
    const code = `class UserService {
    private String name;
    public User getUser(int id) {
        return db.get(id);
    }
    void save(User user) {
        db.save(user);
    }
}`;
    const entries = await extractWithTreeSitter(code, "java");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.signature).toContain("getUser");
    expect(entries[0]!.signature).toContain("int id");
    expect(entries[0]!.signature).toContain("save");
  });

  // ── C# ──────────────────────────────────────────────────────────

  test("C#: class with methods", async () => {
    const code = `class Service {
    void Process(string input) {
        Console.WriteLine(input);
    }
}

enum Status { Active, Done }`;
    const entries = await extractWithTreeSitter(code, "csharp");
    if (!entries) return;
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const cls = entries.find(e => e.kind === "class");
    if (cls) {
      expect(cls.signature).toContain("Process");
    }
  });

  // ── Ruby ────────────────────────────────────────────────────────

  test("Ruby: class with methods", async () => {
    const code = `class User
  def initialize(name)
    @name = name
  end

  def greet
    puts @name
  end
end`;
    const entries = await extractWithTreeSitter(code, "ruby");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("class");
    expect(entries[0]!.name).toBe("User");
  });

  // ── PHP ─────────────────────────────────────────────────────────

  test("PHP: function and class", async () => {
    const code = `<?php
function greet(string $name): string {
    return "Hello " . $name;
}

class User {
    public function getName(): string {
        return $this->name;
    }
}
?>`;
    const entries = await extractWithTreeSitter(code, "php");
    if (!entries) return;
    expect(entries.length).toBe(2);
    const func = entries.find(e => e.kind === "function" && e.name === "greet");
    expect(func).toBeDefined();
    expect(func!.signature).toContain("$name");
  });

  // ── Coverage: Go interface and type alias ──────────────────────

  test("Go: interface type", async () => {
    const code = `package main

type Reader interface {
	Read(p []byte) (n int, err error)
}`;
    const entries = await extractWithTreeSitter(code, "go");
    if (!entries) return;
    const iface = entries.find(e => e.kind === "interface");
    expect(iface).toBeDefined();
    expect(iface!.name).toBe("Reader");
    expect(iface!.signature).toContain("Read");
  });

  test("Go: type alias", async () => {
    const code = `package main

type ID int
type Handler func(int) error`;
    const entries = await extractWithTreeSitter(code, "go");
    if (!entries) return;
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const alias = entries.find(e => e.kind === "type");
    expect(alias).toBeDefined();
  });

  // ── Coverage: Rust trait, impl, type ───────────────────────────

  test("Rust: trait", async () => {
    const code = `trait Display {
    fn fmt(&self) -> String;
}`;
    const entries = await extractWithTreeSitter(code, "rust");
    if (!entries) return;
    const trait_ = entries.find(e => e.kind === "interface");
    expect(trait_).toBeDefined();
    expect(trait_!.name).toBe("Display");
  });

  test("Rust: impl block", async () => {
    const code = `struct Point { x: i32, y: i32 }

impl Point {
    fn new(x: i32, y: i32) -> Point {
        Point { x, y }
    }
}`;
    const entries = await extractWithTreeSitter(code, "rust");
    if (!entries) return;
    const implMethod = entries.find(e => e.kind === "function" && e.name === "new");
    expect(implMethod).toBeDefined();
    expect(implMethod!.signature).toContain("x: i32");
  });

  test("Rust: type alias", async () => {
    const code = `type Result = std::result::Result<i32, String>;`;
    const entries = await extractWithTreeSitter(code, "rust");
    if (!entries) return;
    const t = entries.find(e => e.kind === "type");
    expect(t).toBeDefined();
  });

  // ── Coverage: Java enum ────────────────────────────────────────

  test("Java: enum", async () => {
    const code = `enum Color { RED, GREEN, BLUE }`;
    const entries = await extractWithTreeSitter(code, "java");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("enum");
    expect(entries[0]!.signature).toContain("RED");
  });

  // ── Coverage: C# enum, namespace, properties ───────────────────

  test("C#: enum", async () => {
    const code = `enum Direction { North, South, East, West }`;
    const entries = await extractWithTreeSitter(code, "csharp");
    if (!entries) return;
    const enm = entries.find(e => e.kind === "enum");
    expect(enm).toBeDefined();
    expect(enm!.signature).toContain("North");
  });

  test("C#: namespace with class", async () => {
    const code = `namespace MyApp {
    class Service {
        public string Name;
        void Run() {
            Console.WriteLine("run");
        }
    }
}`;
    const entries = await extractWithTreeSitter(code, "csharp");
    if (!entries) return;
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const cls = entries.find(e => e.kind === "class");
    expect(cls).toBeDefined();
    expect(cls!.signature).toContain("Run");
  });

  // ── Coverage: Ruby top-level method and module ─────────────────

  test("Ruby: top-level method", async () => {
    const code = `def hello(name)
  puts name
end`;
    const entries = await extractWithTreeSitter(code, "ruby");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("function");
    expect(entries[0]!.name).toBe("hello");
  });

  test("Ruby: module", async () => {
    const code = `module Utils
  def self.helper
    42
  end
end`;
    const entries = await extractWithTreeSitter(code, "ruby");
    if (!entries) return;
    const mod = entries.find(e => e.kind === "class" && e.name === "Utils");
    expect(mod).toBeDefined();
    expect(mod!.signature).toContain("module");
  });

  // ── Coverage: PHP property ─────────────────────────────────────

  test("PHP: class with property", async () => {
    const code = `<?php
class User {
    public string $name;
    public function getName(): string {
        return $this->name;
    }
}`;
    const entries = await extractWithTreeSitter(code, "php");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("class");
    expect(entries[0]!.signature).toContain("$name");
  });

  // ── Coverage: TS edge cases ────────────────────────────────────

  test("TS: exported const without type annotation", async () => {
    const code = `export const WEIGHTS = {} as const`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("const");
    expect(entries[0]!.name).toBe("WEIGHTS");
  });

  test("TS: exported let without value or type", async () => {
    const code = `export let x;`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("const");
    expect(entries[0]!.name).toBe("x");
  });

  test("TS: export default is handled gracefully", async () => {
    const code = `export default function main() {}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    // Should extract something or at least not crash
    expect(Array.isArray(entries)).toBe(true);
  });

  test("TS: expression statement is ignored", async () => {
    const code = `console.log("hello");
export function real(): void {}`;
    const entries = await extractWithTreeSitter(code, "typescript");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.name).toBe("real");
  });

  // ── Coverage: empty classes (no members) in each language ─────────

  test("Python: class with no methods", async () => {
    const code = `class Empty:\n    pass`;
    const entries = await extractWithTreeSitter(code, "python");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("class");
    expect(entries[0]!.name).toBe("Empty");
  });

  test("Python: decorated function", async () => {
    const code = `@decorator\ndef f():\n    pass`;
    const entries = await extractWithTreeSitter(code, "python");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("function");
  });

  test("Java: empty class", async () => {
    const code = `class Empty {}`;
    const entries = await extractWithTreeSitter(code, "java");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.signature).toContain("Empty");
  });

  test("C#: empty class", async () => {
    const code = `class Empty {}`;
    const entries = await extractWithTreeSitter(code, "csharp");
    if (!entries) return;
    expect(entries.length).toBe(1);
  });

  test("Ruby: empty class", async () => {
    const code = `class Empty\nend`;
    const entries = await extractWithTreeSitter(code, "ruby");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.signature).toContain("end");
  });

  test("PHP: empty class", async () => {
    const code = `<?php\nclass Empty {}`;
    const entries = await extractWithTreeSitter(code, "php");
    if (!entries) return;
    expect(entries.length).toBe(1);
  });

  test("PHP: namespace with class", async () => {
    const code = `<?php\nnamespace App {\n    class Foo {\n        public function bar(): void {}\n    }\n}`;
    const entries = await extractWithTreeSitter(code, "php");
    if (!entries) return;
    expect(entries.length).toBe(1);
    expect(entries[0]!.kind).toBe("class");
    expect(entries[0]!.name).toBe("Foo");
    expect(entries[0]!.signature).toContain("bar");
  });

  // ── Coverage: guessIdentifier fallback ────────────────────────────

  test("guessIdentifier regex fallback when no named child matches", () => {
    // Mock node with no candidate-typed children
    const mockNode = {
      namedChildren: [{ type: "comment", startIndex: 0, endIndex: 5 }],
      startIndex: 0,
      endIndex: 10,
    };
    const result = __queries_test.guessIdentifier("helloWorld", mockNode);
    expect(result).toBe("helloWorld");
  });

  test("guessIdentifier regex fallback returns null for empty text", () => {
    const mockNode = {
      namedChildren: [],
      startIndex: 0,
      endIndex: 0,
    };
    const result = __queries_test.guessIdentifier("", mockNode);
    expect(result).toBeNull();
  });
});
