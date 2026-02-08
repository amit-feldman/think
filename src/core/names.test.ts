import { describe, expect, test } from "bun:test";
import { generateName, generateUniqueFilename } from "./names.ts";

describe("generateName", () => {
  test("returns a name with adjective-noun pattern", () => {
    const name = generateName();
    expect(name).toMatch(/^[a-z]+-[a-z]+$/);
  });

  test("generates different names (probabilistic)", () => {
    const names = new Set<string>();
    for (let i = 0; i < 20; i++) {
      names.add(generateName());
    }
    // With 42 adjectives and 42 nouns = 1764 combos, 20 attempts should yield multiple unique
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("generateUniqueFilename", () => {
  test("returns filename with .md extension", () => {
    const result = generateUniqueFilename([]);
    expect(result).toMatch(/^[a-z]+-[a-z]+\.md$/);
  });

  test("avoids existing names", () => {
    // Generate a name, then ensure the next one is different
    const first = generateUniqueFilename([]).replace(".md", "");
    const second = generateUniqueFilename([first]);
    expect(second).not.toBe(`${first}.md`);
  });

  test("uses custom extension", () => {
    const result = generateUniqueFilename([], ".txt");
    expect(result).toMatch(/\.txt$/);
  });

  test("handles collision gracefully with timestamp suffix", () => {
    // Generate ALL possible adjective-noun combinations to guarantee 100 collisions
    const adjectives = [
      "swift", "bold", "calm", "bright", "quick", "sharp", "keen", "wise",
      "agile", "clever", "steady", "nimble", "silent", "vivid", "subtle",
      "curious", "daring", "eager", "gentle", "mighty", "patient", "precise",
      "radiant", "serene", "vigilant", "witty", "zesty", "cosmic", "lunar",
      "stellar", "amber", "azure", "coral", "crimson", "golden", "jade",
      "ruby", "silver", "violet", "rustic", "urban", "ancient", "modern",
    ];
    const nouns = [
      "falcon", "phoenix", "tiger", "wolf", "hawk", "raven", "fox", "owl",
      "dragon", "lion", "eagle", "bear", "panther", "viper", "cobra", "shark",
      "storm", "thunder", "spark", "flame", "frost", "wave", "wind", "shadow",
      "nova", "comet", "nebula", "quasar", "pulsar", "orbit", "vertex", "prism",
      "cipher", "beacon", "sentinel", "guardian", "pilot", "scout", "ranger",
      "forge", "anvil", "blade", "arrow", "shield", "helm", "crown", "torch",
    ];
    const allNames: string[] = [];
    for (const adj of adjectives) {
      for (const noun of nouns) {
        allNames.push(`${adj}-${noun}`);
      }
    }

    const result = generateUniqueFilename(allNames);
    expect(result).toBeTruthy();
    expect(result.endsWith(".md")).toBe(true);
    // Should have a timestamp suffix since all names collided
    expect(result).toMatch(/-\d+\.md$/);
  });
});
