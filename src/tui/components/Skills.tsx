import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";
import { parseMarkdown } from "../../core/parser";
import { spawn } from "child_process";
import { join } from "path";

interface SkillInfo {
  name: string;
  description: string;
  path: string;
}

export function Skills() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const parsed = await parseMarkdown(path);
      skillInfos.push({
        name: (parsed?.frontmatter.name as string) || file.replace(".md", ""),
        description: (parsed?.frontmatter.description as string) || "",
        path,
      });
    }

    setSkills(skillInfos);
    setLoading(false);
  }

  useInput((input, key) => {
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
      // Create new skill
      const editor = process.env.EDITOR || "vi";
      const newPath = thinkPath(CONFIG.dirs.skills, "new-skill.md");
      spawn(editor, [newPath], {
        stdio: "inherit",
      }).on("exit", () => {
        loadSkills();
      });
    }
  });

  if (loading) {
    return <Text color="gray">Loading...</Text>;
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
                <Text color="gray"> - {skill.description}</Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">↑/↓: select | e: edit | n: new</Text>
      </Box>
    </Box>
  );
}
