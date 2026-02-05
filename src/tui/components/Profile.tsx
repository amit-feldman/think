import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { parseMarkdown } from "../../core/parser";
import { thinkPath, CONFIG } from "../../core/config";
import { spawn } from "child_process";

interface ProfileProps {
  height?: number;
}

export function Profile({ height = 15 }: ProfileProps) {
  const [content, setContent] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const parsed = await parseMarkdown(thinkPath(CONFIG.files.profile));
    if (parsed) {
      setContent(parsed.content);
      setName((parsed.frontmatter.name as string) || "");
    }
    setLoading(false);
  }

  const lines = content.split("\n");
  const contentHeight = height - 3; // header + footer
  const maxScroll = Math.max(0, lines.length - contentHeight);

  useInput((input, key) => {
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
  });

  if (loading) {
    return <Text color="gray">Loading...</Text>;
  }

  const visibleLines = lines.slice(scroll, scroll + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      <Box marginBottom={1}>
        <Text bold color="green">Profile</Text>
        {name && <Text color="gray"> - {name}</Text>}
        {maxScroll > 0 && (
          <Text color="gray"> [{scroll + 1}-{Math.min(scroll + contentHeight, lines.length)}/{lines.length}]</Text>
        )}
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, i) => (
          <Text key={scroll + i} color={line.startsWith("#") ? "cyan" : undefined}>
            {line || " "}
          </Text>
        ))}
      </Box>

      <Box>
        <Text color="gray">e: edit{maxScroll > 0 ? " | ↑↓/jk: scroll" : ""}</Text>
      </Box>
    </Box>
  );
}
