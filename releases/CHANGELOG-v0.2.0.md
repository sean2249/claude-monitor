## [0.2.0] - 2026-05-06

### Added
- Add active tool indicator on session cards showing the current `tool_use` being executed in real time. (#dashboard-improvements)

### Changed
- Split dashboard home page into distinct Active and Waiting-for-input sections; remove the Recent section. (#dashboard-improvements)
- Show 2-level project path on session cards (e.g. `Projects/claude-monitor`) instead of just the folder name. (#dashboard-improvements)
- Reverse message order in session detail to show newest messages at the top. (#dashboard-improvements)
- Make `tool_use` and `tool_result` blocks collapsible in session detail, matching existing `thinking` block behaviour. (#dashboard-improvements)
- Preserve filter query (`?q=`) when navigating to a session detail page so pressing Back restores the previous filter. (#filter-and-path-fixes)
- Fix session path display to correctly strip the common prefix when root-path or home-path sessions are present in the store. (#filter-and-path-fixes)

### Fixed
- Fix cost calculation always showing $0 — model name was read from `obj.model` instead of the correct `obj.message.model`. (#dashboard-improvements)
- Fix session status never transitioning from `active` to `waiting` or `done` after a file stopped changing — status is now recomputed at read time. (#dashboard-improvements)
- Fix build failure caused by missing `app/not-found.tsx` required by Next.js 15 when `notFound()` is called from a server component. (#filter-and-path-fixes)
