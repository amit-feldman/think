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
import { StatusBar } from "./components/StatusBar";
import { QuickActions } from "./components/QuickActions";
import { Preview } from "./components/Preview";
import { Search } from "./components/Search";
import { existsSync } from "fs";
import { CONFIG } from "../core/config";

// Note: "help" is handled as a modal, not a navigation section
type Section =
  | "profile"
  | "preferences"
  | "memory"
  | "permissions"
  | "skills"
  | "agents"
  | "automation";

type Modal = "none" | "help" | "actions" | "preview" | "search";

export function App() {
  const { exit } = useApp();
  const [section, setSection] = useState<Section>("profile");
  const [modal, setModal] = useState<Modal>("none");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(existsSync(CONFIG.thinkDir));
  }, []);

  useInput((input, key) => {
    // Global shortcuts (when no modal open)
    if (modal !== "none") return;

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
    }
    if (input === "?") {
      setModal("help");
    }
    if (key.ctrl && input === "s") {
      setModal("actions");
    }
    if (input === "a") {
      setModal("actions");
    }
    if (input === "p") {
      setModal("preview");
    }
    if (input === "/" || (key.ctrl && input === "f")) {
      setModal("search");
    }
  });

  function handleMessage(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(undefined), 3000);
  }

  if (!initialized) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box
          borderStyle="round"
          borderColor="red"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
        >
          <Text color="red" bold>
            ~/.think not found
          </Text>
          <Box marginTop={1}>
            <Text color="gray">Run `think init` first, then launch the TUI.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Render modals
  if (modal === "help") {
    return <Help onClose={() => setModal("none")} />;
  }

  if (modal === "actions") {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <QuickActions
          onMessage={handleMessage}
          onClose={() => setModal("none")}
        />
      </Box>
    );
  }

  if (modal === "preview") {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Preview onClose={() => setModal("none")} />
      </Box>
    );
  }

  if (modal === "search") {
    return (
      <Box flexDirection="column" padding={1}>
        <Header />
        <Search onClose={() => setModal("none")} />
      </Box>
    );
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
      <Header />

      <Navigation currentSection={section} onSectionChange={setSection} />

      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="single"
        borderColor="gray"
        padding={1}
        minHeight={15}
      >
        {renderSection()}
      </Box>

      <Box marginTop={1}>
        <StatusBar message={statusMessage} />
      </Box>

      <Box marginTop={1}>
        <Text color="gray">
          Tab: sections | a: actions | p: preview | /: search | ?: help | q: quit
        </Text>
      </Box>
    </Box>
  );
}

function Header() {
  return (
    <Box marginBottom={1}>
      <Text color="green" bold>
        ▀█▀ █░█ █ █▄░█ █▄▀
      </Text>
      <Text color="gray"> Personal Context for Claude</Text>
    </Box>
  );
}
