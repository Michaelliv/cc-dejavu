# ran

[![CI](https://github.com/Michaelliv/clauderan/actions/workflows/ci.yml/badge.svg)](https://github.com/Michaelliv/clauderan/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Michaelliv/clauderan/graph/badge.svg)](https://codecov.io/gh/Michaelliv/clauderan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Search and browse your Claude Code bash command history.

```
"What was that docker command I ran yesterday?"
```

```bash
$ ran search docker --limit 4

[ok] docker build --no-cache --platform linux/amd64 -t ghcr.io/user/api-service:latest .
     Rebuild without cache for production
     12/30/2025, 12:46 AM | ~/projects/api-service

[ok] docker build -t api-service:test .
     Build test image
     12/30/2025, 12:45 AM | ~/projects/api-service

[ok] docker run --rm api-service:test npm test
     Run tests in container
     12/30/2025, 12:46 AM | ~/projects/api-service

[ok] docker push ghcr.io/user/api-service:latest
     Push to registry
     12/30/2025, 12:48 AM | ~/projects/api-service
```

Every bash command Claude Code runs is logged in session files. `ran` indexes them into a searchable database so you can find that command you ran last week, see what worked, and avoid repeating mistakes.

## Install

```bash
# With Bun (recommended)
bun add -g clauderan

# With npm
npm install -g clauderan

# Or build from source
git clone https://github.com/Michaelliv/clauderan
cd clauderan
bun install
bun run build  # Creates ./ran binary
```

## Usage

```bash
# Search for commands containing "docker"
ran search docker

# Use regex patterns
ran search "git commit.*fix" --regex

# Filter by project directory
ran search npm --cwd /projects/myapp

# List recent commands
ran list
ran list --limit 50

# Manually sync (usually automatic)
ran sync
ran sync --force  # Re-index everything
```

## Examples

**Find a failing build command:**
```bash
$ ran search "npm run build" --limit 5
# Look for [error] entries to see what failed
```

**What commands did I run in a specific project?**
```bash
$ ran search "" --cwd /projects/api --limit 20
# Empty pattern matches everything, filtered by directory
```

**Re-run something from last week:**
```bash
$ ran list --limit 100
# Scroll through recent history, copy what you need
```

## Commands

### `ran search <pattern>`

Search command history by substring or regex.

| Flag | Description |
|------|-------------|
| `--regex`, `-r` | Treat pattern as regular expression |
| `--cwd <path>` | Filter by working directory |
| `--limit`, `-n <N>` | Limit number of results |
| `--no-sync` | Skip auto-sync before searching |

### `ran list`

Show recent commands, newest first.

| Flag | Description |
|------|-------------|
| `--limit`, `-n <N>` | Number of commands (default: 20) |
| `--no-sync` | Skip auto-sync before listing |

### `ran sync`

Index new commands from Claude Code sessions.

| Flag | Description |
|------|-------------|
| `--force`, `-f` | Re-index all sessions from scratch |

## How It Works

Claude Code stores conversation data in `~/.claude/projects/`. Each session is a JSONL file containing messages, tool calls, and results.

`ran` scans these files, extracts Bash tool invocations, and indexes them into a local SQLite database at `~/.ran/history.db`. It tracks file positions so subsequent syncs only process new content.

**Auto-sync**: By default, `search` and `list` automatically sync before returning results. Use `--no-sync` to skip this if you want faster queries.

**Privacy**: `ran` is read-only and local-only. It reads Claude's session files but never modifies them. No data is sent anywhere.

## Data Model

Each indexed command includes:

| Field | Description |
|-------|-------------|
| `command` | The bash command that was executed |
| `description` | What Claude said it does (e.g., "Build the project") |
| `cwd` | Working directory when command ran |
| `timestamp` | When the command was executed |
| `is_error` | Whether the command failed |
| `stdout` | Command output (stored, not displayed by default) |
| `stderr` | Error output (stored, not displayed by default) |
| `session_id` | Which Claude session ran this command |

## For AI Agents

Run `ran onboard` to add a section to `~/.claude/CLAUDE.md` so Claude knows how to search its own history:

```bash
ran onboard
```

This adds:

```markdown
## ran - Claude Code bash history

Use the `ran` CLI to search commands from previous Claude Code sessions:

- `ran search <pattern>` - Search by substring or regex (`--regex`)
- `ran list` - Show recent commands
- `ran search "" --cwd /path` - Filter by directory

Example: "What docker command did you run?" → `ran search docker`
```

Now Claude knows how to search its own history.

### When to use `ran`

- User asks "what was that command I/you ran?"
- User wants to find a command from a previous session
- User needs to recall commands from a specific project
- User wants to see commands that failed

### When NOT to use `ran`

- Finding files by name → use `Glob`
- Searching file contents → use `Grep`
- Checking recent conversation context → already in your context
- User's personal shell history → not indexed, only Claude's commands

## Development

```bash
# Install dependencies
bun install

# Run directly
bun run src/index.ts search docker

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Build binary
bun run build
```

## About the name

`ran` — past tense of "run." It shows you what commands *ran*.

---

MIT License
