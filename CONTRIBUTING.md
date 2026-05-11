# Contributing to Claude Monitor

Thanks for your interest in helping! Claude Monitor is a small Next.js dashboard for observing your local [Claude Code](https://claude.ai/code) sessions. Contributions are welcome — bug reports, feature ideas, and pull requests.

## Quick start

```bash
# Requires Node.js 18 or newer
npm install
cp .env.example .env.local   # only needed if you want to test the daily summary feature
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard auto-refreshes every 2 seconds.

## Quality gate

Before opening a pull request, run all four:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same chain on Node 18 and Node 20 — if it's green locally, it should be green in CI.

## Configuration

The dashboard reads three environment variables. See `.env.example` and the **Configuration** section in [README.md](./README.md) for the full list. The two that affect local development:

- `CLAUDE_PROJECTS_DIR` — defaults to `~/.claude/projects`. Override if your Claude Code install writes JSONL files elsewhere.
- `SUMMARIES_DIR` — defaults to `data/summaries` relative to the project root.

## Contribution flow

1. **Open an issue first** for anything non-trivial (new feature, behavior change, refactor). Bug fixes can go straight to PR.
2. **Fork and branch.** Use a descriptive branch name (e.g., `fix/session-status-flicker`, `feat/configurable-pricing`).
3. **Keep changes focused.** One concern per PR. Mixing a refactor with a feature makes review harder.
4. **Update tests.** New behavior needs a test. Bug fixes need a regression test.
5. **Update `CHANGELOG.md`** if the change is user-visible.
6. **Open the PR.** Fill in the template. Link the related issue.

## Code style

- TypeScript everywhere. `any` should be a deliberate choice, not a shortcut.
- Files stay under ~500 lines. Split early.
- Prefer editing existing files over creating new ones unless the abstraction earns its keep.
- No new comments unless the *why* is non-obvious. Don't explain *what* the code does — names should do that.

## Testing

`vitest` for unit tests; tests live under `tests/`. Run `npm test` (one-shot) or `npm run test:watch` (TDD loop). Coverage is not currently enforced but new modules should ship with a test.

## A note on AI tooling

The maintainer uses Claude Code and other AI assistants locally for development. None of that is required to contribute — the project is a plain Next.js + Vitest setup. If you see references to AI tools in the codebase, they are confined to maintainer-only files that are not part of the public repository.

## Reporting security issues

Please don't open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the disclosure channel.

## Code of Conduct

Participation in this project is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree your contributions will be licensed under the [MIT License](./LICENSE).
