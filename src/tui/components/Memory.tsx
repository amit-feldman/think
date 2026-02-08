import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config.ts";
import { extractLearnings, addLearning } from "../../core/dedup.ts";
import { spawn } from "child_process";

interface MemoryProps {
  height?: number;
  isActive?: boolean;
}

type Mode = "view" | "add" | "confirmDelete";

export function Memory({ height = 15, isActive = true }: MemoryProps) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scroll, setScroll] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("view");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    setLoading(true);
    const path = thinkPath(CONFIG.files.learnings);
    if (existsSync(path)) {
      const content = await readFile(path, "utf-8");
      setItems(extractLearnings(content));
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  const contentHeight = Math.max(3, height - 3);
  const maxScroll = Math.max(0, items.length - contentHeight);

  useEffect(() => {
    if (cursor >= items.length && items.length > 0) {
      setCursor(items.length - 1);
    }
  }, [items.length]);

  async function saveItems(newItems: string[]) {
    const path = thinkPath(CONFIG.files.learnings);
    const content =
      newItems.length > 0
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

  async function handleAdd(value: string) {
    if (!value.trim()) {
      setMode("view");
      setNewValue("");
      return;
    }

    const path = thinkPath(CONFIG.files.learnings);
    let content = "";
    if (existsSync(path)) {
      content = await readFile(path, "utf-8");
    }

    const result = addLearning(content, value.trim());
    if (result.added) {
      await writeFile(path, result.newContent);
    }

    setNewValue("");
    setMode("view");
    await loadContent();
  }

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        if (cursor > 0) {
          setCursor(cursor - 1);
          if (cursor - 1 < scroll) {
            setScroll(cursor - 1);
          }
        }
      }
      if (key.downArrow || input === "j") {
        if (cursor < items.length - 1) {
          setCursor(cursor + 1);
          if (cursor + 1 >= scroll + contentHeight) {
            setScroll(cursor + 1 - contentHeight + 1);
          }
        }
      }

      if (input === "d" && items.length > 0) {
        setMode("confirmDelete");
      }

      if (input === "n") {
        setNewValue("");
        setMode("add");
      }

      if (input === "e") {
        const editor = process.env.EDITOR || "vi";
        spawn(editor, [thinkPath(CONFIG.files.learnings)], {
          stdio: "inherit",
        }).on("exit", () => {
          loadContent();
        });
      }
    },
    { isActive: isActive && mode === "view" },
  );

  useInput(
    (_input, key) => {
      if (mode === "add" && key.escape) {
        setMode("view");
        setNewValue("");
      }
    },
    { isActive: isActive && mode === "add" },
  );

  useInput(
    (input) => {
      if (mode === "confirmDelete") {
        if (input === "y" || input === "Y") {
          handleDelete();
        } else {
          setMode("view");
        }
      }
    },
    { isActive: isActive && mode === "confirmDelete" },
  );

  if (mode === "confirmDelete") {
    return (
      <Box flexDirection="column" height={height}>
        <Box marginBottom={1}>
          <Text bold color="red">Delete this learning?</Text>
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>"</Text>
          <Text>{items[cursor]}</Text>
          <Text dimColor>"</Text>
        </Box>
        <Box>
          <Text color="yellow">Press </Text>
          <Text color="green" bold>y</Text>
          <Text color="yellow"> to confirm, any other key to cancel</Text>
        </Box>
      </Box>
    );
  }

  const visibleItems = items.slice(scroll, scroll + contentHeight);

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <Box>
        <Text color="cyan" bold> Learnings</Text>
        <Text dimColor> ({items.length})</Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {loading ? (
          <Text dimColor>Loading...</Text>
        ) : items.length === 0 ? (
          <Box>
            <Text dimColor>  No learnings yet.</Text>
            <Text dimColor> Press </Text>
            <Text color="cyan">n</Text>
            <Text dimColor> to add one.</Text>
          </Box>
        ) : (
          visibleItems.map((item, i) => {
            const itemIndex = scroll + i;
            const isSelected = itemIndex === cursor;
            return (
              <Text key={itemIndex}>
                <Text color={isSelected ? "cyan" : undefined} dimColor={!isSelected}>
                  {isSelected ? "  \u25b8 " : "  \u2022 "}
                </Text>
                <Text color={isSelected ? "white" : undefined} bold={isSelected}>
                  {item}
                </Text>
              </Text>
            );
          })
        )}
      </Box>

      {/* Add new learning input */}
      {mode === "add" && (
        <Box marginTop={1}>
          <Text color="cyan">  + </Text>
          <TextInput
            value={newValue}
            onChange={setNewValue}
            onSubmit={handleAdd}
            placeholder="Type new learning and press Enter..."
          />
        </Box>
      )}
    </Box>
  );
}
