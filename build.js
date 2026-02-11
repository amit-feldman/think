import esbuild from "esbuild";
import { promises as fs } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

await esbuild.build({
  entryPoints: ["src/cli/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/cli.js",
  banner: { js: "#!/usr/bin/env node" },
  loader: { ".md": "text" },
  packages: "external",
});

// Copy available Tree-sitter grammar WASM files into dist/wasm
const __dirname = dirname(fileURLToPath(import.meta.url));
const nm = resolve(__dirname, "node_modules");
const outDir = resolve(__dirname, "dist", "wasm");

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function listDir(p) {
  try {
    return await fs.readdir(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function copyGrammars() {
  await ensureDir(outDir);
  const entries = await listDir(nm);
  const grammarDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("tree-sitter-"))
    .map((e) => resolve(nm, e.name));

  const copied = new Set();
  for (const dir of grammarDirs) {
    const files = await listDir(dir);
    for (const f of files) {
      if (!f.isFile()) continue;
      if (!f.name.endsWith(".wasm")) continue;
      // Skip elixir (no wasm, but just in case)
      if (f.name.includes("elixir")) continue;
      const src = resolve(dir, f.name);
      const dest = resolve(outDir, f.name);
      if (copied.has(f.name)) continue; // de-dupe (e.g., javascript appears twice)
      await fs.copyFile(src, dest);
      copied.add(f.name);
    }
    // Some packages nest wasm files one level deeper (e.g., typescript includes javascript)
    const nested = await listDir(resolve(dir, "node_modules").toString());
    for (const n of nested) {
      const nPath = resolve(dir, "node_modules", n.name);
      const nFiles = await listDir(nPath);
      for (const nf of nFiles) {
        if (!nf.isFile() || !nf.name.endsWith(".wasm")) continue;
        const src = resolve(nPath, nf.name);
        const dest = resolve(outDir, nf.name);
        if (copied.has(nf.name)) continue;
        await fs.copyFile(src, dest);
        copied.add(nf.name);
      }
    }
  }

  // Optional: write an index of available grammars
  await fs.writeFile(
    resolve(outDir, "available.json"),
    JSON.stringify([...copied].sort(), null, 2),
    "utf-8"
  );
}

await copyGrammars();
