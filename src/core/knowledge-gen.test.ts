import { describe, expect, test } from "bun:test";
import {
  analyzeArchitecture,
  analyzeConventions,
  analyzeDependencies,
  generateAutoKnowledge,
} from "./knowledge-gen.ts";
import type { FileSignatures } from "./extractor.ts";
import type { ProjectInfo } from "./project-detect.ts";

function makeProject(overrides?: Partial<ProjectInfo>): ProjectInfo {
  return {
    name: "test-project",
    root: "/tmp/test",
    runtime: "node",
    frameworks: [],
    tooling: [],
    ...overrides,
  };
}

function makeFS(path: string, opts?: {
  imports?: { source: string; isRelative: boolean }[];
  signatures?: { name: string; exported: boolean; kind?: string; signature?: string }[];
}): FileSignatures {
  return {
    path,
    language: "typescript",
    signatures: (opts?.signatures ?? []).map((s) => ({
      kind: (s.kind ?? "function") as any,
      name: s.name,
      signature: s.signature ?? `export function ${s.name}(): void { ... }`,
      exported: s.exported,
      line: 1,
    })),
    imports: opts?.imports,
  };
}

describe("analyzeArchitecture", () => {
  test("returns layered structure for routes/services/models project", () => {
    const allFiles = [
      "src/routes/api.ts",
      "src/services/auth.ts",
      "src/models/user.ts",
      "src/middleware/cors.ts",
      "src/index.ts",
    ];
    const result = analyzeArchitecture(makeProject(), [], allFiles);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("src/routes/");
    expect(result!.content).toContain("API routes");
    expect(result!.content).toContain("src/services/");
    expect(result!.content).toContain("business logic");
    expect(result!.content).toContain("src/models/");
    expect(result!.content).toContain("data models");
    expect(result!.content).toContain("Entry points");
  });

  test("does not include import flow (moved to Dependencies)", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/routes/api.ts", {
        imports: [{ source: "../services/auth", isRelative: true }],
      }),
      makeFS("src/services/auth.ts", {
        imports: [{ source: "../models/user", isRelative: true }],
      }),
    ];
    const allFiles = ["src/routes/api.ts", "src/services/auth.ts", "src/models/user.ts"];
    const result = analyzeArchitecture(makeProject(), sigs, allFiles);
    expect(result).not.toBeNull();
    expect(result!.content).not.toContain("Import flow");
  });

  test("shows monorepo info when present", () => {
    const project = makeProject({
      monorepo: {
        tool: "Turborepo",
        workspaces: [
          { name: "web", path: "apps/web" },
          { name: "api", path: "apps/api" },
        ],
      },
    });
    const result = analyzeArchitecture(project, [], ["apps/web/index.ts"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Monorepo");
    expect(result!.content).toContain("Turborepo");
    expect(result!.content).toContain("2 workspaces");
  });

  test("returns null for flat project with no structure", () => {
    const result = analyzeArchitecture(makeProject(), [], ["readme.md"]);
    expect(result).toBeNull();
  });

  test("detects top-level directory roles without src/ prefix", () => {
    const allFiles = [
      "routes/api.ts",
      "models/user.ts",
      "middleware/auth.ts",
    ];
    const result = analyzeArchitecture(makeProject(), [], allFiles);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("routes/");
    expect(result!.content).toContain("models/");
    expect(result!.content).toContain("middleware/");
  });
});

describe("analyzeConventions", () => {
  test("detects kebab-case naming", () => {
    const allFiles = [
      "src/user-service.ts",
      "src/auth-handler.ts",
      "src/data-model.ts",
      "src/api-routes.ts",
    ];
    const result = analyzeConventions([], allFiles);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("kebab-case");
  });

  test("detects test file patterns", () => {
    const allFiles = [
      "src/index.ts",
      "src/index.test.ts",
      "src/utils.test.ts",
      "src/helper.spec.ts",
    ];
    const result = analyzeConventions([], allFiles);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("*.test.*");
    expect(result!.content).toContain("*.spec.*");
  });

  test("detects named export style", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/utils.ts", {
        signatures: [
          { name: "foo", exported: true, signature: "export function foo(): void { ... }" },
          { name: "bar", exported: true, signature: "export function bar(): void { ... }" },
          { name: "baz", exported: true, signature: "export function baz(): void { ... }" },
        ],
      }),
    ];
    const result = analyzeConventions(sigs, ["src/utils.ts"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("named exports");
  });

  test("detects barrel files", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/index.ts", {
        signatures: [
          { name: "re-export ./utils", exported: true, signature: 'export * from "./utils"' },
          { name: "re-export ./types", exported: true, signature: 'export * from "./types"' },
        ],
      }),
    ];
    const result = analyzeConventions(sigs, ["src/index.ts"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Barrel files");
  });

  test("returns null with insufficient data", () => {
    const result = analyzeConventions([], ["readme.md"]);
    expect(result).toBeNull();
  });

  test("detects __tests__ directory pattern", () => {
    const allFiles = [
      "src/utils.ts",
      "src/__tests__/utils.test.ts",
      "src/__tests__/helper.test.ts",
      "src/other.ts",
    ];
    const result = analyzeConventions([], allFiles);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("test dirs");
  });

  test("detects default export style", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/App.tsx", {
        signatures: [
          { name: "App", exported: true, signature: "export default function App(): void { ... }" },
          { name: "Other", exported: true, signature: "export default function Other(): void { ... }" },
          { name: "Third", exported: true, signature: "export default function Third(): void { ... }" },
        ],
      }),
    ];
    const result = analyzeConventions(sigs, ["src/App.tsx"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("default exports");
  });

  test("detects mixed export style", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/utils.ts", {
        signatures: [
          { name: "foo", exported: true, signature: "export function foo(): void { ... }" },
          { name: "bar", exported: true, signature: "export function bar(): void { ... }" },
          { name: "Baz", exported: true, signature: "export default function Baz(): void { ... }" },
          { name: "Qux", exported: true, signature: "export default function Qux(): void { ... }" },
        ],
      }),
    ];
    const result = analyzeConventions(sigs, ["src/utils.ts"]);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("mixed");
  });

  test("returns null for export style when no exports", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/internal.ts", {
        signatures: [
          { name: "helper", exported: false, signature: "function helper(): void { ... }" },
        ],
      }),
    ];
    const result = analyzeConventions(sigs, ["src/internal.ts"]);
    // With only non-exported sigs and insufficient files for naming, may return null
    expect(result === null || !result.content.includes("Exports")).toBe(true);
  });
});

describe("analyzeDependencies", () => {
  test("builds correct internal import graph", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/routes/api.ts", {
        imports: [
          { source: "../services/auth", isRelative: true },
          { source: "../models/user", isRelative: true },
        ],
      }),
      makeFS("src/services/auth.ts", {
        imports: [{ source: "../models/user", isRelative: true }],
      }),
    ];
    const result = analyzeDependencies(sigs);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Internal deps");
    expect(result!.content).toContain("src/routes/");
  });

  test("identifies hub files and sorts by import count", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/utils.ts", { signatures: [{ name: "util", exported: true }] }),
      makeFS("src/config.ts", { signatures: [{ name: "config", exported: true }] }),
      makeFS("src/routes/a.ts", {
        imports: [
          { source: "../utils", isRelative: true },
          { source: "../config", isRelative: true },
        ],
      }),
      makeFS("src/routes/b.ts", {
        imports: [
          { source: "../utils", isRelative: true },
          { source: "../config", isRelative: true },
        ],
      }),
      makeFS("src/services/c.ts", {
        imports: [{ source: "../utils", isRelative: true }],
      }),
    ];
    const result = analyzeDependencies(sigs);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Hub files");
    expect(result!.content).toContain("utils.ts");
    expect(result!.content).toContain("config.ts");
    // utils should appear before config (3 imports vs 2)
    const utilsPos = result!.content.indexOf("utils.ts");
    const configPos = result!.content.indexOf("config.ts");
    expect(utilsPos).toBeLessThan(configPos);
  });

  test("collects external dependencies", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/app.ts", {
        imports: [
          { source: "express", isRelative: false },
          { source: "zod", isRelative: false },
          { source: "@prisma/client", isRelative: false },
        ],
      }),
    ];
    const result = analyzeDependencies(sigs);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("External deps");
    expect(result!.content).toContain("express");
    expect(result!.content).toContain("zod");
    expect(result!.content).toContain("@prisma/client");
  });

  test("filters out false positive external deps", () => {
    const sigs: FileSignatures[] = [
      makeFS("src/app.ts", {
        imports: [
          { source: "express", isRelative: false },
          { source: "module", isRelative: false },
          { source: "source", isRelative: false },
          { source: "pkg", isRelative: false },
          { source: "type", isRelative: false },
          { source: "types", isRelative: false },
          { source: "node:fs", isRelative: false },
          { source: "node:path", isRelative: false },
          { source: "x", isRelative: false },  // single char
        ],
      }),
    ];
    const result = analyzeDependencies(sigs);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("express");
    expect(result!.content).not.toContain("module");
    expect(result!.content).not.toContain("source");
    expect(result!.content).not.toContain("\"pkg\"");
    expect(result!.content).not.toContain("node:fs");
    expect(result!.content).not.toContain("node:path");
  });

  test("returns null when no imports", () => {
    const sigs: FileSignatures[] = [makeFS("src/app.ts")];
    const result = analyzeDependencies(sigs);
    expect(result).toBeNull();
  });

  test("handles lib/ and packages/ top-level dirs", () => {
    const sigs: FileSignatures[] = [
      makeFS("lib/core/auth.ts", {
        imports: [{ source: "../utils/helper", isRelative: true }],
      }),
      makeFS("lib/utils/helper.ts", {
        signatures: [{ name: "helper", exported: true }],
      }),
      makeFS("packages/shared/index.ts", {
        imports: [{ source: "../core/base", isRelative: true }],
      }),
    ];
    const result = analyzeDependencies(sigs);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Internal deps");
  });

  test("handles shallow paths for top-level dir resolution", () => {
    const sigs: FileSignatures[] = [
      makeFS("utils/helper.ts", {
        imports: [{ source: "../config/db", isRelative: true }],
      }),
    ];
    const result = analyzeDependencies(sigs);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("utils/");
  });
});

describe("generateAutoKnowledge", () => {
  test("returns entries within budget", () => {
    const allFiles = [
      "src/routes/api.ts",
      "src/services/auth.ts",
      "src/models/user.ts",
      "src/index.ts",
    ];
    const sigs: FileSignatures[] = [
      makeFS("src/routes/api.ts", {
        imports: [{ source: "../services/auth", isRelative: true }],
        signatures: [{ name: "getUsers", exported: true }],
      }),
    ];

    const result = generateAutoKnowledge(makeProject(), sigs, allFiles, 5000);
    expect(result.length).toBeGreaterThan(0);

    const totalTokens = result.reduce((sum, e) => sum + e.tokens, 0);
    expect(totalTokens).toBeLessThanOrEqual(5000);
  });

  test("returns empty array when budget is 0", () => {
    const result = generateAutoKnowledge(makeProject(), [], ["src/index.ts"], 0);
    expect(result).toEqual([]);
  });

  test("respects budget limits", () => {
    const allFiles = [
      "src/routes/api.ts",
      "src/services/auth.ts",
      "src/models/user.ts",
    ];
    // Very tiny budget — may exclude some entries
    const result = generateAutoKnowledge(makeProject(), [], allFiles, 50);
    const totalTokens = result.reduce(
      (sum, e) => sum + e.tokens + Math.ceil(`### ${e.title}\n\n`.length / 4),
      0
    );
    expect(totalTokens).toBeLessThanOrEqual(50);
  });

  test("titles include (auto) suffix", () => {
    const allFiles = [
      "src/routes/api.ts",
      "src/services/auth.ts",
    ];
    const result = generateAutoKnowledge(makeProject(), [], allFiles, 5000);
    for (const entry of result) {
      expect(entry.title).toContain("(auto)");
    }
  });
});
