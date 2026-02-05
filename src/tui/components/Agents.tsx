import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readdir, rename, unlink } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";
import { parseMarkdown } from "../../core/parser";
import { generateUniqueFilename } from "../../core/names";
import { spawn } from "child_process";
import { join, basename } from "path";

interface AgentInfo {
  name: string;
  description: string;
  path: string;
  filename: string;
}

interface AgentsProps {
  height?: number;
}

type Mode = "list" | "rename" | "confirmDelete";

export function Agents({ height = 15 }: AgentsProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    const agentsDir = thinkPath(CONFIG.dirs.agents);

    if (!existsSync(agentsDir)) {
      setAgents([]);
      setLoading(false);
      return;
    }

    const files = await readdir(agentsDir);
    const agentFiles = files.filter((f) => f.endsWith(".md"));

    const agentInfos: AgentInfo[] = [];
    for (const file of agentFiles) {
      const path = join(agentsDir, file);
      try {
        const parsed = await parseMarkdown(path);
        agentInfos.push({
          name: (parsed?.frontmatter?.name as string) || file.replace(".md", ""),
          description: (parsed?.frontmatter?.description as string) || "",
          path,
          filename: file,
        });
      } catch {
        agentInfos.push({
          name: file.replace(".md", ""),
          description: "",
          path,
          filename: file,
        });
      }
    }

    setAgents(agentInfos);
    setLoading(false);
  }

  async function handleRename() {
    const agent = agents[selectedIndex];
    if (!agent || !renameValue.trim()) return;

    const newFilename = renameValue.trim().endsWith(".md")
      ? renameValue.trim()
      : `${renameValue.trim()}.md`;
    const newPath = join(thinkPath(CONFIG.dirs.agents), newFilename);

    try {
      await rename(agent.path, newPath);
      setMode("list");
      setRenameValue("");
      await loadAgents();
    } catch {
      // Failed to rename
    }
  }

  async function handleDelete() {
    const agent = agents[selectedIndex];
    if (!agent) return;

    try {
      await unlink(agent.path);
      setMode("list");
      await loadAgents();
      if (selectedIndex >= agents.length - 1) {
        setSelectedIndex(Math.max(0, agents.length - 2));
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
      setSelectedIndex((i) => Math.min(agents.length - 1, i + 1));
    }
    if (input === "e" && agents[selectedIndex]) {
      const editor = process.env.EDITOR || "vi";
      spawn(editor, [agents[selectedIndex].path], {
        stdio: "inherit",
      }).on("exit", () => {
        loadAgents();
      });
    }
    if (input === "n") {
      const editor = process.env.EDITOR || "vi";
      const existingNames = agents.map((a) => a.filename.replace(".md", ""));
      const newFilename = generateUniqueFilename(existingNames);
      const newPath = thinkPath(CONFIG.dirs.agents, newFilename);
      spawn(editor, [newPath], {
        stdio: "inherit",
      }).on("exit", () => {
        loadAgents();
      });
    }
    if (input === "r" && agents[selectedIndex]) {
      setRenameValue(agents[selectedIndex].filename.replace(".md", ""));
      setMode("rename");
    }
    if (input === "d" && agents[selectedIndex]) {
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
          <Text bold color="green">Rename Agent</Text>
        </Box>
        <Box>
          <Text color="cyan">New name: </Text>
          <TextInput
            value={renameValue}
            onChange={setRenameValue}
            onSubmit={handleRename}
            placeholder="agent-name"
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
    const agent = agents[selectedIndex];
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="red">Delete Agent</Text>
        </Box>
        <Box>
          <Text>Delete </Text>
          <Text color="cyan" bold>"{agent?.name}"</Text>
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
          Custom Agents
        </Text>
        <Text color="gray"> ({agents.length})</Text>
      </Box>

      {agents.length === 0 ? (
        <Box paddingLeft={1}>
          <Text color="gray">No custom agents. Press 'n' to create one.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" paddingLeft={1}>
          {agents.map((agent, i) => (
            <Box key={agent.path}>
              <Text color={i === selectedIndex ? "green" : undefined}>
                {i === selectedIndex ? "▸ " : "  "}
                {agent.name}
              </Text>
              {agent.description && (
                <Text color="gray"> - {agent.description.slice(0, 50)}{agent.description.length > 50 ? "..." : ""}</Text>
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
