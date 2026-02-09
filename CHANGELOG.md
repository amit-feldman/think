# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.5] - 2026-02-09

### Changed
- Converted bullet-heavy templates to prose format per Claude system prompt guidelines
- Replaced bold markdown labels with plain text in generated output
- Removed self-referential tool naming from generated context
- Added proactiveness controls to subagent templates
- Converted agent templates from numbered lists to prose

## [0.5.4] - 2026-02-09

### Added
- Context-aware agents with profile injection — agents now receive the active profile context when spawned

## [0.5.3] - 2026-02-09

### Added
- **Inline profile creation in TUI** — create new profiles with role-based defaults without leaving the TUI
  - Select a role (Senior Dev, Mid-level, Junior, Founder, Student, Hobbyist) and profile files are auto-generated
  - No longer exits to `think setup` CLI wizard when creating empty profiles
- **`P profiles` visible in status bar** — profile switching shortcut is now discoverable

### Changed
- Extracted profile generation logic into shared `profile-generator.ts` module (used by both CLI setup and TUI)

## [0.5.2] - 2026-02-08

### Fixed
- Project context path now matches Claude Code's directory convention (leading dash preserved)
  - `/Users/test/project` → `-Users-test-project` (matches Claude Code)
  - Previously stripped the leading dash, causing context to write to wrong directory

## [0.5.1] - 2026-02-08

### Fixed
- Cleaned up npm package with `.npmignore`
- Removed obsolete templates (allowed-commands, corrections, pending, settings)
- Updated README with current commands and features

## [0.5.0] - 2025-02-08

### Added
- **`think context`** — Project-level context generation
  - Regex-based signature extraction (functions, types, classes, enums)
  - Token-aware adaptive file tree (collapses large directories, adjusts depth)
  - Budget allocation across sections (overview, structure, key files, code map, knowledge)
  - `.think.yaml` project config (optional — works with zero config)
  - Output to `~/.claude/projects/<path>/CLAUDE.md` (zero project pollution)
  - `--budget`, `--force`, `--dry-run` flags
- **`think switch <profile>`** — Switch profile with auto-sync
- **First-run detection** — Running `think` with no config auto-launches setup wizard
- **Automation section in TUI** — Workflows and subagent rules management

### Changed
- **CLI reduced to 5 commands**: `setup`, `switch`, `context`, `learn`, `status`
- **TUI redesign** — Clean heading hierarchy, compact header, horizontal tab navigation
- **Memory simplified** — Learnings only (removed corrections and pending tabs)
- **Generator** — Proper markdown nesting (strips redundant headings, bumps heading levels)
- Auto-sync on profile switch, learn, and TUI exit

### Removed
- `think init` (merged into first-run detection)
- `think sync` (auto-triggered by switch, learn, setup, TUI exit)
- `think profile` subcommands (moved to TUI, replaced by `think switch`)
- `think review`, `think edit`, `think allow`, `think tree`, `think project`, `think help`
- Permissions section from TUI and config
- Corrections and pending memory tabs
- ASCII art banner (replaced with compact header)

## [0.4.2] - 2025-02-06

### Added
- **Smart project detection** - `think project` now detects:
  - Monorepo tools (Turborepo, Nx, Lerna, pnpm/yarn/bun workspaces)
  - Workspace structure with types (apps, packages, services)
  - Frameworks from all workspaces (React, Tauri, Hono, Claude SDK, etc.)
  - Tooling (Biome, Docker, TypeScript, Vite, Prisma, etc.)
  - README tagline/description
- **Agent/Skill management in TUI**:
  - `n` - create new with auto-generated name (e.g., "swift-falcon")
  - `r` - rename selected item
  - `d` - delete with confirmation
- Creative name generator for new agents/skills

### Fixed
- YAML parsing errors no longer crash the TUI (graceful fallback)
- Long descriptions truncated in agent/skill lists

## [0.4.1] - 2025-02-06

### Added
- Improved project detection for monorepos
- Detect runtime (Bun vs Node vs Deno)
- Detect frameworks from workspace dependencies

## [0.4.0] - 2025-02-05

### Added
- **Multi-profile support** - switch between different configurations (work, personal, etc.)
  - `think profile list` - list all profiles with active indicator
  - `think profile use <name>` - switch to a profile (auto-syncs)
  - `think profile create <name> [--from <profile>]` - create new profile
  - `think profile delete <name>` - delete with confirmation
- TUI profile switcher (press `P`) - switch profiles without leaving the app
- Active profile shown in TUI header
- **Inline edit/delete in Memory section**
  - Arrow keys to select items
  - `Enter` to edit inline
  - `d` to delete with confirmation
  - `e` still opens $EDITOR for bulk edits
### Changed
- Directory structure now uses `~/.think/profiles/<name>/` for each profile
- Sync command shows which profile is being synced

## [0.3.2] - 2025-02-05

### Added
- Fullscreen TUI using alternate screen buffer (preserves terminal history on exit)
- Scrollable content in all sections (↑↓ or j/k to scroll)
- Terminal resize support - UI adapts dynamically

### Changed
- New double-line box header design
- Content area now fills available terminal height
- Improved responsive layout for different terminal sizes

## [0.3.1] - 2025-02-05

### Fixed
- Responsive TUI - adapts to terminal width:
  - Narrow terminals (<80 cols): compact nav labels, shorter status
  - Very narrow (<50 cols): minimal header, single nav indicator
  - Footer shortcuts adjust to available space

## [0.3.0] - 2025-02-05

### Added
- Enhanced TUI with new features:
  - **Status bar** - shows learnings count, pending count, last sync time
  - **Quick actions menu** (press `a`) - sync, add learning, search
  - **Preview panel** (press `p`) - view generated CLAUDE.md with scrolling
  - **Search** (press `/`) - search across all config files
  - **Better help screen** (press `?`) - organized shortcuts and CLI commands
- New keyboard shortcuts: `a` actions, `p` preview, `/` search, `Ctrl+S` sync
- Bordered content panels for cleaner visual design

### Changed
- TUI now uses modals for actions, preview, search, and help
- Improved navigation hints in footer

## [0.2.1] - 2025-02-05

### Added
- `think project learn` command - generates CLAUDE.md with project file tree
- Helps Claude understand project structure without exploring
- Includes project type, name, description, and annotated file tree

### Fixed
- Fixed gray-matter import in project-detect.ts

## [0.2.0] - 2025-02-05

### Changed
- Simplified architecture: now generates `~/.claude/CLAUDE.md` directly
- No plugin system needed - Claude reads CLAUDE.md automatically
- Includes user name from profile frontmatter

### Removed
- Plugin registration complexity (marketplace, installed_plugins.json, etc.)

## [0.1.6] - 2025-02-05

### Fixed
- Plugin now registers in both settings.json and installed_plugins.json
- Uses `think@local` key format for proper Claude Code discovery

## [0.1.5] - 2025-02-05

### Added
- Enhanced profile section with role and experience level
- Claude personality selection (pair programmer, mentor, assistant, etc.)
- SDLC preferences: planning, testing, code review, git workflow
- Documentation, debugging, and refactoring preferences
- Generated profile now includes full development workflow guidance

## [0.1.4] - 2025-02-05

### Changed
- Setup wizard now uses @clack/prompts for better UX
- Arrow key navigation and space to toggle checkboxes
- Multi-select for frontend, CSS, database, infrastructure (can pick multiple)
- Cleaner visual design with spinners and hints

## [0.1.3] - 2025-02-05

### Fixed
- `--version` now reads from package.json instead of hardcoded value

## [0.1.2] - 2025-02-05

### Added
- Setup wizard now asks about frontend framework, CSS framework, database, infrastructure, and testing preferences
- Generated tools.md and anti-patterns.md include tech choices with alternatives to avoid

## [0.1.1] - 2025-02-05

### Fixed
- Plugin now uses correct `.claude-plugin/` directory structure
- Plugin auto-registers in Claude's `settings.json` on sync

## [0.1.0] - 2025-02-05

### Added
- Initial release
- CLI commands: `init`, `sync`, `status`, `learn`, `review`, `profile`, `edit`, `allow`, `tree`, `project init`, `help`, `setup`
- Interactive TUI with Ink (React)
- Profile builder wizard (`think setup`)
- Semantic deduplication for learnings
- Project type detection (Node, Bun, Rust, Python, Go, etc.)
- Annotated file tree generation
- Auto-generated Claude plugin at `~/.claude/plugins/think/`
- Pre-approved commands hook
- Learning suggestion hook for Claude
