import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ProfileInfo } from "../../core/profiles.ts";
import { listProfiles, createProfile, deleteProfile } from "../../core/profiles.ts";

interface ProfileSwitcherProps {
  onClose: () => void;
  onSwitch: (name: string) => void;
  onSetup?: () => void;
}

type Mode = "list" | "create" | "confirmCopy" | "confirmDelete";

export function ProfileSwitcher({ onClose, onSwitch, onSetup }: ProfileSwitcherProps) {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadProfiles() {
    const loaded = listProfiles();
    setProfiles(loaded);
    const activeIndex = loaded.findIndex((p) => p.isActive);
    if (activeIndex >= 0) {
      setSelected(activeIndex);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  function handleCreate(copyFrom?: string) {
    const name = newName.trim();
    if (!name) {
      setError("Name cannot be empty");
      return;
    }
    if (profiles.some((p) => p.name === name)) {
      setError(`Profile "${name}" already exists`);
      return;
    }
    try {
      createProfile(name, copyFrom);

      if (!copyFrom && onSetup) {
        onSetup();
        return;
      }

      setNewName("");
      setMode("list");
      setError(null);
      loadProfiles();
      onSwitch(name);
    } catch {
      setError("Failed to create profile");
    }
  }

  function handleDelete() {
    const profile = profiles[selected];
    if (!profile) return;

    try {
      deleteProfile(profile.name);
      setMode("list");
      setError(null);
      loadProfiles();
      if (selected >= profiles.length - 1) {
        setSelected(Math.max(0, profiles.length - 2));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete profile";
      setError(msg);
      setMode("list");
    }
  }

  function canDelete(): boolean {
    if (profiles.length <= 1) return false;
    return profiles[selected] !== undefined;
  }

  useInput((input, key) => {
    // Create mode
    if (mode === "create") {
      if (key.escape) {
        setMode("list");
        setNewName("");
        setError(null);
      }
      return;
    }

    // Confirm copy mode
    if (mode === "confirmCopy") {
      if (input === "y" || input === "Y") {
        handleCreate(profiles[selected]?.name);
      } else if (input === "n" || input === "N") {
        handleCreate();
      } else if (key.escape) {
        setMode("list");
        setNewName("");
        setError(null);
      }
      return;
    }

    // Confirm delete mode
    if (mode === "confirmDelete") {
      if (input === "y" || input === "Y") {
        handleDelete();
      } else {
        setMode("list");
        setError(null);
      }
      return;
    }

    // List mode
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const profile = profiles[selected];
      if (profile) {
        onSwitch(profile.name);
      }
      return;
    }

    if (key.upArrow || input === "k") {
      setSelected((s) => (s - 1 + profiles.length) % profiles.length);
    }
    if (key.downArrow || input === "j") {
      setSelected((s) => (s + 1) % profiles.length);
    }
    if (input === "n" || input === "c") {
      setMode("create");
      setError(null);
    }
    if (input === "d" && canDelete()) {
      setMode("confirmDelete");
      setError(null);
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text dimColor>Loading profiles...</Text>
      </Box>
    );
  }

  // Create mode
  if (mode === "create") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Create New Profile</Text>
        <Box marginTop={1}>
          <Text color="cyan">  Name: </Text>
          <TextInput
            value={newName}
            onChange={(val) => {
              setNewName(val);
              setError(null);
            }}
            onSubmit={() => {
              if (newName.trim()) {
                if (profiles.length > 0) {
                  setMode("confirmCopy");
                } else {
                  handleCreate();
                }
              }
            }}
            placeholder="my-profile"
          />
        </Box>
        {error && (
          <Box marginTop={1}>
            <Text color="red">  {error}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text dimColor>  Enter: continue | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  // Confirm copy mode
  if (mode === "confirmCopy") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Create "{newName}"</Text>
        <Box marginTop={1}>
          <Text>  Copy settings from </Text>
          <Text color="cyan" bold>{profiles[selected]?.name}</Text>
          <Text>?</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="green" bold>  y</Text>
          <Text dimColor>: copy | </Text>
          <Text color="yellow" bold>n</Text>
          <Text dimColor>: empty | Esc: cancel</Text>
        </Box>
      </Box>
    );
  }

  // Confirm delete mode
  if (mode === "confirmDelete") {
    const profile = profiles[selected];
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">Delete Profile</Text>
        <Box marginTop={1}>
          <Text>  Delete </Text>
          <Text color="cyan" bold>"{profile?.name}"</Text>
          <Text>? This cannot be undone.</Text>
        </Box>
        {profile?.isActive && (
          <Box marginTop={1}>
            <Text color="yellow">  This is the active profile. Will switch to default.</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="red" bold>  y</Text>
          <Text dimColor>: delete | any key: cancel</Text>
        </Box>
      </Box>
    );
  }

  if (profiles.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Profiles</Text>
        <Box marginTop={1}>
          <Text dimColor>  No profiles found</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>  n: new profile | Esc: close</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Switch Profile</Text>

      <Box flexDirection="column" marginTop={1}>
        {profiles.map((profile, i) => (
          <Box key={profile.name}>
            <Text color={i === selected ? "cyan" : undefined} dimColor={i !== selected}>
              {i === selected ? "  \u25b8 " : "    "}
            </Text>
            <Text
              color={profile.isActive ? "green" : i === selected ? "white" : undefined}
              bold={i === selected}
              dimColor={!profile.isActive && i !== selected}
            >
              {profile.name}
            </Text>
            {profile.isActive && (
              <Text color="green"> (active)</Text>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>  {"\u2191\u2193"}: select | Enter: switch | n: new | d: delete | Esc: close</Text>
      </Box>
    </Box>
  );
}
