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
          ▀█▀ █░█ █ █▄░█ █▄▀
        </Text>
        <Text color="gray"> Help</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
      >
        <Box flexDirection="row">
          <Box flexDirection="column" marginRight={4}>
            <Text bold color="cyan">Navigation</Text>
            <Text><Text color="green">Tab</Text>         Switch sections</Text>
            <Text><Text color="green">1-7</Text>         Jump to section</Text>
            <Text><Text color="green">←/→</Text>         Sub-sections</Text>
            <Text><Text color="green">↑/↓</Text>         Select item</Text>
          </Box>

          <Box flexDirection="column" marginRight={4}>
            <Text bold color="cyan">Quick Actions</Text>
            <Text><Text color="green">a</Text>           Actions menu</Text>
            <Text><Text color="green">p</Text>           Preview CLAUDE.md</Text>
            <Text><Text color="green">/</Text>           Search</Text>
            <Text><Text color="green">Ctrl+S</Text>      Sync</Text>
          </Box>

          <Box flexDirection="column">
            <Text bold color="cyan">Editing</Text>
            <Text><Text color="green">e</Text>           Edit in $EDITOR</Text>
            <Text><Text color="green">n</Text>           Create new item</Text>
            <Text><Text color="green">Enter</Text>       Select/Open</Text>
            <Text><Text color="green">Esc</Text>         Close modal</Text>
          </Box>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">CLI Commands</Text>
          <Box flexDirection="row">
            <Box flexDirection="column" marginRight={2}>
              <Text color="gray">think init</Text>
              <Text color="gray">think setup</Text>
              <Text color="gray">think sync</Text>
              <Text color="gray">think status</Text>
            </Box>
            <Box flexDirection="column" marginRight={2}>
              <Text color="gray">think learn "..."</Text>
              <Text color="gray">think review</Text>
              <Text color="gray">think profile</Text>
              <Text color="gray">think edit &lt;file&gt;</Text>
            </Box>
            <Box flexDirection="column">
              <Text color="gray">think allow "cmd"</Text>
              <Text color="gray">think tree</Text>
              <Text color="gray">think project learn</Text>
              <Text color="gray">think help</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press ? or Esc to close</Text>
      </Box>
    </Box>
  );
}
