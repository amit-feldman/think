import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { parseMarkdown } from "../../core/parser";
import { thinkPath, CONFIG } from "../../core/config";
import { spawn } from "child_process";

export function Profile() {
  const [content, setContent] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const parsed = await parseMarkdown(thinkPath(CONFIG.files.profile));
    if (parsed) {
      setContent(parsed.content);
      setName((parsed.frontmatter.name as string) || "");
    }
    setLoading(false);
  }

  useInput((input) => {
    if (input === "e") {
      const editor = process.env.EDITOR || "vi";
      spawn(editor, [thinkPath(CONFIG.files.profile)], {
        stdio: "inherit",
      }).on("exit", () => {
        loadProfile();
      });
    }
  });

  if (loading) {
    return <Text color="gray">Loading...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">
          Profile
        </Text>
        {name && <Text color="gray"> - {name}</Text>}
      </Box>

      <Box flexDirection="column" paddingLeft={1}>
        {content.split("\n").map((line, i) => (
          <Text key={i} color={line.startsWith("#") ? "cyan" : undefined}>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press 'e' to edit in $EDITOR</Text>
      </Box>
    </Box>
  );
}
