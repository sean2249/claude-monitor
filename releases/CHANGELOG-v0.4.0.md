## [0.4.0] - 2026-05-10

### Added
- Show rate-limit reset countdown for the 5-hour and weekly rolling windows next to the stats strip totals. (#rate-limit-display)
- Expose `GET /api/stats/limits` returning each window's oldest in-window assistant message timestamp for client-side reset calculation. (#rate-limit-display)
