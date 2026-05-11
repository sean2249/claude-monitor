# Security Policy

Thanks for helping keep Claude Monitor safe. This document describes how to report a vulnerability and what to expect in response.

## Supported versions

Claude Monitor is currently a single-stream project. The latest tagged release receives security fixes; older versions do not.

| Version | Supported |
|---------|-----------|
| `0.4.x` | ✅ |
| `< 0.4` | ❌ |

The version number lives in [`package.json`](./package.json). Check there for the current release.

## Threat model (short)

Claude Monitor reads JSONL files from your local Claude Code directory (default `~/.claude/projects/`) and displays them in a Next.js dashboard, normally on `http://localhost:3000`. It does not authenticate requests. It only calls the Anthropic API when you click the daily summary button.

The realistic risks are:

1. A malicious file in `~/.claude/projects/` (or a configured `CLAUDE_PROJECTS_DIR`) crashes the parser or causes path traversal.
2. The dev server is bound to a public network interface and exposes session contents.
3. The `ANTHROPIC_API_KEY` in `.env.local` is exfiltrated.

Issues outside this scope (for example, vulnerabilities in upstream packages) are best reported to the upstream maintainer; we will rebase on the fix.

## Reporting a vulnerability

**Please do not file a public GitHub issue for security problems.**

Instead, email the maintainer:

- **Contact:** Kiwi Lee — `sean22492249@gmail.com`
- **Subject prefix:** `[security] claude-monitor: <short description>`

Include in your report:

- A clear description of the issue and the impact.
- Reproduction steps. A minimal repro that runs against `npm run dev` is ideal.
- The affected version (from `package.json`) and your environment (OS, Node version).
- Any suggested fix or mitigation, if you have one.

## What to expect

- **Acknowledgment** within **7 days** of your report (usually sooner).
- A disclosure timeline agreed with you. The default target is 30 days from acknowledgment to fix; complex issues may take longer with your consent.
- Credit in the release notes when the fix ships, unless you ask to remain anonymous.

If you do not receive an acknowledgment within 7 days, please open a non-sensitive GitHub issue saying you sent a security report (without details) so the maintainer can check spam filters.

## Out of scope

- Reports that require physical access to the user's machine without any remote vector.
- Issues that depend on the user installing third-party plugins not shipped with this repository.
- Vulnerabilities in dependencies — please report those to the upstream project. We will follow up by bumping the dependency.
