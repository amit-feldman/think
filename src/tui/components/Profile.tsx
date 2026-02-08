import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { parseMarkdown } from "../../core/parser.ts";
import { thinkPath, CONFIG } from "../../core/config.ts";
import { spawn } from "child_process";

interface ProfileProps {
  height?: number;
  isActive?: boolean;
}

/**
 * Render a markdown line as a styled React node.
 */
function renderLine(line: string, i: number): React.ReactNode {
  const trimmed = line.trim();

  if (!trimmed) {
    return <Text key={`line-${i}`}> </Text>;
  }

  // H1: bold cyan
  if (trimmed.startsWith("# ")) {
    return (
      <Text key={`line-${i}`} color="cyan" bold>
        {"  "}{trimmed.slice(2)}
      </Text>
    );
  }

  // H2: cyan
  if (trimmed.startsWith("## ")) {
    return (
      <Text key={`line-${i}`} color="cyan">
        {"  "}{trimmed.slice(3)}
      </Text>
    );
  }

  // H3: dim cyan
  if (trimmed.startsWith("### ")) {
    return (
      <Text key={`line-${i}`} color="cyan" dimColor>
        {"    "}{trimmed.slice(4)}
      </Text>
    );
  }

  // Bullet points
  if (trimmed.startsWith("- ")) {
    return (
      <Text key={`line-${i}`}>
        {"    "}{trimmed}
      </Text>
    );
  }

  // Regular text
  return (
    <Text key={`line-${i}`}>
      {"  "}{trimmed}
    </Text>
  );
}

export function Profile({ height = 15, isActive = true }: ProfileProps) {
  const [content, setContent] = useState<string>("");
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const parsed = await parseMarkdown(thinkPath(CONFIG.files.profile));
    if (parsed) {
      setContent(parsed.content);
      setFrontmatter(parsed.frontmatter);
    }
    setLoading(false);
  }

  // Extract known fields from frontmatter
  const fields: { label: string; value: string }[] = [];
  if (frontmatter.name) fields.push({ label: "Name", value: String(frontmatter.name) });
  if (frontmatter.role) fields.push({ label: "Role", value: String(frontmatter.role) });
  if (frontmatter.personality) fields.push({ label: "Personality", value: String(frontmatter.personality) });
  if (frontmatter.style) fields.push({ label: "Style", value: String(frontmatter.style) });

  // Build renderable lines
  const allLines: React.ReactNode[] = [];

  if (fields.length > 0) {
    const maxLabelLen = fields.reduce((max, f) => Math.max(max, f.label.length), 0);
    for (const field of fields) {
      allLines.push(
        <Box key={`fm-${field.label}`}>
          <Text dimColor>  {field.label.padEnd(maxLabelLen + 2)}</Text>
          <Text>{field.value}</Text>
        </Box>,
      );
    }
    allLines.push(<Text key="fm-spacer"> </Text>);
  }

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    allLines.push(renderLine(lines[i] ?? "", i));
  }

  const contentHeight = Math.max(3, height - 1);
  const maxScroll = Math.max(0, allLines.length - contentHeight);

  useInput(
    (input, key) => {
      if (input === "e") {
        const editor = process.env.EDITOR || "vi";
        spawn(editor, [thinkPath(CONFIG.files.profile)], {
          stdio: "inherit",
        }).on("exit", () => {
          loadProfile();
        });
      }
      if (key.upArrow || input === "k") {
        setScroll((s) => Math.max(0, s - 1));
      }
      if (key.downArrow || input === "j") {
        setScroll((s) => Math.min(maxScroll, s + 1));
      }
    },
    { isActive },
  );

  if (loading) {
    return <Text dimColor>Loading...</Text>;
  }

  if (!content && fields.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No profile configured. Press </Text>
        <Text color="cyan">e</Text>
        <Text dimColor> to create one.</Text>
      </Box>
    );
  }

  const visibleLines = allLines.slice(scroll, scroll + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines}
      </Box>
    </Box>
  );
}
