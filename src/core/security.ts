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

/**
 * Sanitize a string for use in a markdown heading.
 * Strips characters that could break markdown structure or inject instructions.
 * Used for EXTERNAL/untrusted content only (project names, README excerpts).
 */
export function sanitizeMarkdownHeading(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")       // No newlines in headings
    .replace(/^#+\s*/g, "")          // Strip heading markers
    .replace(/```/g, "")             // Strip code fence markers
    .replace(/---+/g, "-")           // Strip YAML front matter markers
    .slice(0, 200)                   // Cap length
    .trim();
}

/**
 * Sanitize a string for embedding in a markdown code block.
 * Prevents breaking out of ``` fences.
 */
export function sanitizeCodeBlock(text: string): string {
  // Replace sequences of 3+ backticks that could close a code fence
  return text.replace(/`{3,}/g, "``");
}
