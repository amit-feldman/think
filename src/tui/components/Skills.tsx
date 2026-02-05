import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readdir, rename, unlink } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";
import { parseMarkdown } from "../../core/parser";
import { generateUniqueFilename } from "../../core/names";
import { spawn } from "child_process";
import { join } from "path";

interface SkillInfo {
  name: string;
  description: string;
  path: string;
  filename: string;
}

interface SkillsProps {
  height?: number;
}

type Mode = "list" | "rename" | "confirmDelete";

export function Skills({ height = 15 }: SkillsProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    const skillsDir = thinkPath(CONFIG.dirs.skills);

    if (!existsSync(skillsDir)) {
      setSkills([]);
      setLoading(false);
      return;
    }

    const files = await readdir(skillsDir);
    const skillFiles = files.filter((f) => f.endsWith(".md"));

    const skillInfos: SkillInfo[] = [];
    for (const file of skillFiles) {
      const path = join(skillsDir, file);
      try {
        const parsed = await parseMarkdown(path);
        skillInfos.push({
          name: (parsed?.frontmatter?.name as string) || file.replace(".md", ""),
          description: (parsed?.frontmatter?.description as string) || "",
          path,
          filename: file,
        });
      } catch {
        skillInfos.push({
          name: file.replace(".md", ""),
          description: "",
          path,
          filename: file,
        });
      }
    }

    setSkills(skillInfos);
    setLoading(false);
  }

  async function handleRename() {
    const skill = skills[selectedIndex];
    if (!skill || !renameValue.trim()) return;

    const newFilename = renameValue.trim().endsWith(".md")
      ? renameValue.trim()
      : `${renameValue.trim()}.md`;
    const newPath = join(thinkPath(CONFIG.dirs.skills), newFilename);

    try {
      await rename(skill.path, newPath);
      setMode("list");
      setRenameValue("");
      await loadSkills();
    } catch {
      // Failed to rename
    }
  }

  async function handleDelete() {
    const skill = skills[selectedIndex];
    if (!skill) return;

    try {
      await unlink(skill.path);
      setMode("list");
      await loadSkills();
      if (selectedIndex >= skills.length - 1) {
        setSelectedIndex(Math.max(0, skills.length - 2));
      }
    } catch {
      // Failed to delete
    }
  }

  useInput((input, key) => {
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
      setSelectedIndex((i) => Math.min(skills.length - 1, i + 1));
    }
    if (input === "e" && skills[selectedIndex]) {
      const editor = process.env.EDITOR || "vi";
      spawn(editor, [skills[selectedIndex].path], {
        stdio: "inherit",
      }).on("exit", () => {
        loadSkills();
      });
    }
    if (input === "n") {
      const editor = process.env.EDITOR || "vi";
      const existingNames = skills.map((s) => s.filename.replace(".md", ""));
      const newFilename = generateUniqueFilename(existingNames);
      const newPath = thinkPath(CONFIG.dirs.skills, newFilename);
      spawn(editor, [newPath], {
        stdio: "inherit",
      }).on("exit", () => {
        loadSkills();
      });
    }
    if (input === "r" && skills[selectedIndex]) {
      setRenameValue(skills[selectedIndex].filename.replace(".md", ""));
      setMode("rename");
    }
    if (input === "d" && skills[selectedIndex]) {
      setMode("confirmDelete");
    }
  });

  if (loading) {
    return <Text color="gray">Loading...</Text>;
  }

  // Rename mode
  if (mode === "rename") {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="green">Rename Skill</Text>
        </Box>
        <Box>
          <Text color="cyan">New name: </Text>
          <TextInput
            value={renameValue}
            onChange={setRenameValue}
            onSubmit={handleRename}
            placeholder="skill-name"
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter: save | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  // Confirm delete mode
  if (mode === "confirmDelete") {
    const skill = skills[selectedIndex];
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="red">Delete Skill</Text>
        </Box>
        <Box>
          <Text>Delete </Text>
          <Text color="cyan" bold>"{skill?.name}"</Text>
          <Text>?</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="red" bold>y</Text>
          <Text color="gray">: delete | any key: cancel</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">
          Custom Skills
        </Text>
        <Text color="gray"> ({skills.length})</Text>
      </Box>

      {skills.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color="gray">No custom skills. Press 'n' to create one.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" paddingLeft={1}>
          {skills.map((skill, i) => (
            <Box key={skill.path}>
              <Text color={i === selectedIndex ? "green" : undefined}>
                {i === selectedIndex ? "▸ " : "  "}
                {skill.name}
              </Text>
              {skill.description && (
                <Text color="gray"> - {skill.description.slice(0, 50)}{skill.description.length > 50 ? "..." : ""}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">↑↓: select | e: edit | n: new | r: rename | d: delete</Text>
      </Box>
    </Box>
  );
}
