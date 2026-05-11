# Claude Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

A real-time dashboard for monitoring your [Claude Code](https://claude.ai/code) sessions — tracks active conversations, token usage, and estimated cost, with an AI-generated daily summary.

## Features

- **Live session tracking** — polls `~/.claude/projects/` every 2 seconds and shows active, waiting, idle, and done sessions
- **Token & cost accounting** — sums input, output, cache-read, and cache-creation tokens per session and maps them to per-model USD rates (Opus 4.7, Sonnet 4.6, Haiku 4.5)
- **Today's stats strip** — session count, total tokens, and total cost at a glance
- **Rate-limit reset countdown** — shows when the 5-hour and weekly rolling windows release their oldest token (computed from local JSONL, no plan setup needed)
- **Session detail view** — browse the full message thread for any session, with syntax-highlighted code blocks and thinking-block support
- **AI daily summary** — one-click summary of all today's sessions, written in Traditional Chinese and saved to `data/summaries/YYYY-MM-DD.md`
- **Incremental JSONL parsing** — byte-offset cache means only new lines are read on each file change

## Session states

| Status | Meaning |
|--------|---------|
| `active` | File modified within the last 30 seconds |
| `waiting` | Last message was from Claude — waiting for your reply |
| `idle` | Last message was from you — Claude is thinking |
| `done` | No activity for over an hour |

## Requirements

- Node.js 18+
- A [Claude Code](https://claude.ai/code) installation writing JSONL logs to `~/.claude/projects/` (or a custom path via `CLAUDE_PROJECTS_DIR`)
- An `ANTHROPIC_API_KEY` (only required for the daily summary feature)

## Getting started

```bash
# Install dependencies
npm install

# Copy env template (only needed if you want the daily summary feature
# or a non-default JSONL path)
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

The dashboard reads three environment variables. All are optional unless noted.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Only for the daily-summary feature | — | Your Anthropic API key. Get one at <https://console.anthropic.com/>. |
| `CLAUDE_PROJECTS_DIR` | No | `~/.claude/projects` | Directory containing Claude Code's JSONL session logs. Override if your install writes elsewhere. Supports `~` and `$HOME` expansion. |
| `SUMMARIES_DIR` | No | `./data/summaries` | Where the dashboard writes daily AI summary markdown. Defaults to a folder inside the project; set it to a global path to keep summaries together across reinstalls. |

Set them in `.env.local` (gitignored). See `.env.example` for an annotated template.

## Running tests

```bash
npm test          # one-shot
npm run test:watch  # TDD loop
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

CI runs the same chain on Node 18 and Node 20 — green locally usually means green on PR.

## Project structure

```
app/         # Next.js App Router — pages and API routes
components/  # React components — cards, lists, modals
lib/         # Core logic — file watching, parsing, status, pricing, summary, config
tests/       # Vitest unit tests
data/        # (gitignored) Runtime state — generated daily summaries
.github/     # CI workflows, issue & PR templates, Dependabot
releases/    # Public CHANGELOG and release notes per version
```

## Tech stack

- [Next.js 15](https://nextjs.org/) — React framework with App Router
- [React 19](https://react.dev/) — UI library
- [Tailwind CSS 3](https://tailwindcss.com/) — Utility-first styling
- [SWR](https://swr.vercel.app/) — Data fetching with auto-refresh
- [chokidar](https://github.com/paulmillr/chokidar) — File system watcher
- [Shiki](https://shiki.style/) — Syntax highlighting
- [Anthropic SDK](https://github.com/anthropic-ai/anthropic-sdk-node) — Claude API client
- [Vitest](https://vitest.dev/) — Unit testing

## Contributing

Issues, feature requests, and pull requests are welcome. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and contribution flow. All participants are expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

For security issues, please follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License

[MIT](./LICENSE) © 2026 Kiwi Lee
