# think

Personal context manager for Claude Code. Stop repeating yourself.

## What is this?

`think` manages your personal preferences, patterns, and memory for Claude Code. Instead of repeating "use bun not npm" or "be direct, skip the fluff" every session, configure it once and Claude remembers.

It also generates project-level context — file trees, code signatures, and knowledge base docs — so Claude deeply understands your codebase without you explaining it.

## Install

```bash
# With bun (recommended)
bun add -g claude-think

# With npm
npm install -g claude-think
```

## Quick Start

```bash
# First run launches setup wizard automatically
think

# Or run setup directly
think setup

# Generate project context (run from your project directory)
think context

# Start using Claude - your context is automatically loaded
claude
```

## How it works

1. Your preferences live in `~/.think/profiles/<name>/` (markdown files)
2. `think` auto-syncs to `~/.claude/CLAUDE.md` which Claude reads at session start
3. `think context` scans your project and writes to `~/.claude/projects/<path>/CLAUDE.md`
4. Zero project pollution — everything lives in `~/.think` and `~/.claude`

## Commands

| Command | Description |
|---------|-------------|
| `think` | Launch interactive TUI |
| `think setup` | Interactive profile wizard (re-runnable) |
| `think switch <profile>` | Switch profile + auto-sync |
| `think context` | Generate project context for current directory |
| `think learn "..."` | Add a learning + auto-sync |
| `think status` | Show profile, tokens, project context status |

### think context

Scans your project and generates a context file Claude reads automatically:

```bash
think context                    # Default 12k token budget
think context --budget 20000     # Larger budget
think context --dry-run          # Preview without writing
```

Output includes:
- Project overview (runtime, frameworks, tooling)
- Token-aware adaptive file tree
- Code map (function/type signatures)
- Key files (full source for important files)
- Knowledge base (from `.think/knowledge/*.md`)

Configure with `.think.yaml` in your project root (optional — works with zero config).

## Profiles

Switch between different configurations for work, personal projects, or clients:

```bash
think switch work     # Switch profile (auto-syncs)
```

Press `P` in the TUI to manage profiles interactively (create, delete, switch). New profiles can be created with role-based defaults without leaving the TUI.

## TUI

Run `think` to launch the fullscreen TUI:

| Key | Action |
|-----|--------|
| `Tab` | Switch sections |
| `1-6` | Jump to section |
| `↑↓` / `jk` | Navigate / scroll |
| `←→` | Switch sub-tabs |
| `e` | Edit in $EDITOR |
| `n` | New item |
| `d` | Delete item |
| `c` | Duplicate |
| `r` | Rename |
| `s` | Sync CLAUDE.md |
| `p` | Preview CLAUDE.md |
| `P` | Switch profile |
| `/` | Search all files |
| `?` | Help |
| `q` | Quit |

## What you can configure

- **Profile** — Identity, communication style, personality
- **Preferences** — Tools, patterns, anti-patterns
- **Memory** — Learnings that persist across sessions
- **Skills** — Custom skill definitions for Claude
- **Agents** — Subagent configurations with tools and triggers
- **Automation** — Workflows and subagent rules

## Example

After setup, Claude automatically knows:

```markdown
## About the User

Name: Amit

Senior developer - experienced and autonomous

## How Claude Should Behave

- Be direct and minimal - no fluff, just answers and code
- Skip lengthy reasoning unless asked

## Tool Preferences

### Runtime & Package Manager
- Use Bun (not npm, pnpm, yarn)

### Languages
- TypeScript
- Rust
```

No more repeating yourself.

## License

MIT
