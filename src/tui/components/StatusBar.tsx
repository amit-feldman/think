import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { existsSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { CONFIG, thinkPath } from "../../core/config";
import { extractLearnings } from "../../core/dedup";

interface StatusBarProps {
  message?: string;
}

export function StatusBar({ message }: StatusBarProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [learningsCount, setLearningsCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadStatus() {
    // Count pending
    const pendingPath = thinkPath(CONFIG.files.pending);
    if (existsSync(pendingPath)) {
      const content = await readFile(pendingPath, "utf-8");
      setPendingCount(extractLearnings(content).length);
    }

    // Count learnings
    const learningsPath = thinkPath(CONFIG.files.learnings);
    if (existsSync(learningsPath)) {
      const content = await readFile(learningsPath, "utf-8");
      setLearningsCount(extractLearnings(content).length);
    }

    // Last sync time
    if (existsSync(CONFIG.claudeMdPath)) {
      const stats = statSync(CONFIG.claudeMdPath);
      const ago = formatTimeAgo(stats.mtime);
      setLastSync(ago);
    }
  }

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Box flexGrow={1}>
        {message ? (
          <Text color="yellow">{message}</Text>
        ) : (
          <Text color="gray">Ready</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text color="green">{learningsCount}</Text>
        <Text color="gray"> learnings</Text>
      </Box>
      {pendingCount > 0 && (
        <Box marginLeft={2}>
          <Text color="yellow">{pendingCount}</Text>
          <Text color="gray"> pending</Text>
        </Box>
      )}
      {lastSync && (
        <Box marginLeft={2}>
          <Text color="gray">synced {lastSync}</Text>
        </Box>
      )}
    </Box>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
