import { describe, expect, test } from "bun:test";
import { extractLearnings, findSimilar, addLearning } from "./dedup.ts";

describe("extractLearnings", () => {
  test("extracts bullet points", () => {
    const content = "# Learnings\n\n- First learning\n- Second learning\n- Third";
    const result = extractLearnings(content);
    expect(result).toEqual(["First learning", "Second learning", "Third"]);
  });

  test("ignores non-bullet lines", () => {
    const content = "# Title\n\nSome text\n- A learning\n## Heading\n- Another";
    const result = extractLearnings(content);
    expect(result).toEqual(["A learning", "Another"]);
  });

  test("returns empty for no bullets", () => {
    expect(extractLearnings("no bullets here")).toEqual([]);
    expect(extractLearnings("")).toEqual([]);
  });

  test("trims whitespace from learnings", () => {
    const content = "-   spaced learning   ";
    expect(extractLearnings(content)).toEqual(["spaced learning"]);
  });
});

describe("findSimilar", () => {
  test("finds similar learning", () => {
    const existing = ["Use Bun for testing", "Always write tests first"];
    const result = findSimilar("use bun for testing", existing);
    expect(result).toBe("Use Bun for testing");
  });

  test("returns null when nothing similar", () => {
    const existing = ["Use Bun for testing"];
    expect(findSimilar("Docker is great for deployment", existing)).toBeNull();
  });

  test("returns null for empty list", () => {
    expect(findSimilar("anything", [])).toBeNull();
  });

  test("ignores case and punctuation", () => {
    const existing = ["Don't use npm!"];
    const result = findSimilar("dont use npm", existing);
    expect(result).toBe("Don't use npm!");
  });
});

describe("addLearning", () => {
  test("adds new learning", () => {
    const content = "- Existing learning";
    const result = addLearning(content, "New thing");
    expect(result.added).toBe(true);
    expect(result.similar).toBeUndefined();
    expect(result.newContent).toContain("- New thing");
    expect(result.newContent).toContain("- Existing learning");
  });

  test("rejects duplicate learning", () => {
    const content = "- Use Bun for testing";
    const result = addLearning(content, "use bun for testing");
    expect(result.added).toBe(false);
    expect(result.similar).toBe("Use Bun for testing");
    expect(result.newContent).toBe(content);
  });

  test("adds to empty content", () => {
    const result = addLearning("", "First learning");
    expect(result.added).toBe(true);
    expect(result.newContent).toBe("- First learning");
  });

  test("adds to whitespace-only content", () => {
    const result = addLearning("   \n   ", "First learning");
    expect(result.added).toBe(true);
    expect(result.newContent).toBe("- First learning");
  });
});
