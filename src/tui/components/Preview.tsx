import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { CONFIG } from "../../core/config";

interface PreviewProps {
  onClose: () => void;
}

export function Preview({ onClose }: PreviewProps) {
  const [content, setContent] = useState<string[]>([]);
  const [scroll, setScroll] = useState(0);
  const [loading, setLoading] = useState(true);
  const maxLines = 20;

  useEffect(() => {
    loadPreview();
  }, []);

  async function loadPreview() {
    if (existsSync(CONFIG.claudeMdPath)) {
      const text = await readFile(CONFIG.claudeMdPath, "utf-8");
      setContent(text.split("\n"));
    }
    setLoading(false);
  }

  useInput((input, key) => {
    if (key.escape || input === "q") {
      onClose();
    }
    if (key.upArrow || input === "k") {
      setScroll((s) => Math.max(0, s - 1));
    }
    if (key.downArrow || input === "j") {
      setScroll((s) => Math.min(content.length - maxLines, s + 1));
    }
    if (key.pageUp) {
      setScroll((s) => Math.max(0, s - maxLines));
    }
    if (key.pageDown) {
      setScroll((s) => Math.min(content.length - maxLines, s + maxLines));
    }
  });

  if (loading) {
    return <Text color="gray">Loading preview...</Text>;
  }

  const visibleLines = content.slice(scroll, scroll + maxLines);
  const scrollPercent = content.length > maxLines
    ? Math.round((scroll / (content.length - maxLines)) * 100)
    : 100;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">CLAUDE.md Preview</Text>
        <Text color="gray"> ({content.length} lines)</Text>
        <Box flexGrow={1} />
        <Text color="gray">{scrollPercent}%</Text>
      </Box>

      <Box flexDirection="column" height={maxLines}>
        {visibleLines.map((line, i) => {
          let color: string | undefined;
          if (line.startsWith("# ")) color = "green";
          else if (line.startsWith("## ")) color = "yellow";
          else if (line.startsWith("- ")) color = "white";
          else if (line.startsWith("**")) color = "cyan";

          return (
            <Text key={scroll + i} color={color} dimColor={!color}>
              {line || " "}
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">↑↓/jk: scroll | PgUp/PgDn: page | Esc: close</Text>
      </Box>
    </Box>
  );
}
