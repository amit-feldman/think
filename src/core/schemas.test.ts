import { describe, expect, test } from "bun:test";
import {
  contextConfigSchema,
  skillAgentFrontmatterSchema,
  profileFrontmatterSchema,
  validate,
} from "./schemas.ts";

describe("contextConfigSchema", () => {
  test("applies defaults for empty object", () => {
    const result = contextConfigSchema.parse({});
    expect(result.budget).toBe(12000);
    expect(result.key_files).toEqual([]);
    expect(result.exclude_signatures).toEqual(["**/*.test.ts", "**/*.spec.ts"]);
    expect(result.knowledge_dir).toBe(".think/knowledge");
    expect(result.signature_depth).toBe("exports");
  });

  test("accepts valid config", () => {
    const result = contextConfigSchema.parse({
      budget: 5000,
      key_files: ["src/main.ts"],
      exclude_signatures: [],
      knowledge_dir: "docs",
      signature_depth: "all",
    });
    expect(result.budget).toBe(5000);
    expect(result.signature_depth).toBe("all");
  });

  test("rejects invalid budget", () => {
    expect(() => contextConfigSchema.parse({ budget: 500 })).toThrow();
    expect(() => contextConfigSchema.parse({ budget: 200000 })).toThrow();
    expect(() => contextConfigSchema.parse({ budget: 1.5 })).toThrow();
  });

  test("rejects invalid signature_depth", () => {
    expect(() => contextConfigSchema.parse({ signature_depth: "invalid" })).toThrow();
  });
});

describe("skillAgentFrontmatterSchema", () => {
  test("accepts valid frontmatter", () => {
    const result = skillAgentFrontmatterSchema.parse({
      name: "Code Review",
      description: "Review code for issues",
      trigger: "When user asks to review code",
      tools: ["Bash", "Read"],
    });
    expect(result.name).toBe("Code Review");
    expect(result.tools).toEqual(["Bash", "Read"]);
  });

  test("name is required", () => {
    expect(() => skillAgentFrontmatterSchema.parse({})).toThrow();
    expect(() => skillAgentFrontmatterSchema.parse({ name: "" })).toThrow();
  });

  test("optional fields can be omitted", () => {
    const result = skillAgentFrontmatterSchema.parse({ name: "Test" });
    expect(result.description).toBeUndefined();
    expect(result.trigger).toBeUndefined();
    expect(result.tools).toBeUndefined();
  });

  test("rejects name over 100 chars", () => {
    expect(() => skillAgentFrontmatterSchema.parse({ name: "a".repeat(101) })).toThrow();
  });

  test("rejects description over 500 chars", () => {
    expect(() =>
      skillAgentFrontmatterSchema.parse({ name: "Test", description: "a".repeat(501) })
    ).toThrow();
  });

  test("rejects trigger over 300 chars", () => {
    expect(() =>
      skillAgentFrontmatterSchema.parse({ name: "Test", trigger: "a".repeat(301) })
    ).toThrow();
  });
});

describe("profileFrontmatterSchema", () => {
  test("accepts valid profile", () => {
    const result = profileFrontmatterSchema.parse({
      name: "Amit",
      role: "senior-dev",
      style: "direct",
      personality: "assistant",
    });
    expect(result.name).toBe("Amit");
  });

  test("name is required", () => {
    expect(() => profileFrontmatterSchema.parse({})).toThrow();
  });

  test("optional fields can be omitted", () => {
    const result = profileFrontmatterSchema.parse({ name: "Test" });
    expect(result.role).toBeUndefined();
    expect(result.style).toBeUndefined();
    expect(result.personality).toBeUndefined();
  });
});

describe("validate", () => {
  test("returns data on success", () => {
    const result = validate(profileFrontmatterSchema, { name: "Test" });
    expect(result.data).not.toBeNull();
    expect(result.error).toBeNull();
    expect(result.data!.name).toBe("Test");
  });

  test("returns error on failure", () => {
    const result = validate(profileFrontmatterSchema, {}, "profile");
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error).toContain("Invalid profile");
  });

  test("uses default label", () => {
    const result = validate(profileFrontmatterSchema, {});
    expect(result.error).toContain("Invalid config");
  });
});
