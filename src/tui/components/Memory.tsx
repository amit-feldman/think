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

export function Memory() {
  const [selected, setSelected] = useState<MemorySection>("learnings");
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
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

  useInput((input, key) => {
    if (key.leftArrow || input === "h") {
      const idx = sections.findIndex((s) => s.key === selected);
      setSelected(sections[(idx - 1 + sections.length) % sections.length].key);
    }
    if (key.rightArrow || input === "l") {
      const idx = sections.findIndex((s) => s.key === selected);
      setSelected(sections[(idx + 1) % sections.length].key);
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

  return (
    <Box flexDirection="column">
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
      </Box>

      <Box flexDirection="column" paddingLeft={1}>
        {loading ? (
          <Text color="gray">Loading...</Text>
        ) : items.length === 0 ? (
          <Text color="gray">No items</Text>
        ) : (
          items.map((item, i) => (
            <Text key={i}>
              <Text color="green">• </Text>
              {item}
            </Text>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          ←/→: switch | e: edit | {items.length} item(s)
        </Text>
      </Box>
    </Box>
  );
}
