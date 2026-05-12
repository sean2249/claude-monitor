# Claude Monitor 0.4 — Release Notes

> The dashboard now answers the only rate-limit question we can answer honestly: when does the next quota release.

---

## Rate-Limit Reset Countdown

Claude accounts have 5-hour and weekly token quotas, but until now the dashboard could only tell you what you'd already used today. When you were running multiple sessions in parallel, the first signal you'd get that you were close to a throttle was actually being throttled — mid-task, mid-thought.

Claude Monitor now shows a `5hr resets in Xh Ym` and `Weekly resets in Xd Yh` indicator in the top stats strip, computed from the oldest assistant message still inside each rolling window. When that message falls out of the window, that quota slice is released — so the countdown tells you exactly how long until you start getting capacity back.

![Screenshot placeholder](images/rate-limit-reset.png)

**Before**: No visibility into rate-limit timing — you'd discover you were near the cap by hitting it.  
**After**: Two small countdowns next to your existing Sessions / Tokens / Cost totals, refreshing every 2 seconds with the same SWR cycle the rest of the dashboard uses. No setup. No plan selection. No estimated percentages.

The countdowns disappear automatically when the corresponding window has no recent activity — the strip stays uncluttered when you've been idle.

---

## Why No Percentages or Plan Setup

A first cut of this feature shipped progress bars showing "X% of your Pro / Max 5x / Max 20x plan used." It was wrong by 30–165× on a heavy session because:

- Anthropic doesn't publish exact per-plan token caps — every `limit` value was guessed.
- Claude Code's heavy use of prompt caching meant the "tokens used" denominator could include tens of millions of `cache_read` tokens that Anthropic actually meters at ~0.1× weight (or not at all).

Rather than ship a number that looked precise but wasn't, this release answers only the question we can answer with certainty: **when does the oldest token in this window expire**. That's a fact derived from the local JSONL, with no plan tier guessing and no token-weighting voodoo.

---
