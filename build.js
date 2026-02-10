import esbuild from "esbuild";

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
