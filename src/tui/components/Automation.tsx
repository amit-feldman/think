import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { parseMarkdown } from "../../core/parser";
import { thinkPath, CONFIG } from "../../core/config";
import { spawn } from "child_process";

type AutomationFile = "subagents" | "workflows";

const files: { key: AutomationFile; label: string; path: string }[] = [
  { key: "subagents", label: "Subagents", path: CONFIG.files.subagents },
  { key: "workflows", label: "Workflows", path: CONFIG.files.workflows },
];

export function Automation() {
  const [selected, setSelected] = useState<AutomationFile>("subagents");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
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

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      const idx = files.findIndex((f) => f.key === selected);
      setSelected(files[(idx - 1 + files.length) % files.length].key);
    }
    if (key.rightArrow || input === "l") {
      const idx = files.findIndex((f) => f.key === selected);
      setSelected(files[(idx + 1) % files.length].key);
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

  return (
    <Box flexDirection="column">
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
      </Box>

      <Box flexDirection="column" paddingLeft={1}>
        {loading ? (
          <Text color="gray">Loading...</Text>
        ) : (
          content.split("\n").map((line, i) => (
            <Text key={i} color={line.startsWith("#") ? "cyan" : undefined}>
              {line}
            </Text>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">←/→: switch | e: edit in $EDITOR</Text>
      </Box>
    </Box>
  );
}
