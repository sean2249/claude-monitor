# Changelog

All notable changes to Claude Monitor are documented here.

## [Unreleased]

### Open source readiness

This change prepares Claude Monitor for public release on GitHub. No user-visible product behavior changes; the dashboard, session tracking, summaries, and rate-limit display all work as before.

#### Added

- `LICENSE` — MIT, matching what the README has advertised since v0.1.0
- `CONTRIBUTING.md` — setup, quality gate, contribution flow, code style notes
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 (adopted by reference)
- `SECURITY.md` — vulnerability disclosure channel, threat model, supported versions
- `.github/ISSUE_TEMPLATE/` (bug report, feature request, contact-links config) and `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml` — lint + typecheck + test + build on Node 20 and Node 22
- `.github/dependabot.yml` — weekly npm and GitHub Actions dependency updates
- `lib/config.ts` — single source of truth for environment-driven runtime config
- Environment variables: `CLAUDE_PROJECTS_DIR` (defaults to `~/.claude/projects`) and `SUMMARIES_DIR` (defaults to `./data/summaries`), both documented in `.env.example` and the README Configuration section
- `npm run typecheck` script (`tsc --noEmit`)
- `tests/config.test.ts` — 8 cases covering defaults, env overrides, tilde/relative-path expansion, and absolute-path resolution

#### Changed

- `package.json` — added `description`, `keywords`, `license`, `author`, `homepage`, `repository`, `bugs`, `engines.node`; kept `"private": true` (intentional — Claude Monitor is a clone-and-run app, not an npm-installable library)
- `lib/file-watcher.ts`, `lib/summary.ts`, `app/api/summary/today/route.ts` — switched hardcoded paths to import from `lib/config.ts`
- `README.md` — added badges, expanded Configuration section, simplified Project Structure, linked to LICENSE / CONTRIBUTING / CODE_OF_CONDUCT / SECURITY

#### Excluded from public repository

The following directories and files stay in the maintainer's local working tree but are gitignored: `CLAUDE.md`, `.claude/`, `.mcp.json`, `openspec/`, `.claude-flow/`, `.swarm/`, `releases/blog-*.md`, `ruvector.db`, `todo.md`, `tsconfig.tsbuildinfo`. The public `releases/CHANGELOG-v*.md` and `releases/release-notes-v*.md` continue to ship.

## [0.1.0] — 2026-05-05

### Initial release

This is the first public release of Claude Monitor — a real-time Next.js dashboard for observing Claude Code sessions.

#### Added

**Session monitoring**
- File watcher that tracks all JSONL session files under `~/.claude/projects/` using chokidar
- Four-state session lifecycle: `active` → `waiting` / `idle` → `done`, driven by file modification time and last message role
- Live dashboard that auto-refreshes every 2 seconds via SWR
- Session cards for active/waiting sessions and a compact row list for recent sessions

**Token & cost tracking**
- Parses `usage` fields from every assistant message to accumulate `input_tokens`, `output_tokens`, `cache_read_input_tokens`, and `cache_creation_input_tokens`
- Per-model USD pricing for Claude Opus 4.7, Sonnet 4.6, and Haiku 4.5 (and Sonnet 4.5 alias)
- Today's stats strip showing session count, total tokens, and estimated cost

**Session detail view**
- Full message thread browser for any session
- Renders text, tool-use, tool-result, and thinking content blocks
- Syntax-highlighted code via Shiki

**AI daily summary**
- One-click button triggers a summary of all today's sessions using `claude-haiku-4-5-20251001`
- Summary written in Traditional Chinese, covering: work done per project, task completion status, notable decisions, and overall token/cost breakdown
- Summary saved to `data/summaries/YYYY-MM-DD.md`
- Uses prompt caching (ephemeral cache on the system prompt) to reduce cost on repeated calls

**Incremental JSONL parsing**
- Byte-offset cache avoids re-reading the entire file on every update
- Detects file truncation/rotation and falls back to a full re-read automatically

**Testing**
- Vitest test suite covering JSONL parsing, status state machine, pricing calculations, and summary prompt builder
