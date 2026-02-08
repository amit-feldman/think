import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { CONFIG, estimateTokens, formatTokens } from "../../core/config.ts";

interface PreviewProps {
  onClose: () => void;
  height?: number;
}

export function Preview({ onClose, height = 20 }: PreviewProps) {
  const [content, setContent] = useState<string[]>([]);
  const [scroll, setScroll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tokenCount, setTokenCount] = useState(0);
  const maxLines = Math.max(5, height - 4);

  useEffect(() => {
    loadPreview();
  }, []);

  async function loadPreview() {
    if (existsSync(CONFIG.claudeMdPath)) {
      const text = await readFile(CONFIG.claudeMdPath, "utf-8");
      setContent(text.split("\n"));
      setTokenCount(estimateTokens(text));
    }
    setLoading(false);
  }

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "p") {
      onClose();
    }
    if (key.upArrow || input === "k") {
      setScroll((s) => Math.max(0, s - 1));
    }
    if (key.downArrow || input === "j") {
      setScroll((s) => Math.min(Math.max(0, content.length - maxLines), s + 1));
    }
    if (key.pageUp) {
      setScroll((s) => Math.max(0, s - maxLines));
    }
    if (key.pageDown) {
      setScroll((s) => Math.min(Math.max(0, content.length - maxLines), s + maxLines));
    }
  });

  if (loading) {
    return <Text dimColor>Loading preview...</Text>;
  }

  if (content.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>No CLAUDE.md found. Run sync first.</Text>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to close</Text>
        </Box>
      </Box>
    );
  }

  const visibleLines = content.slice(scroll, scroll + maxLines);
  const scrollPercent =
    content.length > maxLines
      ? Math.round((scroll / (content.length - maxLines)) * 100)
      : 100;

  return (
    <Box flexDirection="column" padding={1} height={height}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>CLAUDE.md Preview</Text>
        <Text dimColor> ({content.length} lines, ~{formatTokens(tokenCount)} tokens)</Text>
        <Box flexGrow={1} />
        <Text dimColor>{scrollPercent}%</Text>
      </Box>

      <Box flexDirection="column" height={maxLines}>
        {visibleLines.map((line, i) => {
          let color: string | undefined;
          if (line.startsWith("# ")) color = "cyan";
          else if (line.startsWith("## ")) color = "yellow";
          else if (line.startsWith("### ")) color = "green";
          else if (line.startsWith("- ")) color = "white";

          return (
            <Text key={scroll + i} color={color} dimColor={!color && line.trim() !== ""}>
              {line || " "}
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{"\u2191\u2193"}/jk: scroll | PgUp/PgDn: page | Esc: close</Text>
      </Box>
    </Box>
  );
}
