/**
 * Generate creative names like Claude Code does
 */

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

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a unique name like "swift-falcon" or "bold-phoenix"
 */
export function generateName(): string {
  return `${randomFrom(adjectives)}-${randomFrom(nouns)}`;
}

/**
 * Generate a unique filename, checking for conflicts
 */
export function generateUniqueFilename(existingNames: string[], extension = ".md"): string {
  let name: string;
  let attempts = 0;

  do {
    name = generateName();
    attempts++;
  } while (existingNames.includes(name) && attempts < 100);

  // If we somehow hit 100 collisions, add a number
  if (existingNames.includes(name)) {
    name = `${name}-${Date.now() % 1000}`;
  }

  return `${name}${extension}`;
}
