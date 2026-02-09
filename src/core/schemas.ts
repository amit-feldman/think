import { z } from "zod";

/**
 * Schema for .think.yaml context configuration
 */
export const contextConfigSchema = z.object({
  budget: z.number().int().min(1000).max(100000).default(12000),
  key_files: z.array(z.string()).default([]),
  exclude_signatures: z.array(z.string()).default(["**/*.test.ts", "**/*.spec.ts"]),
  knowledge_dir: z.string().default(".think/knowledge"),
  signature_depth: z.enum(["exports", "all"]).default("exports"),
});

export type ValidatedContextConfig = z.infer<typeof contextConfigSchema>;

/**
 * Schema for skill/agent frontmatter
 */
export const skillAgentFrontmatterSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trigger: z.string().max(300).optional(),
  tools: z.array(z.string()).optional(),
  model: z.enum(["sonnet", "haiku", "opus"]).optional(),
  inject: z.array(z.enum(["tools", "patterns", "anti-patterns"])).optional(),
});

/**
 * Schema for profile frontmatter
 */
export const profileFrontmatterSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().optional(),
  style: z.string().optional(),
  personality: z.string().optional(),
});

/**
 * Validate with a Zod schema, returning the parsed value or a readable error.
 * Returns { data, error } — exactly one will be non-null.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
  label = "config"
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { data: result.data, error: null };
  }
  const issues = result.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  return { data: null, error: `Invalid ${label}:\n${issues}` };
}
