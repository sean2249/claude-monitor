import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { store } from './session-store';
import { summariesDir } from './config';
import type { SessionDigest, Tokens } from './types';

export function buildSummaryPrompt(digests: SessionDigest[]): string {
  const sessionBlocks = digests
    .map((d, i) => {
      const tokenTotal = d.tokens.input + d.tokens.output + d.tokens.cacheRead + d.tokens.cacheCreation;
      return `--- Session ${i + 1} ---
Project: ${d.project}
Started: ${d.startedAt}  Ended: ${d.endedAt}
Status: ${d.status}  Messages: ${d.messageCount}
Tokens: ${tokenTotal} (input ${d.tokens.input}, output ${d.tokens.output}, cache_read ${d.tokens.cacheRead}, cache_creation ${d.tokens.cacheCreation})
Cost: $${d.cost.toFixed(4)}
First user message: ${d.firstUserMessage}
Last assistant message: ${d.lastAssistantMessage}`;
    })
    .join('\n\n');

  return sessionBlocks;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// projectEncoded ends up inside a filename joined under summariesDir. Without a
// strict allowlist a value from the query string could contain '..' or path
// separators and escape the summaries directory, enabling arbitrary file
// read/write. Claude Code's own encodedFolder slugs only ever contain
// alphanumerics, '-', '_' and '.', so reject anything else outright.
const PROJECT_ENCODED_RE = /^[A-Za-z0-9._-]+$/;

export class InvalidProjectEncodedError extends Error {
  constructor(slug: string) {
    super(`Invalid project slug: ${JSON.stringify(slug)}`);
    this.name = 'InvalidProjectEncodedError';
  }
}

export function isSafeProjectEncoded(slug: string): boolean {
  if (!slug || slug.length > 255) return false;
  if (slug === '.' || slug === '..') return false;
  if (slug.startsWith('.')) return false;
  return PROJECT_ENCODED_RE.test(slug);
}

function assertSafeProjectEncoded(slug: string): void {
  if (!isSafeProjectEncoded(slug)) throw new InvalidProjectEncodedError(slug);
}

export function summaryFilePath(date: Date, projectEncoded?: string): string {
  const key = formatDateKey(date);
  if (projectEncoded !== undefined) assertSafeProjectEncoded(projectEncoded);
  const name = projectEncoded ? `${key}__${projectEncoded}.md` : `${key}.md`;
  return path.join(summariesDir, name);
}

export function rangeSummaryFilePath(
  startDate: Date,
  endDate: Date,
  projectEncoded?: string,
): string {
  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);
  if (projectEncoded !== undefined) assertSafeProjectEncoded(projectEncoded);
  const base = `${startKey}_to_${endKey}`;
  const name = projectEncoded ? `${base}__${projectEncoded}.md` : `${base}.md`;
  return path.join(summariesDir, name);
}

export type SummaryListEntry = {
  date: string;
  endDate: string | null;
  projectEncoded: string | null;
  projectPath: string | null;
  generatedAt: string;
};

const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})(?:_to_(\d{4}-\d{2}-\d{2}))?(?:__(.+))?\.md$/;

export function listSummaries(): SummaryListEntry[] {
  let files: string[];
  try {
    files = fs.readdirSync(summariesDir);
  } catch {
    return [];
  }

  const projectLookup = new Map(
    store.listProjects().map((p) => [p.encodedFolder, p.projectPath] as const),
  );

  const entries: SummaryListEntry[] = [];
  for (const file of files) {
    const m = FILENAME_RE.exec(file);
    if (!m) continue;
    const [, date, endDate, projectEncoded] = m;
    let generatedAt: Date;
    try {
      generatedAt = fs.statSync(path.join(summariesDir, file)).mtime;
    } catch {
      continue;
    }
    entries.push({
      date,
      endDate: endDate ?? null,
      projectEncoded: projectEncoded ?? null,
      projectPath: projectEncoded ? projectLookup.get(projectEncoded) ?? null : null,
      generatedAt: generatedAt.toISOString(),
    });
  }

  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if ((a.endDate ?? '') !== (b.endDate ?? '')) {
      return (a.endDate ?? '') < (b.endDate ?? '') ? 1 : -1;
    }
    if (a.projectEncoded === b.projectEncoded) return 0;
    if (a.projectEncoded === null) return -1;
    if (b.projectEncoded === null) return 1;
    return a.projectEncoded < b.projectEncoded ? -1 : 1;
  });
}

async function runLLM(opts: {
  systemPrompt: string;
  userPrompt: string;
  apiKey: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: opts.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: opts.userPrompt }],
  });
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');
}

function resolveProjectPath(projectEncoded?: string): string | null {
  if (!projectEncoded) return null;
  return (
    store.listProjects().find((p) => p.encodedFolder === projectEncoded)?.projectPath ??
    projectEncoded
  );
}

const SYSTEM_PROMPT = `你是一個幫助開發者回顧工作的助手。請根據 Claude Code session 資料，用繁體中文產生工作摘要。`;

export type GenerateOptions = {
  date: Date;
  projectEncoded?: string;
};

export async function generateSummary(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiKeyMissingError();
  }

  const { date, projectEncoded } = opts;
  const { digests, sessionCount, tokens, cost } = store.digestsFor({ date, projectEncoded });

  const dateKey = formatDateKey(date);
  const projectPath = resolveProjectPath(projectEncoded);
  const sessionData = buildSummaryPrompt(digests);
  const totalTokens = tokens.input + tokens.output;

  const scopeLine = projectPath
    ? `以下是我在 ${dateKey} 針對專案 ${projectPath} 跑的所有 session，請幫我摘要：`
    : `以下是我在 ${dateKey} 用 Claude Code 跑的所有 session，請幫我摘要：`;

  const questions = projectPath
    ? `1. 這個專案今天主要在做什麼工作？
2. 哪些任務完成了？哪些還在進行？
3. 有什麼值得注意的決策或踩過的雷？
4. 整體 token 用量與成本（共 ${sessionCount} sessions，total tokens: ${totalTokens}，total cost: $${cost.toFixed(4)}）`
    : `1. 我那天主要在做什麼工作？（分專案）
2. 哪些任務完成了？哪些還在進行？
3. 有什麼值得注意的決策或踩過的雷？
4. 整體 token 用量與成本（共 ${sessionCount} sessions，total tokens: ${totalTokens}，total cost: $${cost.toFixed(4)}）`;

  const userPrompt = `${scopeLine}
${questions}

<sessions>
${sessionData}
</sessions>`;

  const markdown = await runLLM({ systemPrompt: SYSTEM_PROMPT, userPrompt, apiKey });

  fs.mkdirSync(summariesDir, { recursive: true });
  fs.writeFileSync(summaryFilePath(date, projectEncoded), markdown, 'utf8');

  return markdown;
}

export type GenerateRangeOptions = {
  startDate: Date;
  endDate: Date;
  projectEncoded?: string;
};

export class EmptyRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyRangeError';
  }
}

export async function generateRangeSummary(opts: GenerateRangeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiKeyMissingError();
  }

  const { startDate, endDate, projectEncoded } = opts;
  if (startDate > endDate) {
    throw new Error('start date must be on or before end date');
  }

  const projectPath = resolveProjectPath(projectEncoded);
  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);

  // Walk days inclusive [startDate, endDate]. For each day, collect digests and
  // ‑‑ if a cached daily summary exists ‑‑ pick it up too. The cached summary is
  // the LLM's prior write‑up; the digests are the raw evidence. Both go into
  // the reduce step so the model can lean on prior summaries while still seeing
  // the underlying activity.
  const perDay: {
    dateKey: string;
    sessionCount: number;
    tokens: Tokens;
    cost: number;
    digests: SessionDigest[];
    cachedSummary: string | null;
  }[] = [];

  let totalSessions = 0;
  const aggTokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  let aggCost = 0;

  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    cursor <= endDate;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  ) {
    const { digests, sessionCount, tokens, cost } = store.digestsFor({
      date: cursor,
      projectEncoded,
    });
    if (sessionCount === 0) continue;

    let cachedSummary: string | null = null;
    try {
      cachedSummary = fs.readFileSync(summaryFilePath(cursor, projectEncoded), 'utf8');
    } catch {
      // no cached daily summary — fine
    }

    perDay.push({
      dateKey: formatDateKey(cursor),
      sessionCount,
      tokens,
      cost,
      digests,
      cachedSummary,
    });
    totalSessions += sessionCount;
    aggTokens.input += tokens.input;
    aggTokens.output += tokens.output;
    aggTokens.cacheRead += tokens.cacheRead;
    aggTokens.cacheCreation += tokens.cacheCreation;
    aggCost += cost;
  }

  if (perDay.length === 0) {
    throw new EmptyRangeError(
      projectPath
        ? `No sessions found for ${projectPath} between ${startKey} and ${endKey}.`
        : `No sessions found between ${startKey} and ${endKey}.`,
    );
  }

  const dayBlocks = perDay
    .map((d) => {
      const sessionData = buildSummaryPrompt(d.digests);
      const totalTok = d.tokens.input + d.tokens.output;
      const cached = d.cachedSummary
        ? `\nPrior daily summary:\n${d.cachedSummary.trim()}\n`
        : '';
      return `=== ${d.dateKey} (${d.sessionCount} sessions, ${totalTok} tokens, $${d.cost.toFixed(4)}) ===
${sessionData}${cached}`;
    })
    .join('\n\n');

  const scopeLine = projectPath
    ? `以下是我在 ${startKey} 到 ${endKey}（共 ${perDay.length} 天有活動）針對專案 ${projectPath} 跑的所有 session：`
    : `以下是我在 ${startKey} 到 ${endKey}（共 ${perDay.length} 天有活動）用 Claude Code 跑的所有 session：`;

  const totalTokens = aggTokens.input + aggTokens.output;
  const questions = projectPath
    ? `請以這段時間的「累積視角」幫我整理：
1. 這個專案在這段期間的整體進度演進（依時間線描述重要里程碑）
2. 完成的功能 / 修掉的問題 vs. 還在進行中或留下來的事項
3. 重要技術決策、走過的彎路、踩過的雷
4. 工作量分布（哪幾天投入較多、是否有明顯加速/停滯）
5. 整體用量與成本（${perDay.length} 個活動日、共 ${totalSessions} sessions、total tokens: ${totalTokens}、total cost: $${aggCost.toFixed(4)}）

請避免一字不漏地複述每天的內容，而是抽出「跨天的脈絡」。`
    : `請以這段時間的「累積視角」幫我整理：
1. 我這段期間主要把時間投在哪些專案、各自做了什麼
2. 完成的事項 vs. 還在進行中或被擱置的事項
3. 重要技術決策、走過的彎路、踩過的雷
4. 工作量分布（哪幾天較密集、是否有明顯加速/停滯）
5. 整體用量與成本（${perDay.length} 個活動日、共 ${totalSessions} sessions、total tokens: ${totalTokens}、total cost: $${aggCost.toFixed(4)}）

請避免一字不漏地複述每天的內容，而是抽出「跨天的脈絡」。`;

  const userPrompt = `${scopeLine}
${questions}

<days>
${dayBlocks}
</days>`;

  const markdown = await runLLM({ systemPrompt: SYSTEM_PROMPT, userPrompt, apiKey });

  fs.mkdirSync(summariesDir, { recursive: true });
  fs.writeFileSync(rangeSummaryFilePath(startDate, endDate, projectEncoded), markdown, 'utf8');

  return markdown;
}

export async function generateTodaySummary(): Promise<string> {
  return generateSummary({ date: new Date() });
}

export class ApiKeyMissingError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not set. Add it to .env.local to use the summary feature.');
    this.name = 'ApiKeyMissingError';
  }
}
