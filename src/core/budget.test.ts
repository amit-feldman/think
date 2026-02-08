import { describe, expect, test } from "bun:test";
import { allocateBudget, redistributeSurplus } from "./budget.ts";

describe("allocateBudget", () => {
  test("allocates with default weights", () => {
    const result = allocateBudget(10000);
    expect(result.overview).toBe(800);
    expect(result.structure).toBe(1200);
    expect(result.keyFiles).toBe(2500);
    expect(result.codeMap).toBe(4000);
    expect(result.knowledge).toBe(1500);
  });

  test("handles zero budget", () => {
    const result = allocateBudget(0);
    expect(result.overview).toBe(0);
    expect(result.structure).toBe(0);
    expect(result.keyFiles).toBe(0);
    expect(result.codeMap).toBe(0);
    expect(result.knowledge).toBe(0);
  });

  test("handles small budget", () => {
    const result = allocateBudget(100);
    expect(result.overview).toBe(8);
    expect(result.structure).toBe(12);
    expect(result.keyFiles).toBe(25);
    expect(result.codeMap).toBe(40);
    expect(result.knowledge).toBe(15);
  });

  test("floors fractional allocations", () => {
    const result = allocateBudget(7);
    // All values should be integers (floored)
    expect(Number.isInteger(result.overview)).toBe(true);
    expect(Number.isInteger(result.structure)).toBe(true);
    expect(Number.isInteger(result.keyFiles)).toBe(true);
    expect(Number.isInteger(result.codeMap)).toBe(true);
    expect(Number.isInteger(result.knowledge)).toBe(true);
  });
});

describe("redistributeSurplus", () => {
  test("returns same allocation when no surplus or demand", () => {
    const allocation = allocateBudget(10000);
    const used = {
      overview: 800,
      structure: 1200,
      keyFiles: 2500,
      codeMap: 4000,
      knowledge: 1500,
    };
    const result = redistributeSurplus(allocation, used);
    expect(result).toEqual(allocation);
  });

  test("returns same allocation when all sections under budget", () => {
    const allocation = allocateBudget(10000);
    const used = {
      overview: 100,
      structure: 200,
      keyFiles: 300,
      codeMap: 400,
      knowledge: 500,
    };
    // All under budget = surplus but no demand → no change
    const result = redistributeSurplus(allocation, used);
    expect(result).toEqual(allocation);
  });

  test("redistributes surplus to over-budget sections", () => {
    const allocation = allocateBudget(10000);
    const used = {
      overview: 100,    // 700 surplus
      structure: 200,   // 1000 surplus
      keyFiles: 3000,   // 500 over budget
      codeMap: 5000,    // 1000 over budget
      knowledge: 1500,  // exact
    };
    const result = redistributeSurplus(allocation, used);

    // Under-budget sections shrink to actual
    expect(result.overview).toBe(100);
    expect(result.structure).toBe(200);
    // Over-budget sections grow
    expect(result.keyFiles).toBeGreaterThan(allocation.keyFiles);
    expect(result.codeMap).toBeGreaterThan(allocation.codeMap);
    // Knowledge stays the same (exact match, no surplus/demand)
    expect(result.knowledge).toBe(1500);
  });

  test("handles missing keys in used record", () => {
    const allocation = allocateBudget(10000);
    const used: Record<string, number> = {};
    // All sections have 0 usage → all surplus, no demand
    const result = redistributeSurplus(allocation, used);
    expect(result).toEqual(allocation);
  });

  test("distributes proportionally to demand", () => {
    const allocation = allocateBudget(10000);
    // overview has big surplus; codeMap has 2x the demand of keyFiles
    const used = {
      overview: 0,       // 800 surplus
      structure: 1200,   // exact
      keyFiles: 3000,    // 500 demand
      codeMap: 5000,     // 1000 demand
      knowledge: 1500,   // exact
    };
    const result = redistributeSurplus(allocation, used);

    const keyFilesGain = result.keyFiles - allocation.keyFiles;
    const codeMapGain = result.codeMap - allocation.codeMap;
    // codeMap should get roughly 2x the gain as keyFiles (2:1 demand ratio)
    expect(codeMapGain).toBeGreaterThan(keyFilesGain);
  });

  test("surplus is zero when all over budget", () => {
    const allocation = allocateBudget(10000);
    const used = {
      overview: 10000,
      structure: 10000,
      keyFiles: 10000,
      codeMap: 10000,
      knowledge: 10000,
    };
    const result = redistributeSurplus(allocation, used);
    expect(result).toEqual(allocation);
  });
});
