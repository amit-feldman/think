import { writeFile } from "fs/promises";
import { join } from "path";
import { CONFIG } from "./config.ts";

// ── Description maps ──────────────────────────────────────────────

export const styleDescriptions: Record<string, string[]> = {
  direct: [
    "Be direct and minimal - no fluff, just answers and code",
    "Skip lengthy reasoning unless asked",
    "Don't explain obvious things",
  ],
  conversational: [
    "Be friendly but efficient",
    "Brief explanations when helpful",
    "Keep a conversational tone",
  ],
  detailed: [
    "Provide thorough explanations",
    "Include context and reasoning",
    "Explain trade-offs and alternatives",
  ],
};

export const roleDescriptions: Record<string, string> = {
  "senior-dev": "Senior developer - experienced and autonomous, prefers concise guidance",
  "mid-dev": "Mid-level developer - competent but appreciates context on complex topics",
  "junior-dev": "Junior developer - learning, benefits from more explanation and examples",
  founder: "Founder/Tech Lead - focused on shipping, pragmatic decisions over perfect code",
  student: "Student - learning fundamentals, explain concepts when relevant",
  hobbyist: "Hobbyist - exploring for fun, balance learning with getting things done",
};

export const personalityDescriptions: Record<string, string[]> = {
  "pair-programmer": [
    "Act as a pair programmer - think out loud, collaborate on solutions",
    "Discuss trade-offs and alternatives when relevant",
    "Catch potential issues early, suggest improvements as we go",
  ],
  "senior-dev": [
    "Act as a senior developer - give direction, review approaches",
    "Point out potential issues and better patterns",
    "Be opinionated when it matters, flexible when it doesn't",
  ],
  assistant: [
    "Act as an efficient assistant - execute tasks with minimal chatter",
    "Ask clarifying questions only when truly needed",
    "Focus on delivering what was asked",
  ],
  mentor: [
    "Act as a mentor - teach concepts, explain the 'why'",
    "Use opportunities to share knowledge",
    "Suggest learning resources when helpful",
  ],
  "rubber-duck": [
    "Act as a rubber duck - help me think through problems",
    "Ask probing questions rather than giving immediate answers",
    "Help me discover solutions myself",
  ],
};

export const planningDescriptions: Record<string, string> = {
  "plan-first": "Discuss architecture and approach before writing code",
  iterate: "Start with a rough plan, refine as we go",
  "dive-in": "Start coding quickly, figure out structure as needed",
};

export const testingDescriptions: Record<string, string> = {
  tdd: "Write tests first (TDD), then implement",
  "test-after": "Write tests after implementation",
  "critical-paths": "Test critical paths and edge cases",
  minimal: "Minimal testing - add tests when necessary",
};

export const reviewDescriptions: Record<string, string> = {
  "review-before-commit": "Review changes before committing - catch issues early",
  "review-on-request": "Review code when explicitly asked",
  "self-review": "I review my own code, no automatic reviews needed",
};

export const gitDescriptions: Record<string, string> = {
  "small-commits": "Small, atomic commits - easy to review and revert",
  "feature-branches": "Feature branches with squash merges",
  "trunk-based": "Trunk-based development with feature flags",
  flexible: "Flexible git workflow based on project needs",
};

export const docDescriptions: Record<string, string> = {
  inline: "Document with inline comments as code is written",
  "readme-driven": "README-driven development - docs first",
  minimal: "Minimal documentation - code should be self-documenting",
  "on-request": "Add documentation when requested",
};

export const debugDescriptions: Record<string, string> = {
  systematic: "Debug systematically - isolate, reproduce, trace",
  hypothesis: "Hypothesis-driven debugging - test likely causes first",
  printf: "Printf debugging - add logs and observe",
  "whatever-works": "Whatever works to fix the issue quickly",
};

export const refactorDescriptions: Record<string, string> = {
  proactive: "Proactively suggest refactoring opportunities",
  "on-request": "Refactor only when asked",
  "boy-scout": "Boy scout rule - leave code better than you found it",
  "if-broken": "Don't refactor working code unless necessary",
};

// ── Role-based workflow defaults ──────────────────────────────────

export interface WorkflowDefaults {
  planning: string;
  testing: string;
  review: string;
  git: string;
  docs: string;
  debug: string;
  refactor: string;
}

export const roleWorkflowDefaults: Record<string, WorkflowDefaults> = {
  "senior-dev": {
    planning: "plan-first",
    testing: "tdd",
    review: "review-before-commit",
    git: "small-commits",
    docs: "minimal",
    debug: "systematic",
    refactor: "boy-scout",
  },
  "mid-dev": {
    planning: "iterate",
    testing: "test-after",
    review: "review-before-commit",
    git: "feature-branches",
    docs: "inline",
    debug: "hypothesis",
    refactor: "on-request",
  },
  "junior-dev": {
    planning: "plan-first",
    testing: "test-after",
    review: "review-before-commit",
    git: "feature-branches",
    docs: "inline",
    debug: "systematic",
    refactor: "proactive",
  },
  founder: {
    planning: "dive-in",
    testing: "critical-paths",
    review: "self-review",
    git: "trunk-based",
    docs: "minimal",
    debug: "whatever-works",
    refactor: "if-broken",
  },
  student: {
    planning: "plan-first",
    testing: "test-after",
    review: "review-on-request",
    git: "feature-branches",
    docs: "inline",
    debug: "systematic",
    refactor: "proactive",
  },
  hobbyist: {
    planning: "iterate",
    testing: "minimal",
    review: "self-review",
    git: "flexible",
    docs: "on-request",
    debug: "printf",
    refactor: "if-broken",
  },
};

// ── Role-based personality/style defaults ─────────────────────────

const rolePersonalityDefaults: Record<string, string> = {
  "senior-dev": "assistant",
  "mid-dev": "pair-programmer",
  "junior-dev": "mentor",
  founder: "assistant",
  student: "mentor",
  hobbyist: "pair-programmer",
};

const roleStyleDefaults: Record<string, string> = {
  "senior-dev": "direct",
  "mid-dev": "conversational",
  "junior-dev": "detailed",
  founder: "direct",
  student: "detailed",
  hobbyist: "conversational",
};

// ── Profile generation ────────────────────────────────────────────

export interface ProfileGenerationOptions {
  name?: string;
  role: string;
  style?: string;
  personality?: string;
}

/**
 * Generate profile files with role-based defaults.
 * Creates profile.md and preferences/anti-patterns.md in the given profile directory.
 */
export async function generateProfileFiles(
  profileDir: string,
  options: ProfileGenerationOptions,
): Promise<void> {
  const { role } = options;
  const name = options.name ?? "";
  const style = options.style ?? roleStyleDefaults[role] ?? "direct";
  const personality = options.personality ?? rolePersonalityDefaults[role] ?? "assistant";
  const defaults = roleWorkflowDefaults[role] ?? roleWorkflowDefaults["senior-dev"]!;

  // ── Write profile.md ────────────────────────────────────────────
  const profileContent = `---
name: ${name}
role: ${role}
style: ${style}
personality: ${personality}
---

# Who I Am

${roleDescriptions[role] ?? role}

# How Claude Should Behave

${(personalityDescriptions[personality] ?? []).join(". ")}.

# Communication Style

${(styleDescriptions[style] ?? []).join(". ")}. No emojis unless explicitly requested. Show code when it's clearer than explanation.

# Development Workflow

Planning: ${planningDescriptions[defaults.planning] ?? defaults.planning}. Testing: ${testingDescriptions[defaults.testing] ?? defaults.testing}. Code review: ${reviewDescriptions[defaults.review] ?? defaults.review}. Git: ${gitDescriptions[defaults.git] ?? defaults.git}. Documentation: ${docDescriptions[defaults.docs] ?? defaults.docs}. Debugging: ${debugDescriptions[defaults.debug] ?? defaults.debug}. Refactoring: ${refactorDescriptions[defaults.refactor] ?? defaults.refactor}.
`;

  await writeFile(join(profileDir, CONFIG.files.profile), profileContent);

  // ── Write anti-patterns.md (moderate defaults) ──────────────────
  const antiContent = `# Anti-Patterns to Avoid

## Code Style
Do not add comments for obvious code. Do not add type annotations that can be inferred. Do not create abstractions for one-time use.

## Architecture
Do not over-engineer solutions. Do not add features that were not requested. Do not create unnecessary indirection or "future-proofing" complexity.

## Communication
Do not explain obvious things. Do not repeat back what was just said. Do not pad responses with unnecessary context.
`;

  await writeFile(join(profileDir, CONFIG.files.antiPatterns), antiContent);
}
