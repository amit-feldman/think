import React from "react";
import { Box, Text, useStdout } from "ink";

type Section =
  | "profile"
  | "preferences"
  | "memory"
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
  { key: "skills", label: "Skills", short: "Skill" },
  { key: "agents", label: "Agents", short: "Agent" },
  { key: "automation", label: "Automation", short: "Auto" },
];

export { sections };
export type { Section };

export function Navigation({
  currentSection,
  onSectionChange,
}: NavigationProps) {
  const { stdout } = useStdout();
  const width = stdout?.columns ?? 80;
  const isNarrow = width < 80;
  const isVeryNarrow = width < 50;

  // Very narrow: show only current + numbers
  if (isVeryNarrow) {
    const currentIdx = sections.findIndex((s) => s.key === currentSection);
    const current = sections[currentIdx];
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="cyan" bold>
            [{currentIdx + 1}/{sections.length}] {current?.label}
          </Text>
          <Text dimColor> (Tab/1-6)</Text>
        </Box>
      </Box>
    );
  }

  // Build the underline
  const activeIdx = sections.findIndex((s) => s.key === currentSection);

  if (isNarrow) {
    // Narrow: short labels
    let underline = "";
    let pos = 1; // leading space
    sections.forEach((section, index) => {
      const label = section.short;
      if (index === activeIdx) {
        underline += "\u2500".repeat(label.length);
      } else {
        underline += " ".repeat(label.length);
      }
      if (index < sections.length - 1) {
        underline += "   "; // margin between tabs
      }
    });

    return (
      <Box flexDirection="column">
        <Box>
          <Text> </Text>
          {sections.map((section, index) => (
            <Box key={section.key} marginRight={1}>
              <Text
                color={currentSection === section.key ? "cyan" : undefined}
                bold={currentSection === section.key}
                dimColor={currentSection !== section.key}
              >
                {section.short}
              </Text>
            </Box>
          ))}
        </Box>
        <Box>
          <Text> </Text>
          {sections.map((section, index) => (
            <Box key={`u-${section.key}`} marginRight={1}>
              <Text color="cyan">
                {currentSection === section.key
                  ? "\u2500".repeat(section.short.length)
                  : " ".repeat(section.short.length)}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // Full width: full labels with underline
  return (
    <Box flexDirection="column">
      <Box>
        <Text> </Text>
        {sections.map((section) => (
          <Box key={section.key} marginRight={1}>
            <Text
              color={currentSection === section.key ? "cyan" : undefined}
              bold={currentSection === section.key}
              dimColor={currentSection !== section.key}
            >
              {section.label}
            </Text>
          </Box>
        ))}
      </Box>
      <Box>
        <Text> </Text>
        {sections.map((section) => (
          <Box key={`u-${section.key}`} marginRight={1}>
            <Text color="cyan">
              {currentSection === section.key
                ? "\u2500".repeat(section.label.length)
                : " ".repeat(section.label.length)}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
