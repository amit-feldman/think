import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config";

interface SearchProps {
  onClose: () => void;
}

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

const searchFiles = [
  { name: "profile", path: CONFIG.files.profile },
  { name: "tools", path: CONFIG.files.tools },
  { name: "patterns", path: CONFIG.files.patterns },
  { name: "anti-patterns", path: CONFIG.files.antiPatterns },
  { name: "learnings", path: CONFIG.files.learnings },
  { name: "corrections", path: CONFIG.files.corrections },
  { name: "subagents", path: CONFIG.files.subagents },
  { name: "workflows", path: CONFIG.files.workflows },
];

export function Search({ onClose }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
    if (key.upArrow || (key.ctrl && input === "p")) {
      setSelected((s) => Math.max(0, s - 1));
    }
    if (key.downArrow || (key.ctrl && input === "n")) {
      setSelected((s) => Math.min(results.length - 1, s + 1));
    }
  });

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const found: SearchResult[] = [];
    const lowerQuery = q.toLowerCase();

    for (const file of searchFiles) {
      const fullPath = thinkPath(file.path);
      if (!existsSync(fullPath)) continue;

      const content = await readFile(fullPath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, i) => {
        if (line.toLowerCase().includes(lowerQuery)) {
          found.push({
            file: file.name,
            line: i + 1,
            content: line.trim(),
          });
        }
      });
    }

    setResults(found.slice(0, 15));
    setSelected(0);
    setSearching(false);
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Search</Text>
        {results.length > 0 && (
          <Text color="gray"> ({results.length} results)</Text>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">▸ </Text>
        <TextInput
          value={query}
          onChange={handleSearch}
          placeholder="Type to search..."
        />
      </Box>

      {searching && <Text color="gray">Searching...</Text>}

      {results.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {results.map((r, i) => (
            <Box key={`${r.file}-${r.line}`}>
              <Text color={i === selected ? "cyan" : "gray"}>
                {i === selected ? "▸ " : "  "}
              </Text>
              <Text color="yellow">{r.file}</Text>
              <Text color="gray">:{r.line} </Text>
              <Text color={i === selected ? "white" : "gray"}>
                {r.content.length > 50
                  ? r.content.substring(0, 50) + "..."
                  : r.content}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {query.length >= 2 && results.length === 0 && !searching && (
        <Text color="gray">No results found</Text>
      )}

      <Box marginTop={1}>
        <Text color="gray">↑↓: navigate | Esc: close</Text>
      </Box>
    </Box>
  );
}
