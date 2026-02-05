import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Navigation } from "./components/Navigation";
import { Profile } from "./components/Profile";
import { Preferences } from "./components/Preferences";
import { Memory } from "./components/Memory";
import { Permissions } from "./components/Permissions";
import { Skills } from "./components/Skills";
import { Agents } from "./components/Agents";
import { Automation } from "./components/Automation";
import { Help } from "./components/Help";
import { existsSync } from "fs";
import { CONFIG } from "../core/config";

type Section =
  | "profile"
  | "preferences"
  | "memory"
  | "permissions"
  | "skills"
  | "agents"
  | "automation"
  | "help";

export function App() {
  const { exit } = useApp();
  const [section, setSection] = useState<Section>("profile");
  const [showHelp, setShowHelp] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(existsSync(CONFIG.thinkDir));
  }, []);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (input === "?") {
      setShowHelp(!showHelp);
    }
  });

  if (!initialized) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">~/.think not found.</Text>
        <Text>Run `think init` first, then launch the TUI.</Text>
      </Box>
    );
  }

  if (showHelp) {
    return <Help onClose={() => setShowHelp(false)} />;
  }

  const renderSection = () => {
    switch (section) {
      case "profile":
        return <Profile />;
      case "preferences":
        return <Preferences />;
      case "memory":
        return <Memory />;
      case "permissions":
        return <Permissions />;
      case "skills":
        return <Skills />;
      case "agents":
        return <Agents />;
      case "automation":
        return <Automation />;
      default:
        return <Profile />;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="green" bold>
          ▀█▀ █░█ █ █▄░█ █▄▀
        </Text>
        <Text color="gray"> Personal Context for Claude</Text>
      </Box>

      <Navigation currentSection={section} onSectionChange={setSection} />

      <Box flexDirection="column" marginTop={1}>
        {renderSection()}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          Tab: switch sections | ?: help | q: quit
        </Text>
      </Box>
    </Box>
  );
}
