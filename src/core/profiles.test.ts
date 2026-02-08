import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, renameSync, unlinkSync } from "fs";
import { join } from "path";
import {
  CONFIG,
  getActiveProfile,
  setActiveProfile,
} from "./config.ts";
import {
  listProfiles,
  profileExists,
  createProfile,
  deleteProfile,
  switchProfile,
  ensureProfilesStructure,
} from "./profiles.ts";

const TEST_PREFIX = "_thinktest_";

function testName(suffix: string): string {
  return `${TEST_PREFIX}${suffix}`;
}

function setupTestProfile(name: string): void {
  const dir = join(CONFIG.profilesDir, name);
  mkdirSync(dir, { recursive: true });
  for (const sub of Object.values(CONFIG.dirs)) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
}

function cleanupTestProfiles(): void {
  if (!existsSync(CONFIG.profilesDir)) return;
  const entries = require("fs").readdirSync(CONFIG.profilesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith(TEST_PREFIX)) {
      rmSync(join(CONFIG.profilesDir, entry.name), { recursive: true });
    }
  }
}

describe("profiles", () => {
  let originalActive: string;

  beforeEach(() => {
    originalActive = getActiveProfile();
    cleanupTestProfiles();
  });

  afterEach(() => {
    try {
      setActiveProfile(originalActive);
    } catch {}
    cleanupTestProfiles();
  });

  describe("listProfiles", () => {
    test("lists available profiles including test profiles", () => {
      setupTestProfile(testName("alpha"));
      setupTestProfile(testName("beta"));
      setActiveProfile(testName("alpha"));

      const profiles = listProfiles();
      const testProfiles = profiles.filter((p) => p.name.startsWith(TEST_PREFIX));
      expect(testProfiles.length).toBe(2);
      const alpha = testProfiles.find((p) => p.name === testName("alpha"))!;
      const beta = testProfiles.find((p) => p.name === testName("beta"))!;
      expect(alpha.isActive).toBe(true);
      expect(beta.isActive).toBe(false);
    });

    test("filters out invalid profile names", () => {
      setupTestProfile(testName("valid"));
      // Create a directory with invalid name (dotfile)
      mkdirSync(join(CONFIG.profilesDir, ".hidden_test"), { recursive: true });
      setActiveProfile(testName("valid"));

      const profiles = listProfiles();
      expect(profiles.some((p) => p.name === ".hidden_test")).toBe(false);
      expect(profiles.some((p) => p.name === testName("valid"))).toBe(true);

      // Cleanup dotfile
      rmSync(join(CONFIG.profilesDir, ".hidden_test"), { recursive: true });
    });

    test("sorts active first then alphabetically", () => {
      setupTestProfile(testName("aaa"));
      setupTestProfile(testName("zzz"));
      setActiveProfile(testName("zzz"));

      const profiles = listProfiles();
      const active = profiles[0]!;
      expect(active.name).toBe(testName("zzz"));
      expect(active.isActive).toBe(true);
    });
  });

  describe("profileExists", () => {
    test("returns true for existing profile", () => {
      setupTestProfile(testName("exists"));
      expect(profileExists(testName("exists"))).toBe(true);
    });

    test("returns false for non-existent profile", () => {
      expect(profileExists(testName("nonexistent"))).toBe(false);
    });

    test("returns false for invalid name (path traversal)", () => {
      expect(profileExists("../evil")).toBe(false);
    });
  });

  describe("createProfile", () => {
    test("creates new empty profile with subdirectories", () => {
      const name = testName("newone");
      createProfile(name);
      expect(existsSync(join(CONFIG.profilesDir, name))).toBe(true);
      expect(existsSync(join(CONFIG.profilesDir, name, "skills"))).toBe(true);
      expect(existsSync(join(CONFIG.profilesDir, name, "agents"))).toBe(true);
      expect(existsSync(join(CONFIG.profilesDir, name, "memory"))).toBe(true);
    });

    test("copies from existing profile", () => {
      const source = testName("source");
      setupTestProfile(source);
      writeFileSync(join(CONFIG.profilesDir, source, "profile.md"), "test content");

      const copy = testName("copy");
      createProfile(copy, source);
      expect(existsSync(join(CONFIG.profilesDir, copy))).toBe(true);
      const content = readFileSync(join(CONFIG.profilesDir, copy, "profile.md"), "utf-8");
      expect(content).toBe("test content");
    });

    test("throws if profile already exists", () => {
      const name = testName("existing");
      setupTestProfile(name);
      expect(() => createProfile(name)).toThrow("already exists");
    });

    test("throws if source profile does not exist for copy", () => {
      expect(() => createProfile(testName("new"), testName("nosource"))).toThrow(
        "does not exist"
      );
    });

    test("throws for invalid profile name", () => {
      expect(() => createProfile("../bad")).toThrow();
    });

    test("throws for invalid copyFrom name", () => {
      expect(() => createProfile(testName("good"), "../bad")).toThrow();
    });
  });

  describe("deleteProfile", () => {
    test("deletes existing profile", () => {
      const name = testName("todelete");
      setupTestProfile(name);

      deleteProfile(name);
      expect(existsSync(join(CONFIG.profilesDir, name))).toBe(false);
    });

    test("throws if profile does not exist", () => {
      expect(() => deleteProfile(testName("nonexistent"))).toThrow("does not exist");
    });

    test("throws if trying to delete the last profile", () => {
      // Temporarily isolate profilesDir to have exactly one profile
      const bakPath = CONFIG.profilesDir + ".__bak_" + Date.now();
      renameSync(CONFIG.profilesDir, bakPath);
      try {
        mkdirSync(CONFIG.profilesDir, { recursive: true });
        setupTestProfile(testName("only"));
        writeFileSync(CONFIG.activeProfileFile, testName("only"));
        expect(() => deleteProfile(testName("only"))).toThrow("last profile");
      } finally {
        rmSync(CONFIG.profilesDir, { recursive: true });
        renameSync(bakPath, CONFIG.profilesDir);
      }
    });

    test("switches to another profile before deleting active", () => {
      const active = testName("active");
      const other = testName("other");
      setupTestProfile(active);
      setupTestProfile(other);
      setActiveProfile(active);

      deleteProfile(active);
      expect(existsSync(join(CONFIG.profilesDir, active))).toBe(false);
      // Should have switched to a different profile
      const newActive = getActiveProfile();
      expect(newActive).not.toBe(active);
    });

    test("throws for invalid profile name", () => {
      expect(() => deleteProfile("../bad")).toThrow();
    });
  });

  describe("switchProfile", () => {
    test("switches to existing profile", () => {
      const name = testName("target");
      setupTestProfile(name);
      switchProfile(name);
      expect(getActiveProfile()).toBe(name);
    });

    test("throws if profile does not exist", () => {
      expect(() => switchProfile(testName("nope"))).toThrow("does not exist");
    });

    test("throws for invalid profile name", () => {
      expect(() => switchProfile("../traversal")).toThrow();
    });
  });

  describe("ensureProfilesStructure", () => {
    test("ensures default profile exists", () => {
      ensureProfilesStructure();
      expect(existsSync(CONFIG.profilesDir)).toBe(true);
      expect(
        existsSync(join(CONFIG.profilesDir, CONFIG.defaultProfile))
      ).toBe(true);
    });

    test("ensures active file exists", () => {
      ensureProfilesStructure();
      expect(existsSync(CONFIG.activeProfileFile)).toBe(true);
    });

    test("does not overwrite existing profiles", () => {
      const defaultPath = join(CONFIG.profilesDir, CONFIG.defaultProfile);
      mkdirSync(defaultPath, { recursive: true });
      writeFileSync(join(defaultPath, "profile.md"), "custom");

      ensureProfilesStructure();
      const content = readFileSync(join(defaultPath, "profile.md"), "utf-8");
      expect(content).toBe("custom");
    });

    test("creates profilesDir and default profile from scratch", () => {
      const bakPath = CONFIG.profilesDir + ".__bak_" + Date.now();
      renameSync(CONFIG.profilesDir, bakPath);
      let origActive: string | null = null;
      if (existsSync(CONFIG.activeProfileFile)) {
        origActive = readFileSync(CONFIG.activeProfileFile, "utf-8");
        unlinkSync(CONFIG.activeProfileFile);
      }
      try {
        ensureProfilesStructure();
        expect(existsSync(CONFIG.profilesDir)).toBe(true);
        expect(existsSync(join(CONFIG.profilesDir, CONFIG.defaultProfile))).toBe(true);
        expect(existsSync(CONFIG.activeProfileFile)).toBe(true);
      } finally {
        rmSync(CONFIG.profilesDir, { recursive: true });
        renameSync(bakPath, CONFIG.profilesDir);
        if (origActive !== null) {
          writeFileSync(CONFIG.activeProfileFile, origActive);
        }
      }
    });
  });

  describe("listProfiles edge cases", () => {
    test("returns empty when profilesDir does not exist", () => {
      const bakPath = CONFIG.profilesDir + ".__bak_" + Date.now();
      renameSync(CONFIG.profilesDir, bakPath);
      try {
        const profiles = listProfiles();
        expect(profiles).toEqual([]);
      } finally {
        renameSync(bakPath, CONFIG.profilesDir);
      }
    });
  });
});
