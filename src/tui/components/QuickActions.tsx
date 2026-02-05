import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { generatePlugin } from "../../core/generator";
import { addLearning } from "../../core/dedup";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";

interface QuickActionsProps {
  onMessage: (msg: string) => void;
  onClose: () => void;
}

type Action = "menu" | "sync" | "learn" | "search";

export function QuickActions({ onMessage, onClose }: QuickActionsProps) {
  const [action, setAction] = useState<Action>("menu");
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(0);

  const menuItems = [
    { key: "s", label: "Sync", desc: "Regenerate CLAUDE.md" },
    { key: "l", label: "Learn", desc: "Add a new learning" },
    { key: "f", label: "Search", desc: "Search all files" },
  ];

  useInput((key, mod) => {
    if (mod.escape || key === "q") {
      if (action === "menu") {
        onClose();
      } else {
        setAction("menu");
        setInput("");
      }
      return;
    }

    if (action === "menu") {
      if (mod.upArrow || key === "k") {
        setSelected((s) => (s - 1 + menuItems.length) % menuItems.length);
      }
      if (mod.downArrow || key === "j") {
        setSelected((s) => (s + 1) % menuItems.length);
      }
      if (mod.return) {
        const item = menuItems[selected]!;
        if (item.key === "s") handleSync();
        else if (item.key === "l") setAction("learn");
        else if (item.key === "f") setAction("search");
      }
      // Quick keys
      if (key === "s") handleSync();
      if (key === "l") setAction("learn");
      if (key === "f") setAction("search");
    }
  });

  async function handleSync() {
    onMessage("Syncing...");
    try {
      await generatePlugin();
      onMessage("Synced successfully!");
    } catch (e) {
      onMessage("Sync failed!");
    }
    setTimeout(onClose, 1500);
  }

  async function handleLearn() {
    if (!input.trim()) return;

    const learningsPath = thinkPath(CONFIG.files.learnings);
    let content = "";
    if (existsSync(learningsPath)) {
      content = await readFile(learningsPath, "utf-8");
    }

    const result = addLearning(content, input.trim());
    if (result.added) {
      await writeFile(learningsPath, result.newContent);
      onMessage(`Added: "${input.trim()}"`);
      await generatePlugin();
    } else {
      onMessage(`Similar exists: "${result.similar}"`);
    }
    setInput("");
    setTimeout(onClose, 1500);
  }

  if (action === "menu") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
        <Text bold color="green">Quick Actions</Text>
        <Box flexDirection="column" marginTop={1}>
          {menuItems.map((item, i) => (
            <Box key={item.key}>
              <Text color={i === selected ? "green" : "gray"}>
                {i === selected ? "▸ " : "  "}
              </Text>
              <Text color={i === selected ? "white" : "gray"} bold={i === selected}>
                [{item.key}] {item.label}
              </Text>
              <Text color="gray"> - {item.desc}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">↑↓: navigate | Enter: select | Esc: close</Text>
        </Box>
      </Box>
    );
  }

  if (action === "learn") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
        <Text bold color="yellow">Add Learning</Text>
        <Box marginTop={1}>
          <Text color="gray">▸ </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleLearn}
            placeholder="Type your learning..."
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter: add | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  if (action === "search") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">Search</Text>
        <Box marginTop={1}>
          <Text color="gray">▸ </Text>
          <TextInput
            value={input}
            onChange={setInput}
            placeholder="Search term..."
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter: search | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
