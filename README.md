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
bun add -g claude-think

# With npm
npm install -g claude-think
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

1. Your preferences live in `~/.think/profiles/<name>/` (markdown files)
2. `think sync` generates `~/.claude/CLAUDE.md` from active profile
3. Claude Code auto-loads CLAUDE.md at session start

## Profiles

Switch between different configurations for work, personal projects, or clients:

```bash
think profile list              # See all profiles
think profile create work       # Create new profile
think profile create client --from work  # Copy from existing
think profile use work          # Switch (auto-syncs)
think profile delete old        # Remove a profile
```

Press `P` in the TUI to switch profiles interactively.

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
| `think profile list` | List all profiles |
| `think profile use <name>` | Switch to a profile |
| `think profile create <name>` | Create new profile |
| `think profile delete <name>` | Delete a profile |
| `think profile edit` | Edit profile.md |
| `think edit <file>` | Edit any config file |
| `think allow "cmd"` | Pre-approve a command |
| `think tree` | Preview project file tree |
| `think project` | Generate CLAUDE.md for current project |
| `think help` | Show all commands |

## TUI

Run `think` to launch the fullscreen TUI:

| Key | Action |
|-----|--------|
| `Tab` | Switch sections |
| `↑↓` / `jk` | Navigate / scroll |
| `e` | Edit selected item |
| `n` | New agent/skill |
| `r` | Rename agent/skill |
| `d` | Delete item |
| `a` | Quick actions (sync, learn, search) |
| `p` | Preview CLAUDE.md |
| `P` | Switch profile |
| `/` | Search all files |
| `?` | Help |
| `q` | Quit |

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
