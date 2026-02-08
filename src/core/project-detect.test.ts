import { describe, expect, test } from "bun:test";
import { detectProject } from "./project-detect.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("detectProject", () => {
  const tmpBase = join(tmpdir(), "think-test-detect-" + Date.now());

  async function makeProject(
    name: string,
    files: Record<string, string> = {}
  ): Promise<string> {
    const dir = join(tmpBase, name);
    await mkdir(dir, { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(dir, path);
      const parent = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await mkdir(parent, { recursive: true });
      await writeFile(fullPath, content);
    }
    return dir;
  }

  // Runtime detection

  test("detects Bun runtime from bun.lock", async () => {
    const dir = await makeProject("bun-project", {
      "bun.lock": "",
      "package.json": '{"name":"test"}',
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("bun");
    expect(info.name).toBe("test");
    await rm(dir, { recursive: true });
  });

  test("detects Bun runtime from bunfig.toml", async () => {
    const dir = await makeProject("bun-config", {
      "bunfig.toml": "[install]",
      "package.json": '{"name":"bun-cfg"}',
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("bun");
    await rm(dir, { recursive: true });
  });

  test("detects Deno runtime", async () => {
    const dir = await makeProject("deno-project", {
      "deno.json": "{}",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("deno");
    await rm(dir, { recursive: true });
  });

  test("detects Deno runtime from deno.jsonc", async () => {
    const dir = await makeProject("deno-jsonc", {
      "deno.jsonc": "{}",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("deno");
    await rm(dir, { recursive: true });
  });

  test("detects Rust runtime", async () => {
    const dir = await makeProject("rust-project", {
      "Cargo.toml": '[package]\nname = "my-crate"',
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("rust");
    expect(info.name).toBe("my-crate");
    await rm(dir, { recursive: true });
  });

  test("detects Go runtime", async () => {
    const dir = await makeProject("go-project", {
      "go.mod": "module example.com/myapp",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("go");
    await rm(dir, { recursive: true });
  });

  test("detects Python runtime from pyproject.toml", async () => {
    const dir = await makeProject("python-project", {
      "pyproject.toml": "[project]\nname = 'myapp'",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("python");
    await rm(dir, { recursive: true });
  });

  test("detects Python runtime from requirements.txt", async () => {
    const dir = await makeProject("python-req", {
      "requirements.txt": "flask==2.0",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("python");
    await rm(dir, { recursive: true });
  });

  test("detects Ruby runtime", async () => {
    const dir = await makeProject("ruby-project", {
      "Gemfile": 'source "https://rubygems.org"',
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("ruby");
    await rm(dir, { recursive: true });
  });

  test("detects Java runtime from pom.xml", async () => {
    const dir = await makeProject("java-maven", {
      "pom.xml": "<project></project>",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("java");
    await rm(dir, { recursive: true });
  });

  test("detects Java runtime from build.gradle", async () => {
    const dir = await makeProject("java-gradle", {
      "build.gradle": "apply plugin: 'java'",
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("java");
    await rm(dir, { recursive: true });
  });

  test("detects Node runtime from package.json", async () => {
    const dir = await makeProject("node-project", {
      "package.json": '{"name":"node-app"}',
    });
    const info = await detectProject(dir);
    expect(info.runtime).toBe("node");
    await rm(dir, { recursive: true });
  });

  test("returns unknown runtime for empty directory", async () => {
    const dir = await makeProject("empty-project", {});
    const info = await detectProject(dir);
    expect(info.runtime).toBe("unknown");
    await rm(dir, { recursive: true });
  });

  // Framework detection

  test("detects React framework", async () => {
    const dir = await makeProject("react-app", {
      "package.json": JSON.stringify({
        name: "react-app",
        dependencies: { react: "^18.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("React");
    await rm(dir, { recursive: true });
  });

  test("detects multiple frameworks", async () => {
    const dir = await makeProject("multi-framework", {
      "package.json": JSON.stringify({
        name: "multi",
        dependencies: { react: "^18.0.0", hono: "^3.0.0" },
        devDependencies: { tailwindcss: "^3.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("React");
    expect(info.frameworks).toContain("Hono");
    await rm(dir, { recursive: true });
  });

  test("detects Vue framework", async () => {
    const dir = await makeProject("vue-app", {
      "package.json": JSON.stringify({
        name: "vue-app",
        dependencies: { vue: "^3.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Vue");
    await rm(dir, { recursive: true });
  });

  test("detects Next.js framework", async () => {
    const dir = await makeProject("next-app", {
      "package.json": JSON.stringify({
        name: "next-app",
        dependencies: { next: "^14.0.0", react: "^18.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Next.js");
    expect(info.frameworks).toContain("React");
    await rm(dir, { recursive: true });
  });

  test("detects Express framework", async () => {
    const dir = await makeProject("express-app", {
      "package.json": JSON.stringify({
        name: "api",
        dependencies: { express: "^4.18.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Express");
    await rm(dir, { recursive: true });
  });

  test("detects Tauri from config file", async () => {
    const dir = await makeProject("tauri-app", {
      "package.json": '{"name":"tauri-app"}',
      "tauri.conf.json": "{}",
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Tauri");
    await rm(dir, { recursive: true });
  });

  test("detects Tauri from src-tauri directory", async () => {
    const dir = await makeProject("tauri-app2", {
      "package.json": '{"name":"tauri-app2"}',
      "src-tauri/.gitkeep": "",
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Tauri");
    await rm(dir, { recursive: true });
  });

  test("detects Rust frameworks from Cargo.toml", async () => {
    const dir = await makeProject("rust-web", {
      "Cargo.toml": '[package]\nname = "webserver"\n\n[dependencies]\naxum = "0.7"',
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Axum");
    await rm(dir, { recursive: true });
  });

  test("detects Claude SDK", async () => {
    const dir = await makeProject("ai-app", {
      "package.json": JSON.stringify({
        name: "ai-app",
        dependencies: { "@anthropic-ai/sdk": "^0.20.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Claude SDK");
    await rm(dir, { recursive: true });
  });

  test("detects Angular framework", async () => {
    const dir = await makeProject("angular-app", {
      "package.json": JSON.stringify({
        name: "angular-app",
        dependencies: { "@angular/core": "^17.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Angular");
    await rm(dir, { recursive: true });
  });

  test("detects Svelte framework", async () => {
    const dir = await makeProject("svelte-app", {
      "package.json": JSON.stringify({
        name: "svelte-app",
        dependencies: { svelte: "^4.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Svelte");
    await rm(dir, { recursive: true });
  });

  test("detects Solid framework", async () => {
    const dir = await makeProject("solid-app", {
      "package.json": JSON.stringify({
        name: "solid-app",
        dependencies: { "solid-js": "^1.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Solid");
    await rm(dir, { recursive: true });
  });

  test("detects Nuxt framework", async () => {
    const dir = await makeProject("nuxt-app", {
      "package.json": JSON.stringify({
        name: "nuxt-app",
        dependencies: { nuxt: "^3.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Nuxt");
    await rm(dir, { recursive: true });
  });

  test("detects Astro framework", async () => {
    const dir = await makeProject("astro-app", {
      "package.json": JSON.stringify({
        name: "astro-app",
        dependencies: { astro: "^4.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Astro");
    await rm(dir, { recursive: true });
  });

  test("detects Remix framework", async () => {
    const dir = await makeProject("remix-app", {
      "package.json": JSON.stringify({
        name: "remix-app",
        dependencies: { "@remix-run/node": "^2.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Remix");
    await rm(dir, { recursive: true });
  });

  test("detects Fastify framework", async () => {
    const dir = await makeProject("fastify-app", {
      "package.json": JSON.stringify({
        name: "fastify-app",
        dependencies: { fastify: "^4.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Fastify");
    await rm(dir, { recursive: true });
  });

  test("detects Elysia framework", async () => {
    const dir = await makeProject("elysia-app", {
      "package.json": JSON.stringify({
        name: "elysia-app",
        dependencies: { elysia: "^1.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Elysia");
    await rm(dir, { recursive: true });
  });

  test("detects NestJS framework", async () => {
    const dir = await makeProject("nest-app", {
      "package.json": JSON.stringify({
        name: "nest-app",
        dependencies: { "@nestjs/core": "^10.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("NestJS");
    await rm(dir, { recursive: true });
  });

  test("detects Electron framework", async () => {
    const dir = await makeProject("electron-app", {
      "package.json": JSON.stringify({
        name: "electron-app",
        devDependencies: { electron: "^28.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Electron");
    await rm(dir, { recursive: true });
  });

  test("detects React Native framework", async () => {
    const dir = await makeProject("rn-app", {
      "package.json": JSON.stringify({
        name: "rn-app",
        dependencies: { "react-native": "^0.73.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("React Native");
    await rm(dir, { recursive: true });
  });

  test("detects Expo framework", async () => {
    const dir = await makeProject("expo-app", {
      "package.json": JSON.stringify({
        name: "expo-app",
        dependencies: { expo: "^50.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Expo");
    await rm(dir, { recursive: true });
  });

  test("detects OpenAI SDK", async () => {
    const dir = await makeProject("openai-app", {
      "package.json": JSON.stringify({
        name: "openai-app",
        dependencies: { openai: "^4.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("OpenAI");
    await rm(dir, { recursive: true });
  });

  test("detects LangChain", async () => {
    const dir = await makeProject("langchain-app", {
      "package.json": JSON.stringify({
        name: "langchain-app",
        dependencies: { "@langchain/core": "^0.2.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("LangChain");
    await rm(dir, { recursive: true });
  });

  // Tooling detection

  test("detects tooling from devDependencies", async () => {
    const dir = await makeProject("tooled-project", {
      "package.json": JSON.stringify({
        name: "tooled",
        devDependencies: {
          typescript: "^5.0.0",
          "@biomejs/biome": "^1.0.0",
          vitest: "^1.0.0",
          "@prisma/client": "^5.0.0",
          tailwindcss: "^3.0.0",
          vite: "^5.0.0",
        },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("TypeScript");
    expect(info.tooling).toContain("Biome");
    expect(info.tooling).toContain("Vitest");
    expect(info.tooling).toContain("Prisma");
    expect(info.tooling).toContain("Tailwind");
    expect(info.tooling).toContain("Vite");
    await rm(dir, { recursive: true });
  });

  test("detects Docker from docker-compose.yml", async () => {
    const dir = await makeProject("docker-project", {
      "package.json": '{"name":"docker-app"}',
      "docker-compose.yml": "services:",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Docker");
    await rm(dir, { recursive: true });
  });

  test("detects Docker from Dockerfile", async () => {
    const dir = await makeProject("docker-project2", {
      "package.json": '{"name":"docker-app2"}',
      "Dockerfile": "FROM node:18",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Docker");
    await rm(dir, { recursive: true });
  });

  test("detects ESLint from config file", async () => {
    const dir = await makeProject("eslint-project", {
      "package.json": '{"name":"eslint-app"}',
      ".eslintrc.json": "{}",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("ESLint");
    await rm(dir, { recursive: true });
  });

  test("detects Prettier from config file", async () => {
    const dir = await makeProject("prettier-project", {
      "package.json": '{"name":"prettier-app"}',
      ".prettierrc": "{}",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Prettier");
    await rm(dir, { recursive: true });
  });

  test("detects Jest testing framework", async () => {
    const dir = await makeProject("jest-project", {
      "package.json": JSON.stringify({
        name: "jest-app",
        devDependencies: { jest: "^29.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Jest");
    await rm(dir, { recursive: true });
  });

  test("detects Playwright testing framework", async () => {
    const dir = await makeProject("pw-project", {
      "package.json": JSON.stringify({
        name: "pw-app",
        devDependencies: { "@playwright/test": "^1.40.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Playwright");
    await rm(dir, { recursive: true });
  });

  test("detects Cypress testing framework", async () => {
    const dir = await makeProject("cy-project", {
      "package.json": JSON.stringify({
        name: "cy-app",
        devDependencies: { cypress: "^13.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Cypress");
    await rm(dir, { recursive: true });
  });

  test("detects Webpack build tool", async () => {
    const dir = await makeProject("webpack-project", {
      "package.json": JSON.stringify({
        name: "wp-app",
        devDependencies: { webpack: "^5.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Webpack");
    await rm(dir, { recursive: true });
  });

  test("detects esbuild", async () => {
    const dir = await makeProject("esbuild-project", {
      "package.json": JSON.stringify({
        name: "es-app",
        devDependencies: { esbuild: "^0.19.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("esbuild");
    await rm(dir, { recursive: true });
  });

  test("detects Rollup", async () => {
    const dir = await makeProject("rollup-project", {
      "package.json": JSON.stringify({
        name: "roll-app",
        devDependencies: { rollup: "^4.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Rollup");
    await rm(dir, { recursive: true });
  });

  test("detects Drizzle ORM", async () => {
    const dir = await makeProject("drizzle-project", {
      "package.json": JSON.stringify({
        name: "drizzle-app",
        dependencies: { "drizzle-orm": "^0.29.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Drizzle");
    await rm(dir, { recursive: true });
  });

  test("detects TypeORM", async () => {
    const dir = await makeProject("typeorm-project", {
      "package.json": JSON.stringify({
        name: "typeorm-app",
        dependencies: { typeorm: "^0.3.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("TypeORM");
    await rm(dir, { recursive: true });
  });

  test("detects Mongoose", async () => {
    const dir = await makeProject("mongoose-project", {
      "package.json": JSON.stringify({
        name: "mongoose-app",
        dependencies: { mongoose: "^8.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Mongoose");
    await rm(dir, { recursive: true });
  });

  test("detects Nx from config file", async () => {
    const dir = await makeProject("nx-project", {
      "package.json": JSON.stringify({
        name: "nx-app",
        workspaces: ["packages/*"],
      }),
      "nx.json": "{}",
      "packages/core/package.json": '{"name":"@nx/core"}',
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Nx");
    await rm(dir, { recursive: true });
  });

  test("detects Biome from config file", async () => {
    const dir = await makeProject("biome-project", {
      "package.json": '{"name":"biome-app"}',
      "biome.json": "{}",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Biome");
    await rm(dir, { recursive: true });
  });

  test("detects Tailwind from config file", async () => {
    const dir = await makeProject("tw-project", {
      "package.json": '{"name":"tw-app"}',
      "tailwind.config.js": "module.exports = {}",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("Tailwind");
    await rm(dir, { recursive: true });
  });

  test("detects TypeScript from tsconfig.json", async () => {
    const dir = await makeProject("ts-project", {
      "package.json": '{"name":"ts-app"}',
      "tsconfig.json": "{}",
    });
    const info = await detectProject(dir);
    expect(info.tooling).toContain("TypeScript");
    await rm(dir, { recursive: true });
  });

  // Monorepo detection

  test("detects Turborepo monorepo", async () => {
    const dir = await makeProject("turbo-mono", {
      "package.json": JSON.stringify({
        name: "mono",
        workspaces: ["apps/*", "packages/*"],
      }),
      "turbo.json": "{}",
      "apps/web/package.json": JSON.stringify({
        name: "@mono/web",
        description: "Web app",
        dependencies: { react: "^18.0.0" },
      }),
      "packages/shared/package.json": JSON.stringify({
        name: "@mono/shared",
      }),
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.tool).toBe("Turborepo");
    expect(info.monorepo!.workspaces.length).toBe(2);
    // Workspace types should be inferred
    const webWs = info.monorepo!.workspaces.find((w) => w.name === "@mono/web");
    expect(webWs).toBeTruthy();
    expect(webWs!.type).toBe("app");
    const sharedWs = info.monorepo!.workspaces.find((w) => w.name === "@mono/shared");
    expect(sharedWs).toBeTruthy();
    expect(sharedWs!.type).toBe("package");
    await rm(dir, { recursive: true });
  });

  test("detects Bun workspaces monorepo", async () => {
    const dir = await makeProject("bun-mono", {
      "package.json": JSON.stringify({
        name: "bun-mono",
        workspaces: ["packages/*"],
      }),
      "bun.lock": "",
      "packages/lib/package.json": '{"name":"@bun/lib"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.tool).toBe("Bun workspaces");
    await rm(dir, { recursive: true });
  });

  test("detects Yarn workspaces", async () => {
    const dir = await makeProject("yarn-mono", {
      "package.json": JSON.stringify({
        name: "yarn-mono",
        workspaces: ["packages/*"],
      }),
      "yarn.lock": "",
      "packages/utils/package.json": '{"name":"@y/utils"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.tool).toBe("Yarn workspaces");
    await rm(dir, { recursive: true });
  });

  test("detects npm workspaces as fallback", async () => {
    const dir = await makeProject("npm-mono", {
      "package.json": JSON.stringify({
        name: "npm-mono",
        workspaces: ["libs/*"],
      }),
      "libs/core/package.json": '{"name":"@npm/core"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.tool).toBe("npm workspaces");
    await rm(dir, { recursive: true });
  });

  test("detects pnpm workspaces from config", async () => {
    const dir = await makeProject("pnpm-mono", {
      "package.json": '{"name":"pnpm-mono"}',
      "pnpm-workspace.yaml": "packages:\n  - 'packages/*'\n",
      "packages/ui/package.json": '{"name":"@pnpm/ui"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.tool).toBe("pnpm workspaces");
    await rm(dir, { recursive: true });
  });

  test("detects Lerna monorepo", async () => {
    const dir = await makeProject("lerna-mono", {
      "package.json": JSON.stringify({
        name: "lerna-mono",
        workspaces: ["packages/*"],
      }),
      "lerna.json": "{}",
      "packages/a/package.json": '{"name":"@l/a"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.tool).toBe("Lerna");
    await rm(dir, { recursive: true });
  });

  test("handles workspaces as object with packages", async () => {
    const dir = await makeProject("obj-ws", {
      "package.json": JSON.stringify({
        name: "obj-ws",
        workspaces: { packages: ["packages/*"] },
      }),
      "packages/a/package.json": '{"name":"@obj/a"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.workspaces.length).toBeGreaterThan(0);
    await rm(dir, { recursive: true });
  });

  test("handles direct workspace paths (not globs)", async () => {
    const dir = await makeProject("direct-ws", {
      "package.json": JSON.stringify({
        name: "direct-ws",
        workspaces: ["web", "api"],
      }),
      "web/package.json": JSON.stringify({ name: "@d/web", description: "Web frontend" }),
      "api/package.json": JSON.stringify({ name: "@d/api" }),
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    expect(info.monorepo!.workspaces.length).toBe(2);
    const webWs = info.monorepo!.workspaces.find((w) => w.name === "@d/web");
    expect(webWs!.description).toBe("Web frontend");
    await rm(dir, { recursive: true });
  });

  // Workspace type inference

  test("infers service workspace type", async () => {
    const dir = await makeProject("svc-mono", {
      "package.json": JSON.stringify({
        name: "svc-mono",
        workspaces: ["services/*"],
      }),
      "services/auth/package.json": '{"name":"@s/auth"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    const ws = info.monorepo!.workspaces[0]!;
    expect(ws.type).toBe("service");
    await rm(dir, { recursive: true });
  });

  test("infers tool workspace type", async () => {
    const dir = await makeProject("tool-mono", {
      "package.json": JSON.stringify({
        name: "tool-mono",
        workspaces: ["tools/*"],
      }),
      "tools/cli/package.json": '{"name":"@t/cli"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    const ws = info.monorepo!.workspaces[0]!;
    expect(ws.type).toBe("tool");
    await rm(dir, { recursive: true });
  });

  test("infers cli type from bin field", async () => {
    const dir = await makeProject("cli-mono", {
      "package.json": JSON.stringify({
        name: "cli-mono",
        workspaces: ["stuff/*"],
      }),
      "stuff/mycli/package.json": JSON.stringify({
        name: "@c/mycli",
        bin: { mycli: "dist/index.js" },
      }),
    });
    const info = await detectProject(dir);
    const ws = info.monorepo!.workspaces[0]!;
    expect(ws.type).toBe("cli");
    await rm(dir, { recursive: true });
  });

  test("infers server type from package name", async () => {
    const dir = await makeProject("srv-mono", {
      "package.json": JSON.stringify({
        name: "srv-mono",
        workspaces: ["stuff/*"],
      }),
      "stuff/server/package.json": JSON.stringify({
        name: "@s/my-server",
      }),
    });
    const info = await detectProject(dir);
    const ws = info.monorepo!.workspaces[0]!;
    expect(ws.type).toBe("server");
    await rm(dir, { recursive: true });
  });

  test("infers app type from react dependency", async () => {
    const dir = await makeProject("react-mono", {
      "package.json": JSON.stringify({
        name: "react-mono",
        workspaces: ["stuff/*"],
      }),
      "stuff/frontend/package.json": JSON.stringify({
        name: "@r/frontend",
        dependencies: { react: "^18.0.0" },
      }),
    });
    const info = await detectProject(dir);
    const ws = info.monorepo!.workspaces[0]!;
    expect(ws.type).toBe("app");
    await rm(dir, { recursive: true });
  });

  // Description detection

  test("uses description from package.json", async () => {
    const dir = await makeProject("desc-project", {
      "package.json": JSON.stringify({
        name: "desc",
        description: "A cool project",
      }),
    });
    const info = await detectProject(dir);
    expect(info.description).toBe("A cool project");
    await rm(dir, { recursive: true });
  });

  test("extracts description from README tagline", async () => {
    const dir = await makeProject("readme-desc", {
      "package.json": '{"name":"readme-proj"}',
      "README.md": "# My Project\n\n**The ultimate developer toolkit for productivity**\n\nMore text here.",
    });
    const info = await detectProject(dir);
    expect(info.description).toContain("ultimate developer toolkit");
    await rm(dir, { recursive: true });
  });

  test("extracts description from README overview section", async () => {
    const dir = await makeProject("readme-overview", {
      "package.json": '{"name":"overview-proj"}',
      "README.md":
        "# Project\n\n## Overview\n\nThis project helps developers build faster.\n\n## Installation\n\nRun npm install.",
    });
    const info = await detectProject(dir);
    expect(info.description).toContain("helps developers build faster");
    await rm(dir, { recursive: true });
  });

  test("extracts description from first paragraph of README", async () => {
    const dir = await makeProject("readme-para", {
      "package.json": '{"name":"para-proj"}',
      "README.md": "# Title\n\nA simple tool for managing configurations.\n\n## Features\n\n- Feature 1",
    });
    const info = await detectProject(dir);
    expect(info.description).toContain("simple tool for managing");
    await rm(dir, { recursive: true });
  });

  test("falls back to directory name when no package.json", async () => {
    const dir = await makeProject("fallback-name", {});
    const info = await detectProject(dir);
    expect(info.name).toBe("fallback-name");
    await rm(dir, { recursive: true });
  });

  test("gets name from Cargo.toml when no package.json", async () => {
    const dir = await makeProject("rust-name", {
      "Cargo.toml": '[package]\nname = "my-rust-app"',
    });
    const info = await detectProject(dir);
    expect(info.name).toBe("my-rust-app");
    await rm(dir, { recursive: true });
  });

  test("handles malformed package.json", async () => {
    const dir = await makeProject("bad-pkg", {
      "package.json": "{not valid json",
    });
    const info = await detectProject(dir);
    // Should not throw, falls back to directory name
    expect(info.name).toBe("bad-pkg");
    expect(info.runtime).toBe("node"); // package.json exists so runtime is node
    await rm(dir, { recursive: true });
  });

  // Monorepo framework aggregation

  test("aggregates frameworks from monorepo workspaces", async () => {
    const dir = await makeProject("agg-mono", {
      "package.json": JSON.stringify({
        name: "agg-mono",
        workspaces: ["apps/*"],
      }),
      "turbo.json": "{}",
      "apps/web/package.json": JSON.stringify({
        name: "@a/web",
        dependencies: { react: "^18.0.0" },
      }),
      "apps/mobile/package.json": JSON.stringify({
        name: "@a/mobile",
        dependencies: { expo: "^50.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("React");
    expect(info.frameworks).toContain("Expo");
    await rm(dir, { recursive: true });
  });

  // Rust framework detection
  test("detects Actix framework in Rust", async () => {
    const dir = await makeProject("rust-actix", {
      "Cargo.toml": '[package]\nname = "web"\n\n[dependencies]\nactix-web = "4"',
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Actix");
    await rm(dir, { recursive: true });
  });

  test("detects Rocket framework in Rust", async () => {
    const dir = await makeProject("rust-rocket", {
      "Cargo.toml": '[package]\nname = "web"\n\n[dependencies]\nrocket = "0.5"',
    });
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Rocket");
    await rm(dir, { recursive: true });
  });

  // No monorepo when no workspaces

  test("returns no monorepo for non-monorepo project", async () => {
    const dir = await makeProject("no-mono", {
      "package.json": JSON.stringify({
        name: "simple-app",
        dependencies: { react: "^18.0.0" },
      }),
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeUndefined();
    await rm(dir, { recursive: true });
  });

  test("handles malformed pnpm-workspace.yaml", async () => {
    const dir = await makeProject("pnpm-broken", {
      "package.json": '{"name":"pnpm-broken"}',
      "pnpm-workspace.yaml": "{{invalid yaml content::}",
    });
    const info = await detectProject(dir);
    // Should not have monorepo since the workspace file is broken
    expect(info.monorepo).toBeUndefined();
    await rm(dir, { recursive: true });
  });

  test("inferWorkspaceType returns undefined for generic dir", async () => {
    const dir = await makeProject("generic-ws", {
      "package.json": JSON.stringify({
        name: "generic",
        workspaces: ["modules/*"],
      }),
      "modules/thing/package.json": JSON.stringify({ name: "@g/thing" }),
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    // "modules" is not a recognized type prefix, no bin/server/client hints
    const ws = info.monorepo!.workspaces[0]!;
    expect(ws.type).toBeUndefined();
    await rm(dir, { recursive: true });
  });

  test("README with only badges/links returns no description", async () => {
    const dir = await makeProject("badges-readme", {
      "package.json": '{"name":"badges-proj"}',
      "README.md": "# Title\n\n[![badge](http://example.com/badge.svg)](http://example.com)\n\n![logo](logo.png)\n\n| Column | Data |\n|--------|------|\n| a | b |",
    });
    const info = await detectProject(dir);
    // Should not extract badges/tables as description
    expect(info.description).toBeUndefined();
    await rm(dir, { recursive: true });
  });

  test("README with About section", async () => {
    const dir = await makeProject("about-readme", {
      "package.json": '{"name":"about-proj"}',
      "README.md": "# Title\n\n## About\n\nThis tool manages developer context.\n\n## Install\n\nRun npm install.",
    });
    const info = await detectProject(dir);
    expect(info.description).toContain("manages developer context");
    await rm(dir, { recursive: true });
  });

  test("skips hidden dirs in workspace resolution", async () => {
    const dir = await makeProject("hidden-ws", {
      "package.json": JSON.stringify({
        name: "hidden-ws",
        workspaces: ["packages/*"],
      }),
      "packages/.hidden/package.json": '{"name":"hidden"}',
      "packages/visible/package.json": '{"name":"visible"}',
    });
    const info = await detectProject(dir);
    expect(info.monorepo).toBeTruthy();
    // Should only have the visible workspace
    const names = info.monorepo!.workspaces.map((w) => w.name);
    expect(names).toContain("visible");
    expect(names).not.toContain("hidden");
    await rm(dir, { recursive: true });
  });

  test("handles unreadable Cargo.toml in detectProjectName", async () => {
    const dir = await makeProject("cargo-unreadable", {});
    // Remove package.json so it falls back to detectProjectName
    const { unlinkSync } = await import("fs");
    try { unlinkSync(join(dir, "package.json")); } catch {}
    // Create Cargo.toml as a directory — existsSync returns true, readFileSync throws
    await mkdir(join(dir, "Cargo.toml"), { recursive: true });

    const info = await detectProject(dir);
    // Should fall back to directory name since Cargo.toml can't be read
    expect(info.name).toBe("cargo-unreadable");
    await rm(dir, { recursive: true });
  });
});
