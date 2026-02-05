import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";
import { extractLearnings } from "../../core/dedup";
import { spawn } from "child_process";

type MemorySection = "learnings" | "corrections" | "pending";

const sections: { key: MemorySection; label: string; path: string }[] = [
  { key: "learnings", label: "Learnings", path: CONFIG.files.learnings },
  { key: "corrections", label: "Corrections", path: CONFIG.files.corrections },
  { key: "pending", label: "Pending", path: CONFIG.files.pending },
];

interface MemoryProps {
  height?: number;
}

export function Memory({ height = 15 }: MemoryProps) {
  const [selected, setSelected] = useState<MemorySection>("learnings");
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    loadContent();
    setScroll(0);
  }, [selected]);

  async function loadContent() {
    setLoading(true);
    const section = sections.find((s) => s.key === selected);
    if (section) {
      const path = thinkPath(section.path);
      if (existsSync(path)) {
        const content = await readFile(path, "utf-8");
        setItems(extractLearnings(content));
      } else {
        setItems([]);
      }
    }
    setLoading(false);
  }

  const contentHeight = height - 3;
  const maxScroll = Math.max(0, items.length - contentHeight);

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      const idx = sections.findIndex((s) => s.key === selected);
      setSelected(sections[(idx - 1 + sections.length) % sections.length]!.key);
    }
    if (key.rightArrow || input === "l") {
      const idx = sections.findIndex((s) => s.key === selected);
      setSelected(sections[(idx + 1) % sections.length]!.key);
    }
    if (key.upArrow || input === "k") {
      setScroll((s) => Math.max(0, s - 1));
    }
    if (key.downArrow || input === "j") {
      setScroll((s) => Math.min(maxScroll, s + 1));
    }
    if (input === "e") {
      const section = sections.find((s) => s.key === selected);
      if (section) {
        const editor = process.env.EDITOR || "vi";
        spawn(editor, [thinkPath(section.path)], {
          stdio: "inherit",
        }).on("exit", () => {
          loadContent();
        });
      }
    }
  });

  const visibleItems = items.slice(scroll, scroll + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      <Box marginBottom={1}>
        {sections.map((section) => (
          <Box key={section.key} marginRight={2}>
            <Text
              color={selected === section.key ? "green" : "gray"}
              bold={selected === section.key}
            >
              {selected === section.key ? "▸ " : "  "}
              {section.label}
            </Text>
          </Box>
        ))}
        <Text color="gray">({items.length})</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {loading ? (
          <Text color="gray">Loading...</Text>
        ) : items.length === 0 ? (
          <Text color="gray">No items</Text>
        ) : (
          visibleItems.map((item, i) => (
            <Text key={scroll + i}>
              <Text color="green">• </Text>
              {item}
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
