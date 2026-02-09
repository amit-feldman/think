import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Navigation, sections } from "./components/Navigation.tsx";
import type { Section } from "./components/Navigation.tsx";
import { Profile } from "./components/Profile.tsx";
import { Preferences } from "./components/Preferences.tsx";
import { Memory } from "./components/Memory.tsx";
import { Skills } from "./components/Skills.tsx";
import { Agents } from "./components/Agents.tsx";
import { Automation } from "./components/Automation.tsx";
import { Help } from "./components/Help.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { Preview } from "./components/Preview.tsx";
import { Search } from "./components/Search.tsx";
import { ProfileSwitcher } from "./components/ProfileSwitcher.tsx";
import { FullScreen, useTerminalSize } from "./components/FullScreen.tsx";
import { existsSync, readdirSync } from "fs";
import { readFile } from "fs/promises";
import { CONFIG, getActiveProfile, estimateTokens, formatTokens } from "../core/config.ts";
import { switchProfile } from "../core/profiles.ts";
import { generatePlugin } from "../core/generator.ts";

type Modal = "none" | "help" | "preview" | "search" | "profiles";

export function App() {
  const { exit } = useApp();
  const { width, height } = useTerminalSize();
  const [section, setSection] = useState<Section>("profile");
  const [modal, setModal] = useState<Modal>("none");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [initialized, setInitialized] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string>(getActiveProfile());
  const [tokenCount, setTokenCount] = useState<string>("");
  const isExitingRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load token count
  useEffect(() => {
    loadTokenCount();
  }, [activeProfile]);

  async function loadTokenCount() {
    if (existsSync(CONFIG.claudeMdPath)) {
      const content = await readFile(CONFIG.claudeMdPath, "utf-8");
      setTokenCount(formatTokens(estimateTokens(content)));
    }
  }

  // Calculate content height
  // Header: 1 line, nav: 2 lines (labels + underline), status: 1 line, padding: 2 (top/bottom)
  const contentHeight = Math.max(5, height - 6);

  useEffect(() => {
    if (!existsSync(CONFIG.thinkDir)) {
      setInitialized(false);
      return;
    }
    if (!existsSync(CONFIG.profilesDir)) {
      setInitialized(false);
      return;
    }
    const profiles = readdirSync(CONFIG.profilesDir, { withFileTypes: true }).filter(
      (e) => e.isDirectory(),
    );
    setInitialized(profiles.length > 0);
  }, []);

  // Auto-sync on unmount
  useEffect(() => {
    return () => {
      if (initialized) {
        generatePlugin().catch(() => {});
      }
    };
  }, [initialized]);

  useInput((input, key) => {
    if (modal !== "none") return;

    if (input === "q" || (key.ctrl && input === "c")) {
      isExitingRef.current = true;
      exit();
    }
    if (input === "?") {
      setModal("help");
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
    if (input === "s") {
      handleSync();
    }

    // Tab/Shift+Tab to cycle sections
    if (key.tab) {
      const currentIndex = sections.findIndex((s) => s.key === section);
      const nextIndex = key.shift
        ? (currentIndex - 1 + sections.length) % sections.length
        : (currentIndex + 1) % sections.length;
      setSection(sections[nextIndex]!.key);
    }

    // Number keys for quick navigation
    const num = parseInt(input);
    if (num >= 1 && num <= sections.length) {
      setSection(sections[num - 1]!.key);
    }
  });

  function handleMessage(msg: string) {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    setStatusMessage(msg);
    statusTimerRef.current = setTimeout(() => setStatusMessage(undefined), 3000);
  }

  async function handleSync() {
    handleMessage("Syncing...");
    try {
      await generatePlugin();
      handleMessage("Synced successfully");
      await loadTokenCount();
    } catch {
      handleMessage("Sync failed");
    }
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
      await loadTokenCount();
      handleMessage(`Switched to "${name}" and synced`);
    } catch {
      handleMessage("Failed to switch profile");
    }
    setModal("none");
  }

  // Don't render while exiting
  if (isExitingRef.current) {
    return null;
  }

  // First-run: no profiles
  if (!initialized) {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1} justifyContent="center" alignItems="center" height="100%">
          <Box flexDirection="column" paddingX={2} paddingY={1}>
            <Text color="yellow" bold>No profiles found</Text>
            <Box marginTop={1}>
              <Text dimColor>Run </Text>
              <Text color="cyan">think setup</Text>
              <Text dimColor> to get started.</Text>
            </Box>
          </Box>
        </Box>
      </FullScreen>
    );
  }

  // Modal: Help (fullscreen)
  if (modal === "help") {
    return (
      <FullScreen>
        <Help onClose={() => setModal("none")} height={height} width={width} />
      </FullScreen>
    );
  }

  // Modal: Preview (fullscreen)
  if (modal === "preview") {
    return (
      <FullScreen>
        <Preview onClose={() => setModal("none")} height={height - 2} />
      </FullScreen>
    );
  }

  // Modal: Search (fullscreen)
  if (modal === "search") {
    return (
      <FullScreen>
        <Search onClose={() => setModal("none")} height={height - 2} />
      </FullScreen>
    );
  }

  // Modal: Profile Switcher (fullscreen)
  if (modal === "profiles") {
    return (
      <FullScreen>
        <Box flexDirection="column" padding={1}>
          <CompactHeader
            width={width}
            activeProfile={activeProfile}
            tokenCount={tokenCount}
          />
          <ProfileSwitcher
            onClose={() => setModal("none")}
            onSwitch={handleProfileSwitch}
          />
        </Box>
      </FullScreen>
    );
  }

  const renderSection = () => {
    const isModalActive = modal === "none";
    switch (section) {
      case "profile":
        return <Profile key={activeProfile} height={contentHeight} isActive={isModalActive} />;
      case "preferences":
        return <Preferences key={activeProfile} height={contentHeight} isActive={isModalActive} />;
      case "memory":
        return <Memory key={activeProfile} height={contentHeight} isActive={isModalActive} />;
      case "skills":
        return <Skills key={activeProfile} height={contentHeight} isActive={isModalActive} />;
      case "agents":
        return <Agents key={activeProfile} height={contentHeight} isActive={isModalActive} />;
      case "automation":
        return <Automation key={activeProfile} height={contentHeight} isActive={isModalActive} />;
      default:
        return <Profile key={activeProfile} height={contentHeight} isActive={isModalActive} />;
    }
  };

  return (
    <FullScreen>
      <Box flexDirection="column" padding={1} height="100%">
        {/* Compact header */}
        <CompactHeader
          width={width}
          activeProfile={activeProfile}
          tokenCount={tokenCount}
        />

        {/* Navigation tabs */}
        <Navigation currentSection={section} onSectionChange={setSection} />

        {/* Content area */}
        <Box flexDirection="column" flexGrow={1} marginTop={1}>
          {renderSection()}
        </Box>

        {/* Status bar */}
        <StatusBar message={statusMessage} section={section} />
      </Box>
    </FullScreen>
  );
}

function CompactHeader({
  width,
  activeProfile,
  tokenCount,
}: {
  width: number;
  activeProfile: string;
  tokenCount: string;
}) {
  const isNarrow = width < 60;

  if (isNarrow) {
    return (
      <Box marginBottom={1}>
        <Text color="cyan" bold>think</Text>
        {activeProfile !== "default" && (
          <Text dimColor> · {activeProfile}</Text>
        )}
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text color="cyan" bold>think</Text>
      <Text dimColor>
        {" · "}profile: {activeProfile}
        {tokenCount ? ` · ~${tokenCount} tokens` : ""}
      </Text>
    </Box>
  );
}
