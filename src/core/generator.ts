import { writeFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { CONFIG, thinkPath } from "./config.ts";
import { parseMarkdown } from "./parser.ts";
import type { ParsedFile } from "./parser.ts";

/**
 * Read all .md files from a directory, returning parsed results.
 */
async function readMdDir(dirPath: string): Promise<ParsedFile[]> {
  if (!existsSync(dirPath)) return [];

  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
  const results: ParsedFile[] = [];

  for (const file of mdFiles) {
    const parsed = await parseMarkdown(join(dirPath, file.name));
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Prepare file content for embedding under a ## section header.
 * Strips leading # heading (redundant with section header) and
 * bumps all heading levels +1 so they nest properly.
 */
function nestContent(content: string): string {
  const lines = content.split("\n");
  let startIdx = 0;

  // Strip leading # heading (it duplicates the section header)
  if (lines[0]?.match(/^# /)) {
    startIdx = 1;
    // Also skip blank line after the heading
    if (lines[startIdx]?.trim() === "") startIdx++;
  }

  return lines
    .slice(startIdx)
    .map((line) => (line.match(/^#{1,5} /) ? `#${line}` : line))
    .join("\n");
}

/**
 * Like nestContent but bumps headings by +3 so they nest under ####.
 * ## Heading → ##### Heading
 */
function nestContentDeep(content: string): string {
  const lines = content.split("\n");
  let startIdx = 0;

  if (lines[0]?.match(/^# /)) {
    startIdx = 1;
    if (lines[startIdx]?.trim() === "") startIdx++;
  }

  return lines
    .slice(startIdx)
    .map((line) => (line.match(/^#{1,5} /) ? `###${line}` : line))
    .join("\n");
}

interface InjectableSections {
  tools?: string;
  patterns?: string;
  antiPatterns?: string;
}

const INJECT_SECTION_MAP: Record<string, { key: keyof InjectableSections; label: string }> = {
  tools: { key: "tools", label: "Tool Preferences" },
  patterns: { key: "patterns", label: "Patterns to Follow" },
  "anti-patterns": { key: "antiPatterns", label: "Anti-Patterns to Avoid" },
};

/**
 * Format a skill or agent entry for output.
 * Renders frontmatter metadata and content.
 * When injectableSections is provided and the entry has model/inject fields,
 * renders additional context-aware metadata.
 */
function formatEntry(parsed: ParsedFile, injectableSections?: InjectableSections): string {
  const parts: string[] = [];
  const fm = parsed.frontmatter;

  const name = fm.name ?? fm.title;
  if (typeof name === "string" && name) {
    parts.push(`### ${name}\n`);
  }

  if (typeof fm.description === "string" && fm.description) {
    parts.push(fm.description);
    parts.push("");
  }

  if (typeof fm.trigger === "string" && fm.trigger) {
    parts.push(`**Trigger**: ${fm.trigger}`);
  }

  const VALID_MODELS = ["sonnet", "haiku", "opus"];
  const hasModel = typeof fm.model === "string" && VALID_MODELS.includes(fm.model);
  const validInjectKeys = Object.keys(INJECT_SECTION_MAP);
  const hasInject = Array.isArray(fm.inject) && fm.inject.length > 0
    && (fm.inject as string[]).every((k) => typeof k === "string" && validInjectKeys.includes(k));

  if (hasModel) {
    parts.push(`**Model**: ${fm.model}`);
  }

  if (Array.isArray(fm.tools) && fm.tools.length > 0) {
    parts.push(`**Tools**: ${fm.tools.join(", ")}`);
  }

  if (hasModel || hasInject) {
    const modelHint = hasModel ? ` (model: ${fm.model})` : "";
    parts.push(`**Spawn as**: Task subagent${modelHint} when the trigger conditions are met.`);
  }

  // Inject profile sections for agents with inject field
  if (hasInject && injectableSections) {
    for (const injectKey of fm.inject as string[]) {
      const mapping = INJECT_SECTION_MAP[injectKey];
      if (!mapping) continue;
      const sectionContent = injectableSections[mapping.key];
      if (sectionContent) {
        parts.push("");
        parts.push(`#### User Preferences: ${mapping.label}\n`);
        parts.push(nestContentDeep(sectionContent));
      }
    }
  }

  if (parsed.content) {
    parts.push("");
    parts.push(nestContent(parsed.content));
  }

  return parts.join("\n");
}

/**
 * Generate CLAUDE.md from ~/.think sources
 * Outputs to ~/.claude/CLAUDE.md which Claude reads automatically
 */
export async function generatePlugin(): Promise<void> {
  // Read all core files in parallel
  const [profile, tools, patterns, antiPatterns, learnings, subagents, workflows] =
    await Promise.all([
      parseMarkdown(thinkPath(CONFIG.files.profile)),
      parseMarkdown(thinkPath(CONFIG.files.tools)),
      parseMarkdown(thinkPath(CONFIG.files.patterns)),
      parseMarkdown(thinkPath(CONFIG.files.antiPatterns)),
      parseMarkdown(thinkPath(CONFIG.files.learnings)),
      parseMarkdown(thinkPath(CONFIG.files.subagents)),
      parseMarkdown(thinkPath(CONFIG.files.workflows)),
    ]);

  // Read skills, agents, and workflow directories
  const [skillFiles, agentFiles, workflowFiles] = await Promise.all([
    readMdDir(thinkPath(CONFIG.dirs.skills)),
    readMdDir(thinkPath(CONFIG.dirs.agents)),
    readMdDir(thinkPath("automation", "workflows")),
  ]);

  const sections: string[] = [];

  sections.push("# Personal Context\n");
  sections.push("This context is auto-generated by `think`. Edit files in ~/.think instead.\n");

  // Profile
  if (profile) {
    sections.push("## About the User\n");
    if (profile.frontmatter?.name) {
      sections.push(`Name: ${profile.frontmatter.name}\n`);
    }
    if (profile.content) {
      sections.push(nestContent(profile.content));
    }
    sections.push("");
  }

  // Tool preferences
  if (tools?.content) {
    sections.push("## Tool Preferences\n");
    sections.push(nestContent(tools.content));
    sections.push("");
  }

  // Patterns
  if (patterns?.content) {
    sections.push("## Patterns to Follow\n");
    sections.push(nestContent(patterns.content));
    sections.push("");
  }

  // Anti-patterns
  if (antiPatterns?.content) {
    sections.push("## Anti-Patterns to Avoid\n");
    sections.push(nestContent(antiPatterns.content));
    sections.push("");
  }

  // Learnings
  if (learnings?.content) {
    sections.push("## Memory - Learnings\n");
    sections.push(nestContent(learnings.content));
    sections.push("");
  }

  // Build injectable sections from already-parsed profile data
  const injectableSections: InjectableSections = {};
  if (tools?.content) injectableSections.tools = tools.content;
  if (patterns?.content) injectableSections.patterns = patterns.content;
  if (antiPatterns?.content) injectableSections.antiPatterns = antiPatterns.content;

  // Skills (no injection — skills are not spawned as subagents)
  if (skillFiles.length > 0) {
    sections.push("## Skills\n");
    for (const skill of skillFiles) {
      sections.push(formatEntry(skill));
      sections.push("");
    }
  }

  // Agents (with context injection)
  if (agentFiles.length > 0) {
    sections.push("## Agents\n");
    for (const agent of agentFiles) {
      sections.push(formatEntry(agent, injectableSections));
      sections.push("");
    }
  }

  // Workflows (from directory)
  if (workflowFiles.length > 0) {
    sections.push("## Workflows\n");
    for (const wf of workflowFiles) {
      if (wf.content) {
        const name = wf.frontmatter?.name ?? wf.frontmatter?.title;
        if (typeof name === "string" && name) {
          sections.push(`### ${name}\n`);
        }
        sections.push(nestContent(wf.content));
        sections.push("");
      }
    }
  }

  // Subagent automation
  if (subagents?.content) {
    sections.push("## Subagent Automation\n");
    sections.push("Follow these rules for automatically spawning subagents:\n");
    sections.push(nestContent(subagents.content));
    sections.push("");
  }

  // Legacy workflows (from single file)
  if (workflows?.content) {
    if (workflowFiles.length === 0) {
      sections.push("## Workflows\n");
      sections.push(nestContent(workflows.content));
      sections.push("");
    } else {
      sections.push(nestContent(workflows.content));
      sections.push("");
    }
  }

  await writeFile(CONFIG.claudeMdPath, sections.join("\n"));
}
