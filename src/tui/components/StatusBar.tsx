import React, { useState, useEffect } from "react";
import { Box, Text, useStdout } from "ink";
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
  const [tokenEstimate, setTokenEstimate] = useState<number | null>(null);

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

    // Last sync time and token estimate
    if (existsSync(CONFIG.claudeMdPath)) {
      const stats = statSync(CONFIG.claudeMdPath);
      const ago = formatTimeAgo(stats.mtime);
      setLastSync(ago);

      // Estimate tokens (~4 chars per token)
      const content = await readFile(CONFIG.claudeMdPath, "utf-8");
      setTokenEstimate(Math.ceil(content.length / 4));
    }
  }

  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const isNarrow = width < 60;

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Box flexGrow={1}>
        {message ? (
          <Text color="yellow">{message}</Text>
        ) : (
          <Text color="gray">Ready</Text>
        )}
      </Box>
      <Box marginLeft={1}>
        <Text color="green">{learningsCount}</Text>
        <Text color="gray">{isNarrow ? "L" : " learnings"}</Text>
      </Box>
      {pendingCount > 0 && (
        <Box marginLeft={1}>
          <Text color="yellow">{pendingCount}</Text>
          <Text color="gray">{isNarrow ? "P" : " pending"}</Text>
        </Box>
      )}
      {tokenEstimate !== null && (
        <Box marginLeft={1}>
          <Text color="magenta">~{formatTokens(tokenEstimate)}</Text>
          <Text color="gray">{isNarrow ? "t" : " tokens"}</Text>
        </Box>
      )}
      {lastSync && !isNarrow && (
        <Box marginLeft={1}>
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

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}
