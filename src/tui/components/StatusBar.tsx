import React from "react";
import { Box, Text, useStdout } from "ink";
import type { Section } from "./Navigation.tsx";

interface StatusBarProps {
  message?: string;
  section?: Section;
}

export function StatusBar({ message, section }: StatusBarProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const isNarrow = width < 80;

  // Toast message overrides shortcuts
  if (message) {
    return (
      <Box>
        <Text color="yellow">{message}</Text>
      </Box>
    );
  }

  // Context-aware shortcuts based on section
  const sectionShortcuts: Record<string, string> = {
    profile: isNarrow
      ? "e edit"
      : "e edit in $EDITOR",
    preferences: isNarrow
      ? "e edit · ←→ switch"
      : "e edit · ←/→ switch tab",
    memory: isNarrow
      ? "e edit · n new · d delete"
      : "e edit · n new · d delete",
    skills: isNarrow
      ? "e edit · n new · d delete · r rename"
      : "e edit · n new · d delete · c duplicate · r rename",
    agents: isNarrow
      ? "e edit · n new · d delete · r rename"
      : "e edit · n new · d delete · c duplicate · r rename",
    automation: isNarrow
      ? "e edit · ←→ switch"
      : "e edit · ←/→ switch tab",
  };

  const sectionHints = section ? sectionShortcuts[section] ?? "" : "";

  if (isNarrow) {
    return (
      <Box>
        <Text dimColor>
          {"↑↓ nav · "}{sectionHints}{" · / search · ? help · q quit"}
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text dimColor>
        {"↑↓ navigate · "}{sectionHints}{" · s sync · p preview · / search · ? help · q quit"}
      </Text>
    </Box>
  );
}
