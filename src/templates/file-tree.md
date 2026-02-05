# File Tree Configuration

## Ignore Patterns
Directories and files to exclude from tree generation:
- node_modules
- .git
- dist
- build
- .next
- __pycache__
- .venv
- venv
- target
- .cache
- coverage
- .turbo

## Max Depth
4

## Annotations
Auto-annotate key files:
- package.json: project manifest
- tsconfig.json: TypeScript config
- Cargo.toml: Rust project manifest
- pyproject.toml: Python project config
- src/index.*: entry point
- src/main.*: entry point
