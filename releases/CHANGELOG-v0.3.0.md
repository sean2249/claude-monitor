## [0.3.0] - 2026-05-06

### Added
- Add subagent detection — parse `isSidechain` and `parentSessionId` from each session's JSONL attachment record and directory path. (#subagent-grouping)
- Add subagent grouping on session cards — subagent sessions appear as a compact inline list under their parent card with a count badge. (#subagent-grouping)

### Changed
- Suppress sidechain sessions from the top-level session list; only parent sessions appear as cards. (#subagent-grouping)
- Extend file watcher to scan `subagents/` subdirectories so subagent JSONL files are parsed alongside main sessions. (#subagent-grouping)
- Exclude subagent sessions from common-prefix path computation to prevent display issues. (#subagent-grouping)

### Fixed
- Fix orphaned subagent sessions (whose parent is not in the store) appearing as standalone cards in the dashboard. (#subagent-grouping)
