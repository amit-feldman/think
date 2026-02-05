import { existsSync, mkdirSync, readdirSync, rmSync, cpSync } from "fs";
import { join } from "path";
import {
  CONFIG,
  getActiveProfile,
  setActiveProfile,
  profilePath,
} from "./config";
import { validateProfileName, isValidProfileName } from "./security";

export interface ProfileInfo {
  name: string;
  path: string;
  isActive: boolean;
}

/**
 * List all available profiles
 */
export function listProfiles(): ProfileInfo[] {
  if (!existsSync(CONFIG.profilesDir)) {
    return [];
  }

  const active = getActiveProfile();
  const entries = readdirSync(CONFIG.profilesDir, { withFileTypes: true });

  return entries
    .filter((e) => e.isDirectory() && isValidProfileName(e.name))
    .map((e) => ({
      name: e.name,
      path: join(CONFIG.profilesDir, e.name),
      isActive: e.name === active,
    }))
    .sort((a, b) => {
      // Active first, then alphabetically
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Check if a profile exists
 */
export function profileExists(name: string): boolean {
  // Validate name to prevent path traversal
  if (!isValidProfileName(name)) {
    return false;
  }
  return existsSync(join(CONFIG.profilesDir, name));
}

/**
 * Create a new profile
 */
export function createProfile(name: string, copyFrom?: string): void {
  // Validate profile names to prevent path traversal
  validateProfileName(name);
  if (copyFrom) {
    validateProfileName(copyFrom);
  }

  if (profileExists(name)) {
    throw new Error(`Profile "${name}" already exists`);
  }

  const newProfilePath = join(CONFIG.profilesDir, name);

  if (copyFrom) {
    if (!profileExists(copyFrom)) {
      throw new Error(`Source profile "${copyFrom}" does not exist`);
    }
    cpSync(join(CONFIG.profilesDir, copyFrom), newProfilePath, { recursive: true });
  } else {
    // Create empty profile structure
    mkdirSync(newProfilePath, { recursive: true });
    for (const dir of Object.values(CONFIG.dirs)) {
      mkdirSync(join(newProfilePath, dir), { recursive: true });
    }
  }
}

/**
 * Delete a profile
 */
export function deleteProfile(name: string): void {
  // Validate name to prevent path traversal
  validateProfileName(name);

  if (!profileExists(name)) {
    throw new Error(`Profile "${name}" does not exist`);
  }

  const profiles = listProfiles();
  if (profiles.length <= 1) {
    throw new Error(`Cannot delete the last profile`);
  }

  const active = getActiveProfile();
  if (name === active) {
    // Switch to another profile before deleting
    const other = profiles.find(p => p.name !== name);
    if (other) {
      setActiveProfile(other.name);
    }
  }

  rmSync(join(CONFIG.profilesDir, name), { recursive: true });
}

/**
 * Switch to a different profile
 */
export function switchProfile(name: string): void {
  // Validate name to prevent path traversal
  validateProfileName(name);

  if (!profileExists(name)) {
    throw new Error(`Profile "${name}" does not exist`);
  }

  setActiveProfile(name);
}

/**
 * Ensure profiles structure exists (for fresh installs)
 */
export function ensureProfilesStructure(): void {
  if (!existsSync(CONFIG.profilesDir)) {
    mkdirSync(CONFIG.profilesDir, { recursive: true });
  }

  // Ensure default profile exists
  const defaultPath = join(CONFIG.profilesDir, CONFIG.defaultProfile);
  if (!existsSync(defaultPath)) {
    mkdirSync(defaultPath, { recursive: true });
    for (const dir of Object.values(CONFIG.dirs)) {
      mkdirSync(join(defaultPath, dir), { recursive: true });
    }
  }

  // Ensure active file exists
  if (!existsSync(CONFIG.activeProfileFile)) {
    setActiveProfile(CONFIG.defaultProfile);
  }
}
