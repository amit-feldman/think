export interface BudgetAllocation {
  overview: number;
  structure: number;
  keyFiles: number;
  codeMap: number;
  knowledge: number;
}

export interface BudgetResult {
  allocation: BudgetAllocation;
  used: Record<string, number>;
  total: number;
  remaining: number;
}

const WEIGHTS = {
  overview: 0.08,
  structure: 0.12,
  keyFiles: 0.25,
  codeMap: 0.40,
  knowledge: 0.15,
} as const;

type SectionKey = keyof typeof WEIGHTS;

const SECTION_KEYS: SectionKey[] = ["overview", "structure", "keyFiles", "codeMap", "knowledge"];

/**
 * Allocate a total token budget across sections using default weights.
 */
export function allocateBudget(totalBudget: number): BudgetAllocation {
  return {
    overview: Math.floor(totalBudget * WEIGHTS.overview),
    structure: Math.floor(totalBudget * WEIGHTS.structure),
    keyFiles: Math.floor(totalBudget * WEIGHTS.keyFiles),
    codeMap: Math.floor(totalBudget * WEIGHTS.codeMap),
    knowledge: Math.floor(totalBudget * WEIGHTS.knowledge),
  };
}

/**
 * Redistribute surplus tokens from sections that used less than allocated
 * to sections that need more space.
 *
 * `used` maps section keys (e.g. "overview", "codeMap") to their actual token usage.
 * Returns a new allocation where surplus from under-budget sections is distributed
 * proportionally to over-budget sections.
 */
export function redistributeSurplus(
  allocation: BudgetAllocation,
  used: Record<string, number>
): BudgetAllocation {
  let surplus = 0;
  let demandTotal = 0;
  const demand: Partial<Record<SectionKey, number>> = {};

  // Pass 1: compute surplus and demand
  for (const key of SECTION_KEYS) {
    const allocated = allocation[key];
    const actual = used[key] ?? 0;
    const diff = allocated - actual;

    if (diff > 0) {
      // Section used less than allocated — surplus
      surplus += diff;
    } else if (diff < 0) {
      // Section needs more
      const need = -diff;
      demand[key] = need;
      demandTotal += need;
    }
  }

  if (surplus === 0 || demandTotal === 0) {
    return { ...allocation };
  }

  // Pass 2: redistribute surplus proportionally to demand
  const result = { ...allocation };

  for (const key of SECTION_KEYS) {
    const allocated = allocation[key];
    const actual = used[key] ?? 0;

    if (actual < allocated) {
      // Shrink to actual usage (free the surplus)
      result[key] = actual;
    } else if (demand[key] && demandTotal > 0) {
      // Grow by proportional share of surplus
      const share = (demand[key]! / demandTotal) * surplus;
      result[key] = allocated + Math.floor(share);
    }
  }

  return result;
}
