import { describe, expect, test } from "bun:test";
import {
  listAgentTemplates,
  loadAgentTemplate,
  getTemplateDescription,
} from "./agent-templates.ts";

describe("agent-templates", () => {
  test("listAgentTemplates returns all 4 templates", async () => {
    const templates = await listAgentTemplates();
    expect(templates).toContain("frontend");
    expect(templates).toContain("backend");
    expect(templates).toContain("reviewer");
    expect(templates).toContain("tester");
    expect(templates.length).toBe(4);
  });

  test("loadAgentTemplate returns file content with frontmatter", async () => {
    const content = await loadAgentTemplate("frontend");
    expect(content).toContain("name: Frontend Developer");
    expect(content).toContain("model: sonnet");
    expect(content).toContain("inject:");
  });

  test("loadAgentTemplate throws for nonexistent template", async () => {
    expect(loadAgentTemplate("nonexistent")).rejects.toThrow();
  });

  test("getTemplateDescription returns description from frontmatter", async () => {
    const desc = await getTemplateDescription("frontend");
    expect(desc).toContain("UI components");
  });

  test("getTemplateDescription for each template", async () => {
    const templates = await listAgentTemplates();
    for (const name of templates) {
      const desc = await getTemplateDescription(name);
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});
