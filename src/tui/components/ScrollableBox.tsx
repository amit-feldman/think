import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

interface ScrollableBoxProps {
  children: React.ReactNode;
  height: number;
  showScrollbar?: boolean;
}

export function ScrollableBox({
  children,
  height,
  showScrollbar = true,
}: ScrollableBoxProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  // Convert children to array of lines for scrolling
  const lines = React.Children.toArray(children);
  const maxScroll = Math.max(0, lines.length - height);

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setScrollOffset((s) => Math.max(0, s - 1));
    }
    if (key.downArrow || input === "j") {
      setScrollOffset((s) => Math.min(maxScroll, s + 1));
    }
    if (key.pageUp) {
      setScrollOffset((s) => Math.max(0, s - height));
    }
    if (key.pageDown) {
      setScrollOffset((s) => Math.min(maxScroll, s + height));
    }
  });

  const visibleLines = lines.slice(scrollOffset, scrollOffset + height);
  const scrollPercent =
    maxScroll > 0 ? Math.round((scrollOffset / maxScroll) * 100) : 100;

  return (
    <Box flexDirection="row" height={height}>
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines}
        {/* Pad remaining space */}
        {Array.from({ length: height - visibleLines.length }).map((_, i) => (
          <Text key={`pad-${i}`}> </Text>
        ))}
      </Box>
      {showScrollbar && maxScroll > 0 && (
        <Box flexDirection="column" marginLeft={1}>
          <Text color="gray">{scrollPercent.toString().padStart(3)}%</Text>
        </Box>
      )}
    </Box>
  );
}
