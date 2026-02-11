import { describe, expect, test } from "bun:test";
import { __queries_test } from "./queries.ts";
import { __ts_test } from "./tree-sitter.ts";
import { extractDescription } from "./agent-templates.ts";

describe("test helpers and fallbacks", () => {
  test("toGrammarKey maps languages including csharp", () => {
    expect(__queries_test.toGrammarKey("csharp")).toBe("c_sharp");
    expect(__queries_test.toGrammarKey("typescript")).toBe("typescript");
    expect(__queries_test.toGrammarKey("unknown")).toBeNull();
  });

  test("tree-sitter getLanguage returns null for unsupported key", async () => {
    const lang = await __ts_test.getLanguage("elixir" as any);
    expect(lang).toBeNull();
  });

  test("tree-sitter exists returns false for missing path", async () => {
    const result = await __ts_test.exists("/nonexistent/path/to/wasm");
    expect(result).toBe(false);
  });

  test("extractDescription: gray-matter success path", () => {
    const raw = "---\nname: Foo\ndescription: Direct from frontmatter\n---\nBody";
    expect(extractDescription(raw)).toBe("Direct from frontmatter");
  });

  test("extractDescription: YAML regex fallback when matter throws", () => {
    // Invalid YAML causes matter() to throw, but ---...--- block has description:
    const raw = "---\ndescription: Fallback desc\ninvalid: [unclosed\n---\nBody";
    expect(extractDescription(raw)).toBe("Fallback desc");
  });

  test("extractDescription: HTML-stripped fallback", () => {
    const raw = "<hr />\n<p>name: Test\ndescription: From HTML stripped</p>";
    expect(extractDescription(raw)).toBe("From HTML stripped");
  });

  test("extractDescription: returns empty for no description", () => {
    expect(extractDescription("no yaml here")).toBe("");
  });
});
