import { compareTwoStrings } from "string-similarity";

const SIMILARITY_THRESHOLD = 0.7;

/**
 * Normalize text for comparison
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Check if a new learning is similar to any existing learnings
 * Returns the similar learning if found, null otherwise
 */
export function findSimilar(
  newLearning: string,
  existingLearnings: string[]
): string | null {
  const normalizedNew = normalize(newLearning);

  for (const existing of existingLearnings) {
    const normalizedExisting = normalize(existing);
    const similarity = compareTwoStrings(normalizedNew, normalizedExisting);

    if (similarity >= SIMILARITY_THRESHOLD) {
      return existing;
    }
  }

  return null;
}

/**
 * Extract individual learnings from markdown content
 * Assumes learnings are bullet points starting with -
 */
export function extractLearnings(content: string): string[] {
  const lines = content.split("\n");
  const learnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      learnings.push(trimmed.slice(2).trim());
    }
  }

  return learnings;
}

/**
 * Add a learning to content if not duplicate
 * Returns { added: boolean, similar?: string, newContent: string }
 */
export function addLearning(
  content: string,
  newLearning: string
): { added: boolean; similar?: string; newContent: string } {
  const existingLearnings = extractLearnings(content);
  const similar = findSimilar(newLearning, existingLearnings);

  if (similar) {
    return { added: false, similar, newContent: content };
  }

  const newLine = `- ${newLearning}`;
  const newContent = content.trim() ? `${content.trim()}\n${newLine}` : newLine;

  return { added: true, newContent };
}
