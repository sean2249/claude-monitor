# Claude Monitor 0.1 — Release Notes

> First release: a local browser dashboard that gives you a unified view of every Claude Code session running on your machine.

---

## Session Dashboard

Running multiple Claude Code agents means constant window-switching to check whether an agent is still working, waiting for input, or done. Claude Monitor eliminates that by showing every session as a card at `localhost:3000`, updated every 2 seconds.

---

## Session Status — No Process Inspection

Status is derived entirely from the `.jsonl` file's modification time and the role of the last parsed message. No `ps`, `lsof`, or PID tracking.

| Status | Meaning |
|--------|---------|
| `active` | File written within the last 30 s |
| `waiting` | No writes for ≥ 30 s; last message was from the assistant |
| `idle` | No writes for ≥ 30 s; last message was from the user or a tool |
| `done` | No writes for ≥ 1 h |

**Before**: No way to tell if an agent was waiting for your input or had silently finished without switching to its terminal.  
**After**: Status is visible on every card without leaving the dashboard.

---

## Token Usage & Cost Tracking

Each session card shows cumulative token counts — input, output, cache read, and cache creation — alongside an estimated USD cost based on a per-model pricing table (`lib/pricing.ts`). The today-stats strip sums these across all sessions.

If Anthropic updates pricing, edit the table in `lib/pricing.ts`; the source URL is documented inline.

---

## Conversation Detail View

Click any session card to open the full conversation: user messages, assistant responses, tool calls, and tool results, with syntax-highlighted code blocks and auto-scroll as new messages arrive.

![Screenshot placeholder](images/session-detail.png)

---

## Daily Summary

The "Summarize today" button sends digests of all today's sessions to the Claude API (Sonnet 4.6) and returns a markdown recap of the day's work. Summaries are cached to `./data/summaries/YYYY-MM-DD.md`. Regenerating within 5 minutes reuses the cached system prompt via Anthropic prompt caching, keeping latency and cost low.

**Before**: Reviewing what Claude worked on today meant manually re-reading every session log.  
**After**: One click produces a narrative summary across all sessions.

---

## Getting Started

1. `npm install`
2. Copy `.env.example` → `.env.local` and add your `ANTHROPIC_API_KEY`
3. `make dev`

The dashboard is live at `localhost:3000`. All existing `.jsonl` sessions are loaded on startup.

---

## Thank You

Thanks to **kiwi lee** ([@sean2249](https://github.com/sean2249) · [kiwi-walk](https://kiwi-walk.com)) for building Claude Monitor.
