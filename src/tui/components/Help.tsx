import React from "react";
import { Box, Text, useInput } from "ink";

interface HelpProps {
  onClose: () => void;
}

export function Help({ onClose }: HelpProps) {
  useInput((input, key) => {
    if (input === "?" || key.escape || input === "q") {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          Keyboard Shortcuts
        </Text>
      </Box>

      <Box flexDirection="column" paddingLeft={1}>
        <Text key="nav-header" bold color="cyan">Navigation</Text>
        <Text key="nav-1">  Tab / Shift+Tab   Switch sections</Text>
        <Text key="nav-2">  1-7               Jump to section</Text>
        <Text key="nav-3">  ← / →             Switch sub-sections</Text>
        <Text key="nav-4">  ↑ / ↓             Select item in list</Text>
        <Text key="nav-spacer"> </Text>

        <Text key="act-header" bold color="cyan">Actions</Text>
        <Text key="act-1">  e                 Edit in $EDITOR</Text>
        <Text key="act-2">  n                 Create new (skills/agents)</Text>
        <Text key="act-3">  Enter             Select / Open</Text>
        <Text key="act-spacer"> </Text>

        <Text key="gen-header" bold color="cyan">General</Text>
        <Text key="gen-1">  ?                 Toggle help</Text>
        <Text key="gen-2">  q / Ctrl+C        Quit</Text>
        <Text key="gen-spacer"> </Text>

        <Text key="cli-header" bold color="cyan">CLI Commands</Text>
        <Text key="cli-1">  think init        Initialize ~/.think</Text>
        <Text key="cli-2">  think sync        Sync to Claude plugin</Text>
        <Text key="cli-3">  think status      Show status</Text>
        <Text key="cli-4">  think learn       Add a learning</Text>
        <Text key="cli-5">  think review      Review pending learnings</Text>
        <Text key="cli-6">  think allow       Add allowed command</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press ? or Escape to close</Text>
      </Box>
    </Box>
  );
}
