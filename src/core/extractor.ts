import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { relative, extname } from "path";

export interface SignatureEntry {
  kind: "function" | "type" | "interface" | "class" | "const" | "enum";
  name: string;
  signature: string;
  exported: boolean;
  line: number;
}

export interface FileSignatures {
  path: string;
  language: string;
  signatures: SignatureEntry[];
}

export interface LanguageExtractor {
  extensions: string[];
  extract(content: string): SignatureEntry[];
}

const TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

/**
 * Count opening/closing braces to find the end of a block.
 * Returns the index (in lines array) of the closing brace, or -1.
 * Limits search to maxLines lines from startLine.
 */
function findClosingBrace(lines: string[], startLine: number, maxLines: number): number {
  let depth = 0;
  let found = false;
  const end = Math.min(startLine + maxLines, lines.length);

  for (let i = startLine; i < end; i++) {
    const line = lines[i]!;
    for (const ch of line) {
      if (ch === "{") {
        depth++;
        found = true;
      } else if (ch === "}") {
        depth--;
        if (found && depth === 0) {
          return i;
        }
      }
    }
  }
  return -1;
}

/**
 * Extract TypeScript/JavaScript signatures from source content.
 */
function extractTS(content: string): SignatureEntry[] {
  const entries: SignatureEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    // Re-exports: export { ... } from "..."
    const reExportMatch = trimmed.match(
      /^export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/
    );
    if (reExportMatch) {
      entries.push({
        kind: "const",
        name: `re-export from ${reExportMatch[2]!}`,
        signature: trimmed.replace(/;$/, ""),
        exported: true,
        line: lineNum,
      });
      continue;
    }

    // Export * from "..."
    const reExportAllMatch = trimmed.match(
      /^export\s+\*\s+(?:as\s+\w+\s+)?from\s+["']([^"']+)["']/
    );
    if (reExportAllMatch) {
      entries.push({
        kind: "const",
        name: `re-export from ${reExportAllMatch[1]!}`,
        signature: trimmed.replace(/;$/, ""),
        exported: true,
        line: lineNum,
      });
      continue;
    }

    const isExported = trimmed.startsWith("export ");

    // Exported function declaration
    const funcMatch = trimmed.match(
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+(?:\s*\|\s*[^\s{]+)*))?/
    );
    if (funcMatch) {
      // Build signature — get full params if multi-line
      let sig = trimmed;
      if (!trimmed.includes("{") && !trimmed.includes(";")) {
        // Multi-line signature, collect until { or ;
        let j = i + 1;
        while (j < lines.length && j < i + 10) {
          sig += " " + lines[j]!.trim();
          if (lines[j]!.includes("{") || lines[j]!.includes(";")) break;
          j++;
        }
      }
      // Clean: remove body
      sig = sig.replace(/\s*\{[\s\S]*$/, "").trim();
      entries.push({
        kind: "function",
        name: funcMatch[1]!,
        signature: sig,
        exported: isExported,
        line: lineNum,
      });
      continue;
    }

    // Exported arrow function: export const name = (...) => or export const name = async (...) =>
    const arrowMatch = trimmed.match(
      /^(?:export\s+)?const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\(/
    );
    if (arrowMatch && (trimmed.includes("=>") || !trimmed.includes("{"))) {
      let sig = trimmed;
      // Might be multi-line
      if (!trimmed.includes("=>")) {
        let j = i + 1;
        while (j < lines.length && j < i + 10) {
          sig += " " + lines[j]!.trim();
          if (lines[j]!.includes("=>") || lines[j]!.includes("{")) break;
          j++;
        }
      }
      // Clean: keep up to =>
      const arrowIdx = sig.indexOf("=>");
      if (arrowIdx !== -1) {
        sig = sig.slice(0, arrowIdx + 2).trim();
      }
      entries.push({
        kind: "function",
        name: arrowMatch[1]!,
        signature: sig,
        exported: isExported,
        line: lineNum,
      });
      continue;
    }

    // Type alias: export type Name = ...
    const typeMatch = trimmed.match(/^(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=/);
    if (typeMatch) {
      // Grab body up to 20 lines
      let sig = trimmed;
      if (!trimmed.includes(";") && trimmed.includes("{")) {
        const closeIdx = findClosingBrace(lines, i, 20);
        if (closeIdx !== -1) {
          sig = lines.slice(i, closeIdx + 1).map((l) => l.trimEnd()).join("\n");
        }
      } else if (!trimmed.includes(";")) {
        // Could be a union type spanning lines
        let j = i + 1;
        while (j < lines.length && j < i + 20) {
          const nextTrimmed = lines[j]!.trim();
          sig += "\n" + lines[j]!.trimEnd();
          if (nextTrimmed.endsWith(";") || nextTrimmed === "" || /^(?:export|import|const|let|var|function|class|interface|type|enum)/.test(nextTrimmed)) {
            break;
          }
          j++;
        }
      }
      sig = sig.replace(/;$/, "").trim();
      entries.push({
        kind: "type",
        name: typeMatch[1]!,
        signature: sig,
        exported: isExported,
        line: lineNum,
      });
      continue;
    }

    // Interface: export interface Name { ... }
    const ifaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{?/);
    if (ifaceMatch) {
      let sig = trimmed;
      if (trimmed.includes("{")) {
        const closeIdx = findClosingBrace(lines, i, 20);
        if (closeIdx !== -1) {
          sig = lines.slice(i, closeIdx + 1).map((l) => l.trimEnd()).join("\n");
        }
      } else {
        // Opening brace on next line
        let j = i + 1;
        while (j < lines.length && j < i + 2) {
          if (lines[j]!.trim().startsWith("{")) {
            const closeIdx = findClosingBrace(lines, j, 20);
            if (closeIdx !== -1) {
              sig = lines.slice(i, closeIdx + 1).map((l) => l.trimEnd()).join("\n");
            }
            break;
          }
          j++;
        }
      }
      entries.push({
        kind: "interface",
        name: ifaceMatch[1]!,
        signature: sig,
        exported: isExported,
        line: lineNum,
      });
      continue;
    }

    // Class: export class Name { ... } — extract declaration + method signatures
    const classMatch = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s+(?:extends|implements)\s+[^{]+)?\s*\{?/);
    if (classMatch) {
      const className = classMatch[1]!;
      // Find closing brace of class body
      let bodyStart = i;
      if (!trimmed.includes("{")) {
        for (let j = i + 1; j < i + 3 && j < lines.length; j++) {
          if (lines[j]!.includes("{")) {
            bodyStart = j;
            break;
          }
        }
      }
      const closeIdx = findClosingBrace(lines, bodyStart, 500);
      const endLine = closeIdx !== -1 ? closeIdx : Math.min(i + 50, lines.length - 1);

      // Extract the declaration line
      let classSig = trimmed.replace(/\s*\{.*$/, "").trim() + " {";

      // Extract method/property signatures from within the class
      for (let j = i + 1; j <= endLine; j++) {
        const memberLine = (lines[j] ?? "").trim();
        // Method signature
        const methodMatch = memberLine.match(
          /^(?:(?:public|private|protected|static|async|abstract|readonly|override|get|set)\s+)*(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)(?:\s*:\s*[^{;]+)?/
        );
        if (methodMatch && !memberLine.startsWith("//") && !memberLine.startsWith("*")) {
          classSig += "\n  " + memberLine.replace(/\s*\{.*$/, "").trim();
        }
        // Property with type annotation
        const propMatch = memberLine.match(
          /^(?:(?:public|private|protected|static|readonly|override|declare)\s+)*(\w+)(?:\?)?:\s*[^=;]+/
        );
        if (propMatch && !methodMatch && !memberLine.startsWith("//") && !memberLine.startsWith("*")) {
          classSig += "\n  " + memberLine.replace(/;$/, "").trim();
        }
      }
      classSig += "\n}";

      entries.push({
        kind: "class",
        name: className,
        signature: classSig,
        exported: isExported,
        line: lineNum,
      });
      // Skip past the class body
      if (closeIdx !== -1) {
        i = closeIdx;
      }
      continue;
    }

    // Enum: export enum Name { ... }
    const enumMatch = trimmed.match(/^(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{?/);
    if (enumMatch) {
      let sig = trimmed;
      if (trimmed.includes("{")) {
        const closeIdx = findClosingBrace(lines, i, 50);
        if (closeIdx !== -1) {
          sig = lines.slice(i, closeIdx + 1).map((l) => l.trimEnd()).join("\n");
        }
      }
      entries.push({
        kind: "enum",
        name: enumMatch[1]!,
        signature: sig,
        exported: isExported,
        line: lineNum,
      });
      continue;
    }

    // Exported const with type annotation: export const name: Type = ...
    const constMatch = trimmed.match(/^(?:export\s+)?const\s+(\w+)\s*:\s*([^=]+)=/);
    if (constMatch && isExported) {
      const sig = `export const ${constMatch[1]!}: ${constMatch[2]!.trim()}`;
      entries.push({
        kind: "const",
        name: constMatch[1]!,
        signature: sig,
        exported: true,
        line: lineNum,
      });
      continue;
    }

    // Exported const without type but with `as const` or object literal
    const constAsMatch = trimmed.match(/^export\s+const\s+(\w+)\s*=\s*/);
    if (constAsMatch && !arrowMatch) {
      entries.push({
        kind: "const",
        name: constAsMatch[1]!,
        signature: trimmed.replace(/\s*\{[\s\S]*$/, "").replace(/;$/, "").trim(),
        exported: true,
        line: lineNum,
      });
      continue;
    }
  }

  return entries;
}

/**
 * Extract signatures from source content for a given language.
 */
export function extractSignatures(content: string, language: string): SignatureEntry[] {
  if (language === "typescript" || language === "javascript") {
    return extractTS(content);
  }
  return [];
}

/**
 * Determine language from file extension.
 */
function languageFromExt(ext: string): string | null {
  if (TS_EXTENSIONS.includes(ext)) return "typescript";
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
    const signatures = extractSignatures(content, language);
    return {
      path: relative(rootDir, filePath),
      language,
      signatures,
    };
  } catch {
    return null;
  }
}
