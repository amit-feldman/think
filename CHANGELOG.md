# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
