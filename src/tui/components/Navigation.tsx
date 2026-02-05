import React from "react";
import { Box, Text, useInput } from "ink";

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

const sections: { key: Section; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "preferences", label: "Preferences" },
  { key: "memory", label: "Memory" },
  { key: "permissions", label: "Permissions" },
  { key: "skills", label: "Skills" },
  { key: "agents", label: "Agents" },
  { key: "automation", label: "Automation" },
];

export function Navigation({
  currentSection,
  onSectionChange,
}: NavigationProps) {
  useInput((input, key) => {
    if (key.tab) {
      const currentIndex = sections.findIndex((s) => s.key === currentSection);
      const nextIndex = key.shift
        ? (currentIndex - 1 + sections.length) % sections.length
        : (currentIndex + 1) % sections.length;
      onSectionChange(sections[nextIndex].key);
    }

    // Number keys for quick navigation
    const num = parseInt(input);
    if (num >= 1 && num <= sections.length) {
      onSectionChange(sections[num - 1].key);
    }
  });

  return (
    <Box>
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
