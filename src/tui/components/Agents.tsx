import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";
import { parseMarkdown } from "../../core/parser";
import { spawn } from "child_process";
import { join } from "path";

interface AgentInfo {
  name: string;
  description: string;
  path: string;
}

interface AgentsProps {
  height?: number;
}

export function Agents({ height = 15 }: AgentsProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const parsed = await parseMarkdown(path);
      agentInfos.push({
        name: (parsed?.frontmatter.name as string) || file.replace(".md", ""),
        description: (parsed?.frontmatter.description as string) || "",
        path,
      });
    }

    setAgents(agentInfos);
    setLoading(false);
  }

  useInput((input, key) => {
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
      const newPath = thinkPath(CONFIG.dirs.agents, "new-agent.md");
      spawn(editor, [newPath], {
        stdio: "inherit",
      }).on("exit", () => {
        loadAgents();
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
                <Text color="gray"> - {agent.description}</Text>
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
