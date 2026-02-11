import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { relative, extname } from "path";
import { extractWithTreeSitter } from "./queries.ts";

export interface SignatureEntry {
  kind: "function" | "type" | "interface" | "class" | "const" | "enum";
  name: string;
  signature: string;
  exported: boolean;
  line: number;
  decorators?: string[];
  docstring?: string;
  async?: boolean;
}

export interface FileSignatures {
  path: string;
  language: string;
  signatures: SignatureEntry[];
}

/**
 * Determine language from file extension.
 */
function languageFromExt(ext: string): string | null {
  if (ext === ".tsx") return "tsx";
  if (ext === ".ts") return "typescript";
  if (ext === ".js" || ext === ".jsx" || ext === ".mjs") return "javascript";
  if (ext === ".py") return "python";
  if (ext === ".go") return "go";
  if (ext === ".rs") return "rust";
  if (ext === ".java") return "java";
  if (ext === ".cs") return "csharp";
  if (ext === ".rb") return "ruby";
  if (ext === ".php") return "php";
  return null;
}

/**
 * Extract signatures from a file on disk.
 */
export async function extractFileSignatures(
  filePath: string,
  rootDir: string
): Promise<FileSignatures | null> {
  if (!existsSync(filePath)) return null;

  const ext = extname(filePath);
  const language = languageFromExt(ext);
  if (!language) return null;

  try {
    const content = await readFile(filePath, "utf-8");
    const signatures = await extractWithTreeSitter(content, language);

    if (!signatures || signatures.length === 0) return null;

    return {
      path: relative(rootDir, filePath),
      language,
      signatures,
    };
  } catch {
    return null;
  }
}
