## [0.1.0] - 2026-05-05

### Added
- Add unified browser dashboard at `localhost:3000` showing all local Claude Code sessions as status cards. (#claude-monitor)
- Add session status inference (active / waiting / idle / done) from file mtime and last-message role — no process or PID inspection required. (#claude-monitor)
- Add per-session and daily-aggregate token usage with estimated USD cost. (#claude-monitor)
- Add real-time conversation view with ~2 s polling, role-differentiated messages, and syntax-highlighted code blocks. (#claude-monitor)
- Add on-demand AI-generated daily summary via Claude API (Sonnet 4.6), cached to `./data/summaries/YYYY-MM-DD.md`. (#claude-monitor)
- Add incremental `.jsonl` parsing with byte-offset tracking to avoid re-reading full files on every poll cycle. (#claude-monitor)
