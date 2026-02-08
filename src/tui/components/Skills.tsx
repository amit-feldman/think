import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readdir, rename, unlink, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config.ts";
import { parseMarkdown } from "../../core/parser.ts";
import { generateUniqueFilename } from "../../core/names.ts";
import { spawn } from "child_process";
import { join } from "path";

interface ItemInfo {
  name: string;
  description: string;
  trigger: string;
  path: string;
  filename: string;
}

interface SkillsProps {
  height?: number;
  isActive?: boolean;
}

type Mode = "list" | "rename" | "confirmDelete";

export function Skills({ height = 15, isActive = true }: SkillsProps) {
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const dir = thinkPath(CONFIG.dirs.skills);

    if (!existsSync(dir)) {
      setItems([]);
      setLoading(false);
      return;
    }

    const files = await readdir(dir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const infos: ItemInfo[] = [];
    for (const file of mdFiles) {
      const path = join(dir, file);
      try {
        const parsed = await parseMarkdown(path);
        infos.push({
          name: (parsed?.frontmatter?.name as string) || file.replace(".md", ""),
          description: (parsed?.frontmatter?.description as string) || "",
          trigger: (parsed?.frontmatter?.trigger as string) || "",
          path,
          filename: file,
        });
      } catch {
        infos.push({
          name: file.replace(".md", ""),
          description: "",
          trigger: "",
          path,
          filename: file,
        });
      }
    }

    setItems(infos);
    setLoading(false);
  }

  async function handleRename() {
    const item = items[selectedIndex];
    if (!item || !renameValue.trim()) return;

    const newFilename = renameValue.trim().endsWith(".md")
      ? renameValue.trim()
      : `${renameValue.trim()}.md`;
    const newPath = join(thinkPath(CONFIG.dirs.skills), newFilename);

    try {
      await rename(item.path, newPath);
      setMode("list");
      setRenameValue("");
      await loadItems();
    } catch {
      // Failed to rename
    }
  }

  async function handleDelete() {
    const item = items[selectedIndex];
    if (!item) return;

    try {
      await unlink(item.path);
      setMode("list");
      await loadItems();
      if (selectedIndex >= items.length - 1) {
        setSelectedIndex(Math.max(0, items.length - 2));
      }
    } catch {
      // Failed to delete
    }
  }

  async function handleDuplicate() {
    const item = items[selectedIndex];
    if (!item) return;

    const existingNames = items.map((s) => s.filename.replace(".md", ""));
    const newFilename = generateUniqueFilename(existingNames);
    const newPath = join(thinkPath(CONFIG.dirs.skills), newFilename);

    try {
      await copyFile(item.path, newPath);
      await loadItems();
    } catch {
      // Failed to duplicate
    }
  }

  useInput(
    (input, key) => {
      // Rename mode
      if (mode === "rename") {
        if (key.escape) {
          setMode("list");
          setRenameValue("");
        }
        return;
      }

      // Confirm delete mode
      if (mode === "confirmDelete") {
        if (input === "y" || input === "Y") {
          handleDelete();
        } else {
          setMode("list");
        }
        return;
      }

      // List mode
      if (key.upArrow || input === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow || input === "j") {
        setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
      }
      if (input === "e" && items[selectedIndex]) {
        const editor = process.env.EDITOR || "vi";
        spawn(editor, [items[selectedIndex].path], {
          stdio: "inherit",
        }).on("exit", () => {
          loadItems();
        });
      }
      if (input === "n") {
        const editor = process.env.EDITOR || "vi";
        const existingNames = items.map((s) => s.filename.replace(".md", ""));
        const newFilename = generateUniqueFilename(existingNames);
        const newPath = thinkPath(CONFIG.dirs.skills, newFilename);
        spawn(editor, [newPath], {
          stdio: "inherit",
        }).on("exit", () => {
          loadItems();
        });
      }
      if (input === "r" && items[selectedIndex]) {
        setRenameValue(items[selectedIndex].filename.replace(".md", ""));
        setMode("rename");
      }
      if (input === "d" && items[selectedIndex]) {
        setMode("confirmDelete");
      }
      if (input === "c" && items[selectedIndex]) {
        handleDuplicate();
      }
    },
    { isActive },
  );

  if (loading) {
    return <Text dimColor>Loading...</Text>;
  }

  // Rename mode
  if (mode === "rename") {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">Rename Skill</Text>
        </Box>
        <Box>
          <Text color="cyan">  New name: </Text>
          <TextInput
            value={renameValue}
            onChange={setRenameValue}
            onSubmit={handleRename}
            placeholder="skill-name"
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>  Enter: save | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  // Confirm delete mode
  if (mode === "confirmDelete") {
    const item = items[selectedIndex];
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="red">  Delete Skill</Text>
        </Box>
        <Box>
          <Text>  Delete </Text>
          <Text color="cyan" bold>"{item?.name}"</Text>
          <Text>?</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="red" bold>  y</Text>
          <Text dimColor>: delete | any key: cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {"  "}Custom Skills
        </Text>
        <Text dimColor> ({items.length})</Text>
      </Box>

      {items.length === 0 ? (
        <Box>
          <Text dimColor>  No skills yet. Press </Text>
          <Text color="cyan">n</Text>
          <Text dimColor> to create your first.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {items.map((item, i) => (
            <Box key={item.path} flexDirection="column">
              <Box>
                <Text color={i === selectedIndex ? "cyan" : undefined}>
                  {i === selectedIndex ? "  \u25b8 " : "    "}
                </Text>
                <Text
                  color={i === selectedIndex ? "white" : undefined}
                  bold={i === selectedIndex}
                >
                  {item.name}
                </Text>
                {item.description && (
                  <Text dimColor>
                    {"  "}
                    {item.description.slice(0, 50)}
                    {item.description.length > 50 ? "..." : ""}
                  </Text>
                )}
              </Box>
              {i === selectedIndex && item.trigger && (
                <Box>
                  <Text>      </Text>
                  <Text color="yellow">when: </Text>
                  <Text dimColor>{item.trigger}</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
