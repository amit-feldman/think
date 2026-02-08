import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { thinkPath, CONFIG } from "../../core/config.ts";

interface SearchProps {
  onClose: () => void;
  height?: number;
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
  { name: "subagents", path: CONFIG.files.subagents },
  { name: "workflows", path: CONFIG.files.workflows },
];

export function Search({ onClose, height = 20 }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const maxResults = Math.max(3, height - 6);

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

    setResults(found.slice(0, maxResults));
    setSelected(0);
    setSearching(false);
  }

  return (
    <Box flexDirection="column" padding={1} height={height}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>Search</Text>
        {results.length > 0 && (
          <Text dimColor> ({results.length} results)</Text>
        )}
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan">{"\u25b8"} </Text>
        <TextInput
          value={query}
          onChange={handleSearch}
          placeholder="Type to search..."
        />
      </Box>

      {searching && <Text dimColor>Searching...</Text>}

      {results.length > 0 && (
        <Box flexDirection="column">
          {results.map((r, i) => (
            <Box key={`${r.file}-${r.line}`}>
              <Text color={i === selected ? "cyan" : undefined} dimColor={i !== selected}>
                {i === selected ? "\u25b8 " : "  "}
              </Text>
              <Text color="yellow">{r.file}</Text>
              <Text dimColor>:{r.line} </Text>
              <Text color={i === selected ? "white" : undefined} dimColor={i !== selected}>
                {r.content.length > 60
                  ? r.content.substring(0, 60) + "..."
                  : r.content}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {query.length >= 2 && results.length === 0 && !searching && (
        <Text dimColor>No results found</Text>
      )}

      <Box marginTop={1}>
        <Text dimColor>{"\u2191\u2193"}: navigate | Esc: close</Text>
      </Box>
    </Box>
  );
}
