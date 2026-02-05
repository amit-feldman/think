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
import { FullScreen, useTerminalSize } from "./components/FullScreen";
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
  const { width, height } = useTerminalSize();
  const [section, setSection] = useState<Section>("profile");
  const [modal, setModal] = useState<Modal>("none");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [initialized, setInitialized] = useState(false);

  const isNarrow = width < 80;

  // Calculate content height
  // Banner: 5 lines (spacer + 3 + margin), compact: 2 lines
  const hasBanner = width >= 44;
  const headerHeight = hasBanner ? 5 : 2;
  // total - header - nav(1) - borders(2) - status(3) - footer(1) - padding(2)
  const contentHeight = Math.max(5, height - headerHeight - 9);

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
      <FullScreen>
        <Box flexDirection="column" padding={1} justifyContent="center" alignItems="center" height="100%">
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
      </FullScreen>
    );
  }

  // Render modals in fullscreen
  if (modal === "help") {
    return (
      <FullScreen>
        <Help onClose={() => setModal("none")} height={height} width={width} />
      </FullScreen>
    );
  }

  if (modal === "actions") {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1}>
          <Header width={width} />
          <QuickActions
            onMessage={handleMessage}
            onClose={() => setModal("none")}
          />
        </Box>
      </FullScreen>
    );
  }

  if (modal === "preview") {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1}>
          <Header width={width} />
          <Preview onClose={() => setModal("none")} height={height - 6} />
        </Box>
      </FullScreen>
    );
  }

  if (modal === "search") {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1}>
          <Header width={width} />
          <Search onClose={() => setModal("none")} height={height - 6} />
        </Box>
      </FullScreen>
    );
  }

  const renderSection = () => {
    switch (section) {
      case "profile":
        return <Profile height={contentHeight} />;
      case "preferences":
        return <Preferences height={contentHeight} />;
      case "memory":
        return <Memory height={contentHeight} />;
      case "permissions":
        return <Permissions height={contentHeight} />;
      case "skills":
        return <Skills height={contentHeight} />;
      case "agents":
        return <Agents height={contentHeight} />;
      case "automation":
        return <Automation height={contentHeight} />;
      default:
        return <Profile height={contentHeight} />;
    }
  };

  return (
    <FullScreen>
      <Box flexDirection="column" padding={1} height="100%">
        <Header width={width} />

        <Navigation currentSection={section} onSectionChange={setSection} />

        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="single"
          borderColor="gray"
          padding={1}
          flexGrow={1}
          height={contentHeight + 2}
        >
          {renderSection()}
        </Box>

        <Box marginTop={1}>
          <StatusBar message={statusMessage} />
        </Box>

        <Box>
          <Text color="gray">
            {isNarrow
              ? "Tab:nav ↑↓:scroll a:act p:prev /:search ?:help q:quit"
              : "Tab: sections | ↑↓/jk: scroll | a: actions | p: preview | /: search | ?: help | q: quit"}
          </Text>
        </Box>
      </Box>
    </FullScreen>
  );
}

function Header({ width, showBanner = true }: { width: number; showBanner?: boolean }) {
  // Double-line box banner
  if (width >= 44 && showBanner) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text> </Text>
        <Text color="green">╔═══════════════════════════════════════╗</Text>
        <Text color="green">║  <Text bold>THINK</Text> · <Text color="gray">Personal Context for Claude</Text>  ║</Text>
        <Text color="green">╚═══════════════════════════════════════╝</Text>
      </Box>
    );
  }

  // Compact header for narrow terminals
  if (width < 35) {
    return (
      <Box marginBottom={1}>
        <Text color="green" bold>think</Text>
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text color="green" bold>think</Text>
      <Text color="gray"> · Personal Context for Claude</Text>
    </Box>
  );
}
