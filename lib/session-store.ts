import fs from 'fs';
import path from 'path';
import { parseIncremental, resetOffset } from './jsonl-parser';
import { computeStatus } from './status';
import { estimateCost } from './pricing';
import type { Session, SessionDetail, SessionDigest, SessionStatus, TokenEvent, Tokens } from './types';

type InternalSession = SessionDetail & {
  fileMtime: Date;
  lastRole: 'user' | 'assistant' | 'system' | null;
  lastToolName: string | null;
  isSidechain: boolean;
  parentSessionId: string | null;
  tokenEvents: TokenEvent[];
};

const STATUS_ORDER: Record<SessionStatus, number> = {
  active: 0,
  waiting: 1,
  idle: 2,
  done: 3,
};

class SessionStore {
  private sessions = new Map<string, InternalSession>();

  list(): Session[] {
    const all = Array.from(this.sessions.values());
    const mains = all.filter((s) => !s.isSidechain);
    const sidechains = all.filter((s) => s.isSidechain);

    return mains
      .map((s) => {
        const { messages: _m, fileMtime, lastRole, ...rest } = s;
        const status = computeStatus(fileMtime, lastRole);
        const subagents: Session[] = sidechains
          .filter((sub) => sub.parentSessionId === s.id)
          .map((sub) => {
            const { messages: _sm, fileMtime: sfm, lastRole: slr, ...subRest } = sub;
            return { ...subRest, status: computeStatus(sfm, slr), subagents: [] };
          });
        return { ...rest, status, subagents };
      })
      .sort((a, b) => {
        const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return d !== 0 ? d : b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
      });
  }

  get(id: string): SessionDetail | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    const { fileMtime, lastRole, lastToolName, ...detail } = s;
    const status = computeStatus(fileMtime, lastRole);
    return { ...detail, status, lastToolName } as SessionDetail;
  }

  aggregateWindow(windowStartTs: Date): { tokens: Tokens; oldestTokenTs: Date | null } {
    const allEvents: TokenEvent[] = [];
    for (const s of this.sessions.values()) {
      for (const ev of s.tokenEvents) allEvents.push(ev);
    }
    return aggregateEventsInWindow(allEvents, windowStartTs);
  }

  todayStats(): { sessionCount: number; tokens: Tokens; cost: number } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86_400_000);

    const todaySessions = Array.from(this.sessions.values()).filter(
      (s) => s.lastActivityAt >= start && s.lastActivityAt < end,
    );

    const { tokens } = this.aggregateWindow(start);
    const cost = todaySessions.reduce((acc, s) => acc + s.estimatedCost, 0);
    return { sessionCount: todaySessions.length, tokens, cost };
  }

  digestsFor(opts: { date: Date; projectEncoded?: string }): {
    digests: SessionDigest[];
    sessionCount: number;
    tokens: Tokens;
    cost: number;
  } {
    const { date, projectEncoded } = opts;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 86_400_000);

    const matched = Array.from(this.sessions.values()).filter((s) => {
      if (s.isSidechain) return false;
      if (s.lastActivityAt < start || s.lastActivityAt >= end) return false;
      if (projectEncoded && s.encodedFolder !== projectEncoded) return false;
      return true;
    });

    // Both the aggregate and per-digest values are computed from the day's
    // tokenEvents only — using full‑session `s.tokens` / `s.estimatedCost`
    // would over‑report for sessions that span multiple days. Per‑session day
    // tokens feed `estimateCost`, so the per‑digest cost lines up with the
    // aggregate.
    const aggTokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    let aggCost = 0;
    const perSession = new Map<string, { tokens: Tokens; cost: number }>();
    for (const s of matched) {
      const dayTokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
      for (const ev of s.tokenEvents) {
        if (ev.ts < start || ev.ts >= end) continue;
        dayTokens.input += ev.input;
        dayTokens.output += ev.output;
        dayTokens.cacheRead += ev.cacheRead;
        dayTokens.cacheCreation += ev.cacheCreation;
      }
      const dayCost = estimateCost(dayTokens, s.model);
      perSession.set(s.id, { tokens: dayTokens, cost: dayCost });
      aggTokens.input += dayTokens.input;
      aggTokens.output += dayTokens.output;
      aggTokens.cacheRead += dayTokens.cacheRead;
      aggTokens.cacheCreation += dayTokens.cacheCreation;
      aggCost += dayCost;
    }

    const digests: SessionDigest[] = matched.map((s) => {
      const msgs = s.messages;
      const firstUser = msgs.find((m) => m.role === 'user');
      const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');

      const getText = (blocks: typeof msgs[0]['blocks']) =>
        blocks
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join(' ')
          .slice(0, 500);

      const day = perSession.get(s.id)!;
      return {
        project: s.projectPath,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.lastActivityAt.toISOString(),
        status: computeStatus(s.fileMtime, s.lastRole),
        messageCount: s.messageCount,
        tokens: day.tokens,
        cost: day.cost,
        firstUserMessage: firstUser ? getText(firstUser.blocks) : '(none)',
        lastAssistantMessage: lastAssistant ? getText(lastAssistant.blocks) : '(none)',
      };
    });

    return { digests, sessionCount: matched.length, tokens: aggTokens, cost: aggCost };
  }

  listProjects(): { encodedFolder: string; projectPath: string; lastActivityAt: Date }[] {
    const byEncoded = new Map<string, { encodedFolder: string; projectPath: string; lastActivityAt: Date }>();
    for (const s of this.sessions.values()) {
      if (s.isSidechain) continue;
      const cur = byEncoded.get(s.encodedFolder);
      if (!cur || s.lastActivityAt > cur.lastActivityAt) {
        byEncoded.set(s.encodedFolder, {
          encodedFolder: s.encodedFolder,
          projectPath: s.projectPath,
          lastActivityAt: s.lastActivityAt,
        });
      }
    }
    return Array.from(byEncoded.values()).sort(
      (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
    );
  }

  async upsertFromFile(filePath: string): Promise<void> {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }

    const id = path.basename(filePath, '.jsonl');
    const existing = this.sessions.get(id);

    const parsed = await parseIncremental(filePath) as ReturnType<typeof parseIncremental> extends Promise<infer T> ? T & { fullRead: boolean } : never;
    const tokenEvents = extractTokenEventsFromFile(filePath);
    const tokens = sumEvents(tokenEvents);
    const mtime = stat.mtime;

    if (existing && !(parsed as unknown as { fullRead: boolean }).fullRead) {
      existing.messages.push(...parsed.messages);
    } else {
      // full rebuild
      const session: InternalSession = {
        id,
        projectPath: parsed.projectPath,
        encodedFolder: parsed.encodedFolder,
        isSidechain: parsed.isSidechain,
        parentSessionId: parsed.parentSessionId,
        filePath,
        startedAt: parsed.firstTimestamp ?? mtime,
        lastActivityAt: parsed.lastTimestamp ?? mtime,
        status: 'idle',
        messageCount: 0,
        tokens,
        estimatedCost: 0,
        lastMessagePreview: '',
        model: parsed.model,
        aiTitle: parsed.aiTitle,
        messages: parsed.messages,
        fileMtime: mtime,
        lastRole: parsed.lastRole,
        lastToolName: parsed.lastToolName,
        tokenEvents,
      };
      this.sessions.set(id, session);
    }

    const s = this.sessions.get(id)!;
    s.tokens = tokens;
    s.tokenEvents = tokenEvents;
    s.model = parsed.model ?? s.model;
    s.aiTitle = parsed.aiTitle ?? s.aiTitle;
    s.lastRole = parsed.lastRole ?? s.lastRole;
    s.lastToolName = parsed.lastToolName ?? s.lastToolName;
    s.fileMtime = mtime;
    if (parsed.lastTimestamp) s.lastActivityAt = parsed.lastTimestamp;
    s.messageCount = s.messages.length;
    s.status = computeStatus(mtime, s.lastRole);
    s.estimatedCost = estimateCost(tokens, s.model);
    s.lastMessagePreview = getPreview(s.messages);
  }

  removeFile(filePath: string): void {
    const id = path.basename(filePath, '.jsonl');
    this.sessions.delete(id);
    resetOffset(filePath);
  }
}

export function extractTokenEventsFromFile(filePath: string): TokenEvent[] {
  const events: TokenEvent[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as Record<string, unknown>;
        if (obj.type !== 'assistant') continue;
        const msg = obj.message as Record<string, unknown> | undefined;
        const u = msg?.usage as Record<string, number> | undefined;
        if (!u) continue;
        const ts = obj.timestamp ? new Date(obj.timestamp as string) : new Date();
        events.push({
          ts,
          input: u.input_tokens ?? 0,
          output: u.output_tokens ?? 0,
          cacheRead: u.cache_read_input_tokens ?? 0,
          cacheCreation: u.cache_creation_input_tokens ?? 0,
        });
      } catch { /* skip bad line */ }
    }
  } catch { /* file gone */ }
  return events;
}

export function aggregateEventsInWindow(
  events: TokenEvent[],
  windowStartTs: Date,
): { tokens: Tokens; oldestTokenTs: Date | null } {
  const tokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  let oldest: Date | null = null;
  for (const ev of events) {
    if (ev.ts < windowStartTs) continue;
    tokens.input += ev.input;
    tokens.output += ev.output;
    tokens.cacheRead += ev.cacheRead;
    tokens.cacheCreation += ev.cacheCreation;
    if (!oldest || ev.ts < oldest) oldest = ev.ts;
  }
  return { tokens, oldestTokenTs: oldest };
}

function sumEvents(events: TokenEvent[]): Tokens {
  const t: Tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  for (const e of events) {
    t.input += e.input;
    t.output += e.output;
    t.cacheRead += e.cacheRead;
    t.cacheCreation += e.cacheCreation;
  }
  return t;
}

function getPreview(messages: SessionDetail['messages']): string {
  const last = messages[messages.length - 1];
  if (!last) return '';
  for (const b of last.blocks) {
    if (b.type === 'text') return b.text.slice(0, 120);
  }
  return '';
}

const g = globalThis as typeof globalThis & { __sessionStore?: SessionStore };
if (!g.__sessionStore) g.__sessionStore = new SessionStore();
export const store: SessionStore = g.__sessionStore;
