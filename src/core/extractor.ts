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

export interface ImportEntry {
  source: string;
  isRelative: boolean;
}

export interface FileSignatures {
  path: string;
  language: string;
  signatures: SignatureEntry[];
  imports?: ImportEntry[];
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
 * Scan source code for import statements using regex.
 * Supports JS/TS (import/require), Python (import/from), Go (import), Rust (use).
 */
export function scanImports(content: string, language: string): ImportEntry[] {
  const imports: ImportEntry[] = [];
  const seen = new Set<string>();

  function add(source: string) {
    if (!source || seen.has(source)) return;
    seen.add(source);
    imports.push({ source, isRelative: source.startsWith(".") });
  }

  if (["typescript", "javascript", "tsx"].includes(language)) {
    // import ... from "source"
    for (const m of content.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g)) {
      add(m[1]!);
    }
    // require("source")
    for (const m of content.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      add(m[1]!);
    }
  } else if (language === "python") {
    // from X import ... or import X
    for (const m of content.matchAll(/^\s*(?:from\s+([\w.]+)|import\s+([\w.]+))/gm)) {
      add(m[1] ?? m[2]!);
    }
  } else if (language === "go") {
    // import "pkg" or import ( "pkg" )
    for (const m of content.matchAll(/["']([^"']+)["']/g)) {
      if (content.includes("import")) add(m[1]!);
    }
  } else if (language === "rust") {
    // use crate::X or use X
    for (const m of content.matchAll(/^\s*use\s+([\w:]+)/gm)) {
      add(m[1]!);
    }
  }

  return imports;
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
    const imports = scanImports(content, language);

    if (!signatures || signatures.length === 0) {
      // Still return imports-only result if we found imports
      if (imports.length > 0) {
        return { path: relative(rootDir, filePath), language, signatures: [], imports };
      }
      return null;
    }

    return {
      path: relative(rootDir, filePath),
      language,
      signatures,
      imports: imports.length > 0 ? imports : undefined,
    };
  } catch {
    return null;
  }
}
