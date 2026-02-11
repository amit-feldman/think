import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { detectProject } from "./project-detect.ts";

const TMP = join(process.cwd(), ".tmp-detect-" + Date.now());

describe("project-detect extras", () => {
  beforeAll(async () => {
    await mkdir(TMP, { recursive: true });
  });
  afterAll(async () => {
    await rm(TMP, { recursive: true, force: true });
  });

  test("detects PHP runtime via composer.json and Laravel framework", async () => {
    const dir = join(TMP, "php-laravel");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "composer.json"), JSON.stringify({ require: { "laravel/framework": "^11.0" } }));
    const info = await detectProject(dir);
    expect(info.runtime).toBe("php");
    expect(info.frameworks).toContain("Laravel");
  });

  test("detects Spring Boot via pom.xml heuristic", async () => {
    const dir = join(TMP, "java-spring");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "pom.xml"), "<dependencies>spring-boot-starter</dependencies>");
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("Spring Boot");
  });

  test("detects ASP.NET via .csproj with Microsoft.AspNetCore", async () => {
    const dir = join(TMP, "csharp-aspnet");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "App.csproj"),
      '<Project><PackageReference Include="Microsoft.AspNetCore.App" /></Project>'
    );
    const info = await detectProject(dir);
    expect(info.frameworks).toContain("ASP.NET");
  });
});
