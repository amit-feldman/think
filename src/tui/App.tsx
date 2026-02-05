import React, { useState, useEffect, useRef } from "react";
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
import { ProfileSwitcher } from "./components/ProfileSwitcher";
import { FullScreen, useTerminalSize } from "./components/FullScreen";
import { existsSync, readdirSync } from "fs";
import { spawn } from "child_process";
import { CONFIG, getActiveProfile } from "../core/config";
import { switchProfile } from "../core/profiles";
import { generatePlugin } from "../core/generator";

// Note: "help" is handled as a modal, not a navigation section
type Section =
  | "profile"
  | "preferences"
  | "memory"
  | "permissions"
  | "skills"
  | "agents"
  | "automation";

type Modal = "none" | "help" | "actions" | "preview" | "search" | "profiles";

export function App() {
  const { exit } = useApp();
  const { width, height } = useTerminalSize();
  const [section, setSection] = useState<Section>("profile");
  const [modal, setModal] = useState<Modal>("none");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [initialized, setInitialized] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string>(getActiveProfile());
  const isExitingRef = useRef(false);

  const isNarrow = width < 80;

  // Calculate content height
  // Banner: 5 lines (spacer + 3 + margin), compact: 2 lines
  const hasBanner = width >= 44;
  const headerHeight = hasBanner ? 5 : 2;
  // total - header - nav(1) - borders(2) - status(3) - footer(1) - padding(2)
  const contentHeight = Math.max(5, height - headerHeight - 9);

  useEffect(() => {
    // Check if ~/.think exists and has profiles
    if (!existsSync(CONFIG.thinkDir)) {
      setInitialized(false);
      return;
    }
    if (!existsSync(CONFIG.profilesDir)) {
      setInitialized(false);
      return;
    }
    // Check if at least one profile exists
    const profiles = readdirSync(CONFIG.profilesDir, { withFileTypes: true })
      .filter(e => e.isDirectory());
    setInitialized(profiles.length > 0);
  }, []);

  useInput((input, key) => {
    // Global shortcuts (when no modal open)
    if (modal !== "none") return;

    if (input === "q" || (key.ctrl && input === "c")) {
      isExitingRef.current = true;
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
    if (input === "P") {
      setModal("profiles");
    }
  });

  function handleMessage(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(undefined), 3000);
  }

  async function handleProfileSwitch(name: string) {
    if (name === activeProfile) {
      setModal("none");
      return;
    }
    try {
      switchProfile(name);
      setActiveProfile(name);
      handleMessage(`Switched to profile "${name}"`);
      await generatePlugin();
      handleMessage(`Switched to profile "${name}" and synced`);
    } catch (e) {
      handleMessage(`Failed to switch profile`);
    }
    setModal("none");
  }

  function handleSetup() {
    // Exit TUI and run setup command
    isExitingRef.current = true;
    exit();
    // Spawn setup in the same terminal after TUI exits
    setTimeout(() => {
      spawn("think", ["setup"], {
        stdio: "inherit",
      });
    }, 100);
  }

  // Don't render anything while exiting to avoid flash
  if (isExitingRef.current) {
    return null;
  }

  if (!initialized) {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1} justifyContent="center" alignItems="center" height="100%">
          <Box
            borderStyle="round"
            borderColor="yellow"
            paddingX={2}
            paddingY={1}
            flexDirection="column"
          >
            <Text color="yellow" bold>
              No profiles found
            </Text>
            <Box marginTop={1}>
              <Text color="gray">Run `think init` to get started.</Text>
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

  if (modal === "profiles") {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1}>
          <Header width={width} activeProfile={activeProfile} />
          <ProfileSwitcher
            onClose={() => setModal("none")}
            onSwitch={handleProfileSwitch}
            onSetup={handleSetup}
          />
        </Box>
      </FullScreen>
    );
  }

  const renderSection = () => {
    // Use activeProfile as key to force remount when profile changes
    switch (section) {
      case "profile":
        return <Profile key={activeProfile} height={contentHeight} />;
      case "preferences":
        return <Preferences key={activeProfile} height={contentHeight} />;
      case "memory":
        return <Memory key={activeProfile} height={contentHeight} />;
      case "permissions":
        return <Permissions key={activeProfile} height={contentHeight} />;
      case "skills":
        return <Skills key={activeProfile} height={contentHeight} />;
      case "agents":
        return <Agents key={activeProfile} height={contentHeight} />;
      case "automation":
        return <Automation key={activeProfile} height={contentHeight} />;
      default:
        return <Profile key={activeProfile} height={contentHeight} />;
    }
  };

  return (
    <FullScreen>
      <Box flexDirection="column" padding={1} height="100%">
        <Header width={width} activeProfile={activeProfile} />

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
          <StatusBar key={activeProfile} message={statusMessage} />
        </Box>

        <Box>
          <Text color="gray">
            {isNarrow
              ? "Tab:nav ↑↓:scroll a:act p:prev P:profile /:search ?:help q:quit"
              : "Tab: sections | ↑↓/jk: scroll | a: actions | p: preview | P: profile | /: search | ?: help | q: quit"}
          </Text>
        </Box>
      </Box>
    </FullScreen>
  );
}

function Header({ width, showBanner = true, activeProfile }: { width: number; showBanner?: boolean; activeProfile?: string }) {
  const profileBadge = activeProfile && activeProfile !== "default" ? (
    <Text color="cyan"> [{activeProfile}]</Text>
  ) : null;

  // Double-line box banner
  if (width >= 44 && showBanner) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text> </Text>
        <Text color="green">╔═══════════════════════════════════════╗</Text>
        <Text color="green">║  <Text bold>THINK</Text> · <Text color="gray">Personal Context for Claude</Text>  ║</Text>
        <Text color="green">╚═══════════════════════════════════════╝</Text>
        {profileBadge && <Box><Text color="gray">Profile:</Text>{profileBadge}</Box>}
      </Box>
    );
  }

  // Compact header for narrow terminals
  if (width < 35) {
    return (
      <Box marginBottom={1}>
        <Text color="green" bold>think</Text>
        {profileBadge}
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text color="green" bold>think</Text>
      <Text color="gray"> · Personal Context for Claude</Text>
      {profileBadge}
    </Box>
  );
}
