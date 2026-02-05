import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readFile, writeFile } from "fs/promises";
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

type Mode = "view" | "edit" | "confirmDelete";

export function Memory({ height = 15 }: MemoryProps) {
  const [selected, setSelected] = useState<MemorySection>("learnings");
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("view");
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadContent();
    setScroll(0);
    setCursor(0);
    setMode("view");
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

  const contentHeight = height - 4; // extra line for edit/delete UI
  const maxScroll = Math.max(0, items.length - contentHeight);

  // Keep cursor in bounds when items change
  useEffect(() => {
    if (cursor >= items.length && items.length > 0) {
      setCursor(items.length - 1);
    }
  }, [items.length]);

  async function saveItems(newItems: string[]) {
    const section = sections.find((s) => s.key === selected);
    if (!section) return;

    const path = thinkPath(section.path);
    // Rebuild the markdown file with items as bullet points
    const content = newItems.length > 0
      ? newItems.map((item) => `- ${item}`).join("\n") + "\n"
      : "";
    await writeFile(path, content);
    setItems(newItems);
  }

  async function handleDelete() {
    const newItems = items.filter((_, i) => i !== cursor);
    await saveItems(newItems);
    setMode("view");
    if (cursor >= newItems.length && newItems.length > 0) {
      setCursor(newItems.length - 1);
    }
  }

  async function handleEditSubmit(value: string) {
    if (value.trim()) {
      const newItems = [...items];
      newItems[cursor] = value.trim();
      await saveItems(newItems);
    }
    setMode("view");
  }

  useInput((input, key) => {
    // Handle edit mode separately
    if (mode === "edit") {
      if (key.escape) {
        setMode("view");
      }
      return; // TextInput handles the rest
    }

    // Handle confirm delete
    if (mode === "confirmDelete") {
      if (input === "y" || input === "Y") {
        handleDelete();
      } else {
        setMode("view");
      }
      return;
    }
    // View mode navigation
    if (key.leftArrow || input === "h") {
      const idx = sections.findIndex((s) => s.key === selected);
      setSelected(sections[(idx - 1 + sections.length) % sections.length]!.key);
    }
    if (key.rightArrow || input === "l") {
      const idx = sections.findIndex((s) => s.key === selected);
      setSelected(sections[(idx + 1) % sections.length]!.key);
    }
    if (key.upArrow || input === "k") {
      if (cursor > 0) {
        setCursor(cursor - 1);
        // Scroll up if cursor goes above visible area
        if (cursor - 1 < scroll) {
          setScroll(cursor - 1);
        }
      }
    }
    if (key.downArrow || input === "j") {
      if (cursor < items.length - 1) {
        setCursor(cursor + 1);
        // Scroll down if cursor goes below visible area
        if (cursor + 1 >= scroll + contentHeight) {
          setScroll(cursor + 1 - contentHeight + 1);
        }
      }
    }

    // Edit current item
    if (key.return && items.length > 0) {
      setEditValue(items[cursor] || "");
      setMode("edit");
    }

    // Delete current item
    if (input === "d" && items.length > 0) {
      setMode("confirmDelete");
    }

    // Open in $EDITOR
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

  // Confirm delete UI
  if (mode === "confirmDelete") {
    return (
      <Box flexDirection="column" height={height}>
        <Box marginBottom={1}>
          <Text bold color="red">Delete this item?</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="gray">"</Text>
          <Text>{items[cursor]}</Text>
          <Text color="gray">"</Text>
        </Box>
        <Box>
          <Text color="yellow">Press </Text>
          <Text color="green" bold>y</Text>
          <Text color="yellow"> to confirm, any other key to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Edit mode UI
  if (mode === "edit") {
    return (
      <Box flexDirection="column" height={height}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Edit item:</Text>
        </Box>
        <Box>
          <Text color="cyan">▸ </Text>
          <TextInput
            value={editValue}
            onChange={setEditValue}
            onSubmit={handleEditSubmit}
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter: save | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

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
          visibleItems.map((item, i) => {
            const itemIndex = scroll + i;
            const isSelected = itemIndex === cursor;
            return (
              <Text key={itemIndex}>
                <Text color={isSelected ? "cyan" : "green"}>{isSelected ? "▸ " : "• "}</Text>
                <Text color={isSelected ? "white" : undefined} bold={isSelected}>{item}</Text>
              </Text>
            );
          })
        )}
      </Box>

      <Box>
        <Text color="gray">←→: section | ↑↓: select | Enter: edit | d: delete | e: $EDITOR</Text>
      </Box>
    </Box>
  );
}
