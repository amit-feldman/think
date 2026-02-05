# think

Personal context manager for Claude. Stop repeating yourself.

```
╭────────────────────────────────────────────╮
│                                            │
│   ████████╗██╗  ██╗██╗███╗   ██╗██╗  ██╗   │
│   ╚══██╔══╝██║  ██║██║████╗  ██║██║ ██╔╝   │
│      ██║   ███████║██║██╔██╗ ██║█████╔╝    │
│      ██║   ██╔══██║██║██║╚██╗██║██╔═██╗    │
│      ██║   ██║  ██║██║██║ ╚████║██║  ██╗   │
│      ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝   │
│                                            │
│        Personal Context for Claude         │
│                                            │
╰────────────────────────────────────────────╯
```

## What is this?

`think` manages your personal preferences, patterns, and memory for Claude Code. Instead of repeating "use bun not npm" or "be direct, skip the fluff" every session, configure it once and Claude remembers.

## Install

```bash
# With bun (recommended)
bun install -g think-cli

# With npm
npm install -g think-cli
```

## Quick Start

```bash
# Initialize your config
think init

# Run the setup wizard
think setup

# Start using Claude - your context is automatically loaded
claude
```

## How it works

1. Your preferences live in `~/.think/` (markdown files)
2. `think sync` generates a Claude plugin at `~/.claude/plugins/think/`
3. Claude Code auto-loads the plugin, so your context is always there

## Commands

| Command | Description |
|---------|-------------|
| `think` | Launch interactive TUI |
| `think init` | Initialize ~/.think |
| `think setup` | Interactive profile wizard |
| `think sync` | Regenerate Claude plugin |
| `think status` | Show current status |
| `think learn "..."` | Add a learning |
| `think review` | Review Claude's suggestions |
| `think profile` | Edit your profile |
| `think edit <file>` | Edit any config file |
| `think allow "cmd"` | Pre-approve a command |
| `think tree` | Preview project file tree |
| `think help` | Show all commands |

## What you can configure

- **Profile** - Communication style, preferences
- **Tools** - Package manager, languages, editor
- **Patterns** - Coding patterns to follow
- **Anti-patterns** - Things to avoid
- **Permissions** - Pre-approved commands (no prompts)
- **Memory** - Learnings that persist across sessions
- **Skills & Agents** - Custom workflows for Claude

## Example

After setup, Claude automatically knows:

```markdown
# About Amit
- Be direct and minimal
- Use bun, not npm
- TypeScript and Rust
- Don't over-engineer
- Don't explain obvious things
```

No more repeating yourself.

## License

MIT
