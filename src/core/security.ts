import { resolve, relative } from "path";

/**
 * Validate that a profile name is safe (no path traversal)
 * Only allows alphanumeric, dash, underscore
 */
export function isValidProfileName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length <= 64;
}

/**
 * Sanitize a profile name, throwing if invalid
 */
export function validateProfileName(name: string): string {
  if (!isValidProfileName(name)) {
    throw new Error(
      `Invalid profile name "${name}". Use only letters, numbers, dashes, and underscores.`
    );
  }
  return name;
}

/**
 * Check if a resolved path is within the allowed base directory
 * Prevents path traversal attacks
 */
export function isPathWithin(basePath: string, targetPath: string): boolean {
  const resolvedBase = resolve(basePath);
  const resolvedTarget = resolve(targetPath);

  // Check that target starts with base (after normalization)
  // Using startsWith is simpler and more reliable than relative path checks
  return resolvedTarget.startsWith(resolvedBase + "/") || resolvedTarget === resolvedBase;
}

/**
 * Validate a path is within the allowed directory, throwing if not
 */
export function validatePathWithin(basePath: string, targetPath: string): string {
  if (!isPathWithin(basePath, targetPath)) {
    throw new Error(`Path "${targetPath}" is outside allowed directory`);
  }
  return targetPath;
}
