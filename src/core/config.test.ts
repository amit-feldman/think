import { describe, expect, test } from "bun:test";
import {
  estimateTokens,
  formatTokens,
  getProjectClaudeMdPath,
  getActiveProfile,
  setActiveProfile,
  profilePath,
  thinkPath,
  profileFilePath,
  CONFIG,
} from "./config.ts";
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, rmSync, unlinkSync } from "fs";
import { join } from "path";

describe("estimateTokens", () => {
  test("estimates based on length / 4", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2); // ceil(5/4)
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });

  test("rounds up", () => {
    expect(estimateTokens("a")).toBe(1); // ceil(1/4) = 1
    expect(estimateTokens("ab")).toBe(1); // ceil(2/4) = 1
    expect(estimateTokens("abc")).toBe(1); // ceil(3/4) = 1
    expect(estimateTokens("abcd")).toBe(1); // ceil(4/4) = 1
    expect(estimateTokens("abcde")).toBe(2); // ceil(5/4) = 2
  });
});

describe("formatTokens", () => {
  test("formats small numbers as-is", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(500)).toBe("500");
    expect(formatTokens(999)).toBe("999");
  });

  test("formats thousands with one decimal", () => {
    expect(formatTokens(1000)).toBe("1.0k");
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(2100)).toBe("2.1k");
    expect(formatTokens(9999)).toBe("10.0k");
  });

  test("formats large numbers rounded", () => {
    expect(formatTokens(10000)).toBe("10k");
    expect(formatTokens(12500)).toBe("13k");
    expect(formatTokens(100000)).toBe("100k");
  });
});

describe("getProjectClaudeMdPath", () => {
  test("converts absolute path to safe directory name", () => {
    const result = getProjectClaudeMdPath("/Users/test/my-project");
    expect(result).toContain("-Users-test-my-project");
    expect(result).toContain("CLAUDE.md");
    expect(result).not.toContain("//");
  });

  test("matches Claude Code path convention (leading dash)", () => {
    const result = getProjectClaudeMdPath("/home/user/project");
    expect(result).toContain("-home-user-project");
  });
});

describe("getActiveProfile", () => {
  test("returns a valid profile name", () => {
    const profile = getActiveProfile();
    expect(typeof profile).toBe("string");
    expect(profile.length).toBeGreaterThan(0);
  });

  test("returns fallback when active file has invalid content", () => {
    const activeFile = CONFIG.activeProfileFile;
    let original: string | null = null;

    try {
      if (existsSync(activeFile)) {
        original = readFileSync(activeFile, "utf-8");
      }
      // Write an invalid profile name
      writeFileSync(activeFile, "../traversal-attempt");
      const profile = getActiveProfile();
      // Should fall back to scanning profilesDir or returning "default"
      expect(typeof profile).toBe("string");
      expect(profile).not.toBe("../traversal-attempt");
    } finally {
      if (original !== null) {
        writeFileSync(activeFile, original);
      }
    }
  });
});

describe("setActiveProfile", () => {
  test("throws for invalid profile name", () => {
    expect(() => setActiveProfile("../bad")).toThrow("Invalid profile name");
  });

  test("sets active profile to current value (no-op write)", () => {
    const current = getActiveProfile();
    // Writing the same value should not throw
    setActiveProfile(current);
    expect(getActiveProfile()).toBe(current);
  });
});

describe("profilePath", () => {
  test("returns path for active profile by default", () => {
    const result = profilePath();
    expect(result).toContain(CONFIG.profilesDir);
    expect(result).toContain(getActiveProfile());
  });

  test("returns path for specified profile", () => {
    const result = profilePath("custom");
    expect(result).toContain("custom");
  });
});

describe("thinkPath", () => {
  test("returns path within active profile", () => {
    const result = thinkPath("skills", "my-skill.md");
    expect(result).toContain("skills");
    expect(result).toContain("my-skill.md");
  });

  test("falls back to legacy structure when profilesDir missing", () => {
    const bakPath = CONFIG.profilesDir + ".__bak_" + Date.now();
    renameSync(CONFIG.profilesDir, bakPath);
    try {
      const result = thinkPath("test.md");
      expect(result).toBe(join(CONFIG.thinkDir, "test.md"));
    } finally {
      renameSync(bakPath, CONFIG.profilesDir);
    }
  });
});

describe("profileFilePath", () => {
  test("returns path for named profile with segments", () => {
    const result = profileFilePath("myprofile", "skills", "test.md");
    expect(result).toContain("myprofile");
    expect(result).toContain("skills");
    expect(result).toContain("test.md");
    expect(result).toContain(CONFIG.profilesDir);
  });
});

describe("getActiveProfile edge cases", () => {
  test("returns defaultProfile when profilesDir has no valid profiles", () => {
    const bakPath = CONFIG.profilesDir + ".__bak_" + Date.now();
    renameSync(CONFIG.profilesDir, bakPath);
    let origActive: string | null = null;
    if (existsSync(CONFIG.activeProfileFile)) {
      origActive = readFileSync(CONFIG.activeProfileFile, "utf-8");
      unlinkSync(CONFIG.activeProfileFile);
    }
    try {
      mkdirSync(CONFIG.profilesDir, { recursive: true });
      const profile = getActiveProfile();
      expect(profile).toBe(CONFIG.defaultProfile);
    } finally {
      rmSync(CONFIG.profilesDir, { recursive: true });
      renameSync(bakPath, CONFIG.profilesDir);
      if (origActive !== null) {
        writeFileSync(CONFIG.activeProfileFile, origActive);
      }
    }
  });
});
