import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { store } from './session-store';
import { summariesDir } from './config';
import type { SessionDigest } from './types';

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

export function summaryFilePath(date: Date, projectEncoded?: string): string {
  const key = formatDateKey(date);
  const name = projectEncoded ? `${key}__${projectEncoded}.md` : `${key}.md`;
  return path.join(summariesDir, name);
}

export type SummaryListEntry = {
  date: string;
  projectEncoded: string | null;
  projectPath: string | null;
  generatedAt: string;
};

const FILENAME_RE = /^(\d{4}-\d{2}-\d{2})(?:__(.+))?\.md$/;

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
    const [, date, projectEncoded] = m;
    let generatedAt: Date;
    try {
      generatedAt = fs.statSync(path.join(summariesDir, file)).mtime;
    } catch {
      continue;
    }
    entries.push({
      date,
      projectEncoded: projectEncoded ?? null,
      projectPath: projectEncoded ? projectLookup.get(projectEncoded) ?? null : null,
      generatedAt: generatedAt.toISOString(),
    });
  }

  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.projectEncoded === b.projectEncoded) return 0;
    if (a.projectEncoded === null) return -1;
    if (b.projectEncoded === null) return 1;
    return a.projectEncoded < b.projectEncoded ? -1 : 1;
  });
}

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
  const projectPath = projectEncoded
    ? store.listProjects().find((p) => p.encodedFolder === projectEncoded)?.projectPath ?? projectEncoded
    : null;

  const sessionData = buildSummaryPrompt(digests);

  const client = new Anthropic({ apiKey });

  const systemPrompt = `你是一個幫助開發者回顧工作的助手。請根據 Claude Code session 資料，用繁體中文產生工作摘要。`;

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

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const markdown = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');

  fs.mkdirSync(summariesDir, { recursive: true });
  fs.writeFileSync(summaryFilePath(date, projectEncoded), markdown, 'utf8');

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
