import React from "react";
import { Box, Text, useInput } from "ink";

interface HelpProps {
  onClose: () => void;
  height?: number;
  width?: number;
}

export function Help({ onClose, height = 24, width = 80 }: HelpProps) {
  useInput((input, key) => {
    if (input === "?" || key.escape || input === "q") {
      onClose();
    }
  });

  const isNarrow = width < 70;

  return (
    <Box flexDirection="column" padding={1} height={height}>
      <Box marginBottom={1}>
        <Text bold color="green">think</Text>
        <Text color="gray"> · Help</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
        flexGrow={1}
      >
        {isNarrow ? (
          <Box flexDirection="column">
            <Text bold color="cyan">Navigation</Text>
            <Text><Text color="green">Tab</Text> Switch sections</Text>
            <Text><Text color="green">1-7</Text> Jump to section</Text>
            <Text><Text color="green">←/→</Text> Sub-sections</Text>
            <Text><Text color="green">↑↓/jk</Text> Scroll</Text>
            <Text> </Text>
            <Text bold color="cyan">Actions</Text>
            <Text><Text color="green">a</Text> Actions menu</Text>
            <Text><Text color="green">p</Text> Preview</Text>
            <Text><Text color="green">/</Text> Search</Text>
            <Text><Text color="green">e</Text> Edit in $EDITOR</Text>
            <Text><Text color="green">?</Text> Help</Text>
            <Text><Text color="green">q</Text> Quit</Text>
          </Box>
        ) : (
          <Box flexDirection="row">
            <Box flexDirection="column" marginRight={4}>
              <Text bold color="cyan">Navigation</Text>
              <Text><Text color="green">Tab</Text>         Switch sections</Text>
              <Text><Text color="green">1-7</Text>         Jump to section</Text>
              <Text><Text color="green">←/→</Text>         Sub-sections</Text>
              <Text><Text color="green">↑↓/jk</Text>       Scroll content</Text>
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
              <Text><Text color="green">Esc</Text>         Close modal</Text>
              <Text><Text color="green">q</Text>           Quit</Text>
            </Box>
          </Box>
        )}

        <Box marginTop={1} flexDirection="column">
          <Text bold color="cyan">CLI Commands</Text>
          <Text color="gray">think init | setup | sync | status | learn | review | profile | edit | tree | project learn</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press ? or Esc to close</Text>
      </Box>
    </Box>
  );
}
