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

  const isNarrow = width < 80;

  return (
    <Box flexDirection="column" padding={1} height={height}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>think</Text>
        <Text dimColor> {"\u00b7"} Help</Text>
      </Box>

      {isNarrow ? (
        <Box flexDirection="column">
          <Text bold color="cyan">Navigation</Text>
          <Text>  <Text color="cyan">Tab</Text>       Switch sections</Text>
          <Text>  <Text color="cyan">1-6</Text>       Jump to section</Text>
          <Text>  <Text color="cyan">{"\u2190/\u2192"}</Text>       Sub-sections</Text>
          <Text>  <Text color="cyan">{"\u2191\u2193/jk"}</Text>     Scroll</Text>
          <Text> </Text>
          <Text bold color="cyan">Actions</Text>
          <Text>  <Text color="cyan">s</Text>         Sync CLAUDE.md</Text>
          <Text>  <Text color="cyan">p</Text>         Preview CLAUDE.md</Text>
          <Text>  <Text color="cyan">/</Text>         Search</Text>
          <Text>  <Text color="cyan">P</Text>         Switch profile</Text>
          <Text>  <Text color="cyan">?</Text>         Help</Text>
          <Text> </Text>
          <Text bold color="cyan">Editing</Text>
          <Text>  <Text color="cyan">e</Text>         Edit in $EDITOR</Text>
          <Text>  <Text color="cyan">n</Text>         Create new item</Text>
          <Text>  <Text color="cyan">d</Text>         Delete</Text>
          <Text>  <Text color="cyan">c</Text>         Duplicate</Text>
          <Text>  <Text color="cyan">r</Text>         Rename</Text>
          <Text>  <Text color="cyan">q</Text>         Quit</Text>
        </Box>
      ) : (
        <Box flexDirection="row">
          <Box flexDirection="column" marginRight={4} width={28}>
            <Text bold color="cyan">Navigation</Text>
            <Text>  <Text color="cyan">Tab</Text>       Switch sections</Text>
            <Text>  <Text color="cyan">1-6</Text>       Jump to section</Text>
            <Text>  <Text color="cyan">{"\u2190/\u2192"}</Text>       Sub-sections</Text>
            <Text>  <Text color="cyan">{"\u2191\u2193/jk"}</Text>     Scroll content</Text>
          </Box>

          <Box flexDirection="column" marginRight={4} width={28}>
            <Text bold color="cyan">Actions</Text>
            <Text>  <Text color="cyan">s</Text>         Sync CLAUDE.md</Text>
            <Text>  <Text color="cyan">p</Text>         Preview CLAUDE.md</Text>
            <Text>  <Text color="cyan">/</Text>         Search</Text>
            <Text>  <Text color="cyan">P</Text>         Switch profile</Text>
            <Text>  <Text color="cyan">?</Text>         Help</Text>
          </Box>

          <Box flexDirection="column" width={28}>
            <Text bold color="cyan">Editing</Text>
            <Text>  <Text color="cyan">e</Text>         Edit in $EDITOR</Text>
            <Text>  <Text color="cyan">n</Text>         Create new item</Text>
            <Text>  <Text color="cyan">d</Text>         Delete</Text>
            <Text>  <Text color="cyan">c</Text>         Duplicate</Text>
            <Text>  <Text color="cyan">r</Text>         Rename</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">CLI Commands</Text>
        <Text dimColor>  think setup | switch | context | learn | status</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press ? or Esc to close</Text>
      </Box>
    </Box>
  );
}
