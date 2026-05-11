# Claude Monitor 0.2 — Release Notes

> Dashboard clarity update: see what each agent is doing right now, fix two data bugs, and never lose your filter again.

---

## Active Tool Indicator

Session cards now show which tool is currently being executed — `read_file`, `bash`, `web_search`, or any other tool call. If the session is waiting for a tool result, the card reflects that too.

![Screenshot placeholder](images/active-tool-indicator.png)

**Before**: An "active" session card gave no indication of what Claude was actually doing — you had to open the detail view to see the last tool call.  
**After**: The card surface tells you at a glance: `Running: bash` or `Waiting for: read_file`.

---

## Waiting Sessions Get Their Own Section

The home page now splits into two sections: **Active** (Claude is currently working) and **Waiting for input** (Claude has responded and is waiting for you). The old undifferentiated Recent list is gone.

![Screenshot placeholder](images/active-waiting-sections.png)

**Before**: Waiting sessions were mixed into the same pool as active ones. Knowing which sessions needed your attention required reading each card's status badge.  
**After**: Waiting sessions are grouped together at a glance — the most actionable bucket is always visible.

---

## Smarter Project Path Display

Session cards show the last two segments of the project path (e.g. `Projects/claude-monitor`) rather than just the deepest folder name. Sessions started from the filesystem root or home directory no longer collapse the entire prefix to empty, leaving full `/Users/…` paths exposed.

**Before**: Cards showed either a single ambiguous folder name or, for home-directory projects, the full unstripped path.  
**After**: Cards show a consistent, readable 2-level path for every session.

---

## Session Detail: Newest First & Collapsible Tool Blocks

The conversation view now shows the most recent messages at the top so you can see what Claude just did without scrolling to the bottom. `tool_use` and `tool_result` blocks are collapsible, matching the existing behaviour for `thinking` blocks.

---

## Bug Fixes & Improvements

- **Cost always $0**: Model name was read from the wrong JSONL field (`obj.model` instead of `obj.message.model`). All cost estimates were silently zero. Fixed.
- **Status stuck on "active"**: Session status was only computed when a file changed, so time-based transitions (active → waiting → done) never fired once Claude went quiet. Status is now recomputed on every dashboard poll.
- **Filter lost on navigation**: Typing a search query and clicking into a session detail would clear the filter when pressing Back. The `?q=` param is now threaded through all navigation so Back restores exactly where you were.

---

## Thank You

Thanks to **kiwi lee** ([@sean2249](https://github.com/sean2249) · [kiwi-walk](https://kiwi-walk.com)) for building Claude Monitor.
