import * as WebTreeSitter from "web-tree-sitter";
import { createRequire } from "module";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

// Support environments where web-tree-sitter exports default vs named Parser
const Parser: any = (WebTreeSitter as any).default ?? (WebTreeSitter as any).Parser;
const Language: any = (WebTreeSitter as any).Language; // Language is a module export, not on Parser
const require = createRequire(import.meta.url);

// Known grammars we ship (WASM basenames)
const GRAMMAR_FILES: Record<string, string> = {
  // JS family
  javascript: "tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript.wasm",
  tsx: "tree-sitter-tsx.wasm",
  // Other languages
  python: "tree-sitter-python.wasm",
  go: "tree-sitter-go.wasm",
  rust: "tree-sitter-rust.wasm",
  java: "tree-sitter-java.wasm",
  c_sharp: "tree-sitter-c_sharp.wasm",
  ruby: "tree-sitter-ruby.wasm",
  php: "tree-sitter-php.wasm",
};

export type GrammarKey = keyof typeof GRAMMAR_FILES;

const baseDir = dirname(fileURLToPath(import.meta.url));
// Candidate paths for WASM grammars (checked in order):
// 1. <baseDir>/wasm — installed npm package: dist/cli.js → dist/wasm/
// 2. <baseDir>/../wasm — built output: dist/cli.js → wasm/ (legacy layout)
// 3. <baseDir>/../../dist/wasm — dev from src: src/core/ → dist/wasm/
const inDist = resolve(baseDir, "wasm");
const distSibling = resolve(baseDir, "../wasm");
const projectDist = resolve(baseDir, "../../dist/wasm");
async function pickWasmDir(): Promise<string> {
  if (await exists(inDist)) return inDist;
  return (await exists(distSibling)) ? distSibling : projectDist;
}

let inited = false;
let parserInstance: any = null;
const langCache: Partial<Record<GrammarKey, any>> = {};

async function initCore(): Promise<void> {
  if (inited) return;
  const coreWasm = require.resolve("web-tree-sitter/web-tree-sitter.wasm");
  await Parser.init({ locateFile: () => coreWasm });
  inited = true;
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function wasmPathFor(key: GrammarKey): Promise<string> {
  const dir = await pickWasmDir();
  return join(dir, GRAMMAR_FILES[key]);
}

async function loadGrammar(wasmPath: string): Promise<any | null> {
  try {
    const bytes = await fs.readFile(wasmPath);
    return await Language.load(bytes);
  } catch {
    return null;
  }
}

export async function getLanguage(key: GrammarKey): Promise<any | null> {
  await initCore();
  if (langCache[key]) return langCache[key]!;
  if (!GRAMMAR_FILES[key]) return null;
  const wasmPath = await wasmPathFor(key);
  if (!(await exists(wasmPath))) return null;
  const lang = await loadGrammar(wasmPath);
  if (!lang) return null;
  langCache[key] = lang;
  return lang;
}

export async function parseSource(content: string, key: GrammarKey): Promise<any | null> {
  const lang = await getLanguage(key);
  if (!lang) return null;
  if (!parserInstance) parserInstance = new Parser();
  parserInstance.setLanguage(lang);
  return parserInstance.parse(content);
}

export const availableGrammarKeys: GrammarKey[] = Object.keys(GRAMMAR_FILES) as GrammarKey[];

// Test-only export
export const __ts_test = { getLanguage, exists, pickWasmDir, loadGrammar, inDist, distSibling, projectDist };

const LANG_EXTS: Record<GrammarKey, string[]> = {
  javascript: [".js", ".jsx", ".mjs"],
  typescript: [".ts"],
  tsx: [".tsx"],
  python: [".py"],
  go: [".go"],
  rust: [".rs"],
  java: [".java"],
  c_sharp: [".cs"],
  ruby: [".rb"],
  php: [".php"],
};

export async function getSupportedExtensions(): Promise<string[]> {
  // Return extensions for which a grammar WASM is present
  const exts: string[] = [];
  const dir = await pickWasmDir();
  for (const key of availableGrammarKeys) {
    const wasm = join(dir, GRAMMAR_FILES[key]);
    if (await exists(wasm)) {
      exts.push(...(LANG_EXTS[key] ?? []));
    }
  }
  // Always include TS/JS as a safety net
  for (const extra of [".ts", ".tsx", ".js", ".jsx", ".mjs"]) {
    if (!exts.includes(extra)) exts.push(extra);
  }
  return Array.from(new Set(exts));
}
