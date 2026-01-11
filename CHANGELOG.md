# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2025-01-11

### Fixed
- Fix sql.js wasm file path resolution when installed globally via npm. The wasm file path was hardcoded during build, causing "ENOENT: no such file or directory" errors. Now uses `createRequire` to resolve the path dynamically at runtime.

## [0.1.0] - 2025-01-11

### Added
- Initial release
- `ran search <pattern>` - Search command history by substring or regex
- `ran list` - List recent commands
- `ran sync` - Sync command history from Claude Code sessions
- `ran onboard` - Add ran section to ~/.claude/CLAUDE.md
- SQLite-based persistent storage in ~/.ran/history.db
- Incremental parsing of Claude session JSONL files
