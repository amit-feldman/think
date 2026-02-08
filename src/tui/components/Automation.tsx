import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { parseMarkdown } from "../../core/parser.ts";
import { thinkPath, CONFIG } from "../../core/config.ts";
import { spawn } from "child_process";

type AutomationTab = "workflows" | "subagents";

const tabs: { key: AutomationTab; label: string; path: string }[] = [
  { key: "workflows", label: "Workflows", path: CONFIG.files.workflows },
  { key: "subagents", label: "Subagent Rules", path: CONFIG.files.subagents },
];

interface AutomationProps {
  height?: number;
  isActive?: boolean;
}

export function Automation({ height = 15, isActive = true }: AutomationProps) {
  const [selected, setSelected] = useState<AutomationTab>("workflows");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    loadContent();
    setScroll(0);
  }, [selected]);

  async function loadContent() {
    setLoading(true);
    const tab = tabs.find((f) => f.key === selected);
    if (tab) {
      const parsed = await parseMarkdown(thinkPath(tab.path));
      setContent(parsed?.content || "");
    }
    setLoading(false);
  }

  const lines = content.split("\n");
  const contentHeight = Math.max(3, height - 3);
  const maxScroll = Math.max(0, lines.length - contentHeight);

  useInput(
    (input, key) => {
      if (key.leftArrow || input === "h") {
        const idx = tabs.findIndex((f) => f.key === selected);
        setSelected(tabs[(idx - 1 + tabs.length) % tabs.length]!.key);
      }
      if (key.rightArrow || input === "l") {
        const idx = tabs.findIndex((f) => f.key === selected);
        setSelected(tabs[(idx + 1) % tabs.length]!.key);
      }
      if (key.upArrow || input === "k") {
        setScroll((s) => Math.max(0, s - 1));
      }
      if (key.downArrow || input === "j") {
        setScroll((s) => Math.min(maxScroll, s + 1));
      }
      if (input === "e") {
        const tab = tabs.find((f) => f.key === selected);
        if (tab) {
          const editor = process.env.EDITOR || "vi";
          spawn(editor, [thinkPath(tab.path)], {
            stdio: "inherit",
          }).on("exit", () => {
            loadContent();
          });
        }
      }
    },
    { isActive },
  );

  const visibleLines = lines.slice(scroll, scroll + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      {/* Sub-tab bar */}
      <Box>
        <Text> </Text>
        {tabs.map((tab) => (
          <Box key={tab.key} marginRight={1}>
            <Text
              color={selected === tab.key ? "cyan" : undefined}
              bold={selected === tab.key}
              dimColor={selected !== tab.key}
            >
              {tab.label}
            </Text>
          </Box>
        ))}
      </Box>
      <Box>
        <Text> </Text>
        {tabs.map((tab) => (
          <Box key={`u-${tab.key}`} marginRight={1}>
            <Text color="cyan">
              {selected === tab.key
                ? "\u2500".repeat(tab.label.length)
                : " ".repeat(tab.label.length)}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {loading ? (
          <Text dimColor>Loading...</Text>
        ) : content.trim() === "" ? (
          <Text dimColor>  No content. Press e to edit.</Text>
        ) : (
          visibleLines.map((line, i) => (
            <Text
              key={scroll + i}
              color={line.startsWith("#") ? "cyan" : undefined}
            >
              {"  "}{line || " "}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
