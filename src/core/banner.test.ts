import { describe, expect, test, mock } from "bun:test";
import { printCompactBanner } from "./banner.ts";

describe("printCompactBanner", () => {
  test("prints banner to console", () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };

    printCompactBanner();

    console.log = originalLog;

    // Should have two calls: the banner line and an empty line
    expect(logs.length).toBe(2);
    expect(logs[0]).toContain("think");
    expect(logs[1]).toBe("");
  });
});
