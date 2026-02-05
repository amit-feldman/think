# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
