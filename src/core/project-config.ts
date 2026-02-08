import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { contextConfigSchema } from "./schemas.ts";
import type { ValidatedContextConfig } from "./schemas.ts";

export type ContextConfig = ValidatedContextConfig;

const DEFAULTS: ContextConfig = {
  budget: 12000,
  key_files: [],
  exclude_signatures: ["**/*.test.ts", "**/*.spec.ts"],
  knowledge_dir: ".think/knowledge",
  signature_depth: "exports",
};

/**
 * Parse a simple YAML string into a flat key-value map.
 * Handles only the subset we need: scalars, simple arrays (inline and block).
 * Does not handle nested objects beyond the `context:` section prefix.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;
  let inContextSection = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Skip comments and empty lines
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    // Detect top-level section
    if (/^\S/.test(trimmed) && trimmed.endsWith(":") && !trimmed.includes(": ")) {
      const sectionName = trimmed.slice(0, -1).trim();
      inContextSection = sectionName === "context";

      // Flush pending array
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }
      currentKey = null;
      currentArray = null;
      continue;
    }

    if (!inContextSection) continue;

    // Check for key: value pair (indented under context)
    const kvMatch = trimmed.match(/^\s+(\w[\w_]*):\s*(.*)$/);
    if (kvMatch) {
      // Flush pending array
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
        currentArray = null;
      }

      const key = kvMatch[1]!;
      const rawValue = kvMatch[2]!.trim();

      if (rawValue === "" || rawValue === "[]") {
        // Might be a block array starting on next lines, or empty
        currentKey = key;
        currentArray = [];
      } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
        // Inline array: [a, b, c]
        const inner = rawValue.slice(1, -1);
        result[key] = inner
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        currentKey = null;
        currentArray = null;
      } else {
        // Scalar value
        let value: string | number = rawValue.replace(/^["']|["']$/g, "");
        const num = Number(value);
        if (!isNaN(num) && value !== "") {
          result[key] = num;
        } else {
          result[key] = value;
        }
        currentKey = null;
        currentArray = null;
      }
      continue;
    }

    // Check for array item under a key
    const arrayItemMatch = trimmed.match(/^\s+-\s+(.+)$/);
    if (arrayItemMatch && currentKey && currentArray) {
      currentArray.push(arrayItemMatch[1]!.trim().replace(/^["']|["']$/g, ""));
      continue;
    }
  }

  // Flush final pending array
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Load project context config from `.think.yaml` in the project root.
 * Returns defaults if file doesn't exist or is malformed.
 */
export async function loadContextConfig(projectDir: string): Promise<ContextConfig> {
  const configPath = join(projectDir, ".think.yaml");

  if (!existsSync(configPath)) {
    return { ...DEFAULTS };
  }

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = parseSimpleYaml(raw);

    // Validate with Zod — applies defaults for missing fields, coerces types
    const result = contextConfigSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    // Log specific validation errors so user knows what's wrong
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`Warning: .think.yaml has invalid fields:\n${issues}\n  Using defaults for invalid fields.`);

    // Fall back to defaults merged with whatever was valid
    return { ...DEFAULTS, ...parsed } as ContextConfig;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Warning: failed to parse .think.yaml: ${msg} — using defaults`);
    return { ...DEFAULTS };
  }
}
