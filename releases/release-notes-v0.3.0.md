# Claude Monitor 0.3 — Release Notes

> Subagent sessions are now grouped under their parent — the dashboard shows your swarms as a hierarchy, not a flat list of noise.

---

## Subagent Grouping

When Claude Code spawns subagents (sidechains), each agent runs as a separate JSONL file. Previously, these appeared on the dashboard as independent cards with no connection to the parent — cluttering every section and making it impossible to tell which agents belonged to which conversation.

Claude Monitor now reads the directory structure and attachment records in each JSONL file to identify parent-child relationships. Subagent sessions are grouped directly under their parent card as a compact inline list showing each agent's name, status, and last activity time. A count badge on the parent card tells you at a glance how many subagents are running.

![Screenshot placeholder](images/subagent-grouping.png)

**Before**: A swarm of 5 agents produced 6 cards on the dashboard — 1 parent and 5 orphan-looking subagent cards scattered across Active and Waiting sections.  
**After**: One parent card with a "5 subagents" badge and an inline list showing each agent's status beneath it.

---

## Orphan Suppression

Subagent sessions whose parent session is not in the store (e.g. the parent has already completed and been evicted) are hidden entirely rather than surfacing as orphan cards. The dashboard stays clean even as sessions come and go.

---

## Bug Fixes & Improvements

- **Path prefix noise**: Subagent sessions run in a different working directory than their parent, which was causing common-prefix computation to collapse the displayed path for all cards. Subagent sessions are now excluded from the prefix calculation.

---

## Thank You

Thanks to **kiwi lee** ([@sean2249](https://github.com/sean2249) · [kiwi-walk](https://kiwi-walk.com)) for building Claude Monitor.
