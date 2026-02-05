import React from "react";
import { Box, Text, useInput, useStdout } from "ink";

type Section =
  | "profile"
  | "preferences"
  | "memory"
  | "permissions"
  | "skills"
  | "agents"
  | "automation";

interface NavigationProps {
  currentSection: Section;
  onSectionChange: (section: Section) => void;
}

const sections: { key: Section; label: string; short: string }[] = [
  { key: "profile", label: "Profile", short: "Prof" },
  { key: "preferences", label: "Preferences", short: "Pref" },
  { key: "memory", label: "Memory", short: "Mem" },
  { key: "permissions", label: "Permissions", short: "Perm" },
  { key: "skills", label: "Skills", short: "Skill" },
  { key: "agents", label: "Agents", short: "Agent" },
  { key: "automation", label: "Automation", short: "Auto" },
];

export function Navigation({
  currentSection,
  onSectionChange,
}: NavigationProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const isNarrow = width < 80;
  const isVeryNarrow = width < 50;

  useInput((input, key) => {
    if (key.tab) {
      const currentIndex = sections.findIndex((s) => s.key === currentSection);
      const nextIndex = key.shift
        ? (currentIndex - 1 + sections.length) % sections.length
        : (currentIndex + 1) % sections.length;
      onSectionChange(sections[nextIndex]!.key);
    }

    // Number keys for quick navigation
    const num = parseInt(input);
    if (num >= 1 && num <= sections.length) {
      onSectionChange(sections[num - 1]!.key);
    }
  });

  // Very narrow: show only current + numbers
  if (isVeryNarrow) {
    const currentIdx = sections.findIndex((s) => s.key === currentSection);
    const current = sections[currentIdx]!;
    return (
      <Box>
        <Text color="green" bold>
          [{currentIdx + 1}/{sections.length}] {current.label}
        </Text>
        <Text color="gray"> (Tab/1-7)</Text>
      </Box>
    );
  }

  // Narrow: use short labels
  if (isNarrow) {
    return (
      <Box flexWrap="wrap">
        {sections.map((section, index) => (
          <Box key={section.key} marginRight={1}>
            <Text
              color={currentSection === section.key ? "green" : "gray"}
              bold={currentSection === section.key}
            >
              {index + 1}.{section.short}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  // Full width: show full labels with indicator
  return (
    <Box flexWrap="wrap">
      {sections.map((section, index) => (
        <Box key={section.key} marginRight={1}>
          <Text
            color={currentSection === section.key ? "green" : "gray"}
            bold={currentSection === section.key}
          >
            {currentSection === section.key ? "▸ " : "  "}
            {index + 1}.{section.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
