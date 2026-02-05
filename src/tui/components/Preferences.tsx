import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { parseMarkdown } from "../../core/parser";
import { thinkPath, CONFIG } from "../../core/config";
import { spawn } from "child_process";

type PreferenceFile = "tools" | "patterns" | "antiPatterns";

const files: { key: PreferenceFile; label: string; path: string }[] = [
  { key: "tools", label: "Tools", path: CONFIG.files.tools },
  { key: "patterns", label: "Patterns", path: CONFIG.files.patterns },
  { key: "antiPatterns", label: "Anti-Patterns", path: CONFIG.files.antiPatterns },
];

interface PreferencesProps {
  height?: number;
}

export function Preferences({ height = 15 }: PreferencesProps) {
  const [selected, setSelected] = useState<PreferenceFile>("tools");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    loadContent();
    setScroll(0);
  }, [selected]);

  async function loadContent() {
    setLoading(true);
    const file = files.find((f) => f.key === selected);
    if (file) {
      const parsed = await parseMarkdown(thinkPath(file.path));
      setContent(parsed?.content || "");
    }
    setLoading(false);
  }

  const lines = content.split("\n");
  const contentHeight = height - 3;
  const maxScroll = Math.max(0, lines.length - contentHeight);

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      const idx = files.findIndex((f) => f.key === selected);
      setSelected(files[(idx - 1 + files.length) % files.length]!.key);
    }
    if (key.rightArrow || input === "l") {
      const idx = files.findIndex((f) => f.key === selected);
      setSelected(files[(idx + 1) % files.length]!.key);
    }
    if (key.upArrow || input === "k") {
      setScroll((s) => Math.max(0, s - 1));
    }
    if (key.downArrow || input === "j") {
      setScroll((s) => Math.min(maxScroll, s + 1));
    }
    if (input === "e") {
      const file = files.find((f) => f.key === selected);
      if (file) {
        const editor = process.env.EDITOR || "vi";
        spawn(editor, [thinkPath(file.path)], {
          stdio: "inherit",
        }).on("exit", () => {
          loadContent();
        });
      }
    }
  });

  const visibleLines = lines.slice(scroll, scroll + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      <Box marginBottom={1}>
        {files.map((file) => (
          <Box key={file.key} marginRight={2}>
            <Text
              color={selected === file.key ? "green" : "gray"}
              bold={selected === file.key}
            >
              {selected === file.key ? "▸ " : "  "}
              {file.label}
            </Text>
          </Box>
        ))}
        {maxScroll > 0 && (
          <Text color="gray">[{scroll + 1}-{Math.min(scroll + contentHeight, lines.length)}/{lines.length}]</Text>
        )}
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {loading ? (
          <Text color="gray">Loading...</Text>
        ) : (
          visibleLines.map((line, i) => (
            <Text key={scroll + i} color={line.startsWith("#") ? "cyan" : undefined}>
              {line || " "}
            </Text>
          ))
        )}
      </Box>

      <Box>
        <Text color="gray">←/→: switch | e: edit{maxScroll > 0 ? " | ↑↓: scroll" : ""}</Text>
      </Box>
    </Box>
  );
}
