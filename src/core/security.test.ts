import { describe, expect, test } from "bun:test";
import {
  isValidProfileName,
  validateProfileName,
  isPathWithin,
  validatePathWithin,
  sanitizeMarkdownHeading,
  sanitizeCodeBlock,
} from "./security.ts";

describe("isValidProfileName", () => {
  test("accepts valid names", () => {
    expect(isValidProfileName("default")).toBe(true);
    expect(isValidProfileName("my-profile")).toBe(true);
    expect(isValidProfileName("work_2024")).toBe(true);
    expect(isValidProfileName("A")).toBe(true);
    expect(isValidProfileName("a".repeat(64))).toBe(true);
  });

  test("rejects empty names", () => {
    expect(isValidProfileName("")).toBe(false);
  });

  test("rejects names with path traversal", () => {
    expect(isValidProfileName("../evil")).toBe(false);
    expect(isValidProfileName("..")).toBe(false);
    expect(isValidProfileName("foo/bar")).toBe(false);
  });

  test("rejects names with special characters", () => {
    expect(isValidProfileName("my profile")).toBe(false);
    expect(isValidProfileName("hello@world")).toBe(false);
    expect(isValidProfileName("test.name")).toBe(false);
  });

  test("rejects names longer than 64 chars", () => {
    expect(isValidProfileName("a".repeat(65))).toBe(false);
  });
});

describe("validateProfileName", () => {
  test("returns valid name", () => {
    expect(validateProfileName("default")).toBe("default");
  });

  test("throws on invalid name", () => {
    expect(() => validateProfileName("../evil")).toThrow("Invalid profile name");
    expect(() => validateProfileName("")).toThrow("Invalid profile name");
  });
});

describe("isPathWithin", () => {
  test("returns true for paths within base", () => {
    expect(isPathWithin("/home/user", "/home/user/file.txt")).toBe(true);
    expect(isPathWithin("/home/user", "/home/user/sub/deep/file")).toBe(true);
    expect(isPathWithin("/home/user", "/home/user")).toBe(true);
  });

  test("returns false for paths outside base", () => {
    expect(isPathWithin("/home/user", "/home/other")).toBe(false);
    expect(isPathWithin("/home/user", "/etc/passwd")).toBe(false);
  });

  test("handles path traversal attempts", () => {
    expect(isPathWithin("/home/user", "/home/user/../other")).toBe(false);
    expect(isPathWithin("/home/user", "/home/user/../../etc")).toBe(false);
  });

  test("handles prefix attacks", () => {
    // /home/username should not be within /home/user
    expect(isPathWithin("/home/user", "/home/username")).toBe(false);
  });
});

describe("validatePathWithin", () => {
  test("returns path when valid", () => {
    expect(validatePathWithin("/home/user", "/home/user/file")).toBe("/home/user/file");
  });

  test("throws when path is outside", () => {
    expect(() => validatePathWithin("/home/user", "/etc/passwd")).toThrow("outside allowed directory");
  });
});

describe("sanitizeMarkdownHeading", () => {
  test("strips newlines", () => {
    expect(sanitizeMarkdownHeading("hello\nworld")).toBe("hello world");
    expect(sanitizeMarkdownHeading("a\r\nb")).toBe("a b");
  });

  test("strips heading markers", () => {
    expect(sanitizeMarkdownHeading("### Heading")).toBe("Heading");
    expect(sanitizeMarkdownHeading("# Title")).toBe("Title");
  });

  test("strips code fence markers", () => {
    expect(sanitizeMarkdownHeading("text```injection")).toBe("textinjection");
  });

  test("strips YAML frontmatter markers", () => {
    expect(sanitizeMarkdownHeading("text---break")).toBe("text-break");
    expect(sanitizeMarkdownHeading("text------break")).toBe("text-break");
  });

  test("caps length at 200 chars", () => {
    const long = "a".repeat(300);
    expect(sanitizeMarkdownHeading(long).length).toBeLessThanOrEqual(200);
  });

  test("trims whitespace", () => {
    expect(sanitizeMarkdownHeading("  hello  ")).toBe("hello");
  });

  test("handles empty string", () => {
    expect(sanitizeMarkdownHeading("")).toBe("");
  });
});

describe("sanitizeCodeBlock", () => {
  test("replaces triple backticks", () => {
    expect(sanitizeCodeBlock("```break out```")).toBe("``break out``");
  });

  test("replaces longer backtick sequences", () => {
    expect(sanitizeCodeBlock("````test````")).toBe("``test``");
  });

  test("leaves double backticks alone", () => {
    expect(sanitizeCodeBlock("``inline``")).toBe("``inline``");
  });

  test("leaves normal text alone", () => {
    expect(sanitizeCodeBlock("const x = 1;")).toBe("const x = 1;");
  });
});
