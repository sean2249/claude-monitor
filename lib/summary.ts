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

export async function generateTodaySummary(): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiKeyMissingError();
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);

  const { sessionCount, tokens: totalTokens, cost: totalCost } = store.todayStats();

  const sessions = store.list().filter((s) => {
    return s.lastActivityAt >= start && s.lastActivityAt < end;
  });

  const digests: SessionDigest[] = sessions.map((s) => {
    const detail = store.get(s.id);
    const msgs = detail?.messages ?? [];

    const firstUser = msgs.find((m) => m.role === 'user');
    const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');

    const getText = (blocks: typeof msgs[0]['blocks']) =>
      blocks
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join(' ')
        .slice(0, 500);

    return {
      project: s.projectPath,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.lastActivityAt.toISOString(),
      status: s.status,
      messageCount: s.messageCount,
      tokens: s.tokens,
      cost: s.estimatedCost,
      firstUserMessage: firstUser ? getText(firstUser.blocks) : '(none)',
      lastAssistantMessage: lastAssistant ? getText(lastAssistant.blocks) : '(none)',
    };
  });

  const sessionData = buildSummaryPrompt(digests);

  const client = new Anthropic({ apiKey });

  const systemPrompt = `你是一個幫助開發者回顧工作的助手。請根據 Claude Code session 資料，用繁體中文產生今日工作摘要。`;

  const userPrompt = `以下是我今天用 Claude Code 跑的所有 session，請幫我摘要：
1. 我今天主要在做什麼工作？（分專案）
2. 哪些任務完成了？哪些還在進行？
3. 有什麼值得注意的決策或踩過的雷？
4. 整體 token 用量與成本（今日共 ${sessionCount} sessions，total tokens: ${totalTokens.input + totalTokens.output}，total cost: $${totalCost.toFixed(4)}）

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

  // Write to disk
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  fs.mkdirSync(summariesDir, { recursive: true });
  fs.writeFileSync(path.join(summariesDir, `${dateStr}.md`), markdown, 'utf8');

  return markdown;
}

export class ApiKeyMissingError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not set. Add it to .env.local to use the summary feature.');
    this.name = 'ApiKeyMissingError';
  }
}
