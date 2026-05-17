import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { buildSummaryPrompt } from '../lib/summary';
import type { SessionDigest } from '../lib/types';

const sampleDigests: SessionDigest[] = [
  {
    project: '/Users/alice/Projects/my-app',
    startedAt: '2026-05-05T08:00:00.000Z',
    endedAt: '2026-05-05T09:30:00.000Z',
    status: 'done',
    messageCount: 12,
    tokens: { input: 5000, output: 3000, cacheRead: 1000, cacheCreation: 500 },
    cost: 0.0234,
    firstUserMessage: 'Please help me refactor the auth module',
    lastAssistantMessage: 'Done! The auth module has been refactored.',
  },
  {
    project: '/Users/alice/Projects/api-server',
    startedAt: '2026-05-05T10:00:00.000Z',
    endedAt: '2026-05-05T10:45:00.000Z',
    status: 'idle',
    messageCount: 8,
    tokens: { input: 3000, output: 2000, cacheRead: 500, cacheCreation: 200 },
    cost: 0.0135,
    firstUserMessage: 'Add rate limiting to the API',
    lastAssistantMessage: 'I have implemented the rate limiting middleware.',
  },
];

describe('buildSummaryPrompt', () => {
  it('includes session count', () => {
    const prompt = buildSummaryPrompt(sampleDigests);
    expect(prompt).toContain('Session 1');
    expect(prompt).toContain('Session 2');
  });

  it('includes project paths', () => {
    const prompt = buildSummaryPrompt(sampleDigests);
    expect(prompt).toContain('/Users/alice/Projects/my-app');
    expect(prompt).toContain('/Users/alice/Projects/api-server');
  });

  it('includes status for each session', () => {
    const prompt = buildSummaryPrompt(sampleDigests);
    expect(prompt).toContain('done');
    expect(prompt).toContain('idle');
  });

  it('includes first and last messages', () => {
    const prompt = buildSummaryPrompt(sampleDigests);
    expect(prompt).toContain('Please help me refactor the auth module');
    expect(prompt).toContain('I have implemented the rate limiting middleware.');
  });

  it('includes cost information', () => {
    const prompt = buildSummaryPrompt(sampleDigests);
    expect(prompt).toContain('0.0234');
    expect(prompt).toContain('0.0135');
  });

  it('returns empty string for no sessions', () => {
    expect(buildSummaryPrompt([])).toBe('');
  });
});

describe('summaryFilePath / listSummaries', () => {
  const ORIGINAL_ENV = { ...process.env };
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summaries-test-'));
    process.env.SUMMARIES_DIR = tmpDir;
    vi.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = { ...ORIGINAL_ENV };
  });

  it('summaryFilePath formats date without project as YYYY-MM-DD.md', async () => {
    const { summaryFilePath } = await import('../lib/summary');
    const p = summaryFilePath(new Date(2026, 4, 17));
    expect(p).toBe(path.join(tmpDir, '2026-05-17.md'));
  });

  it('summaryFilePath appends encoded project slug', async () => {
    const { summaryFilePath } = await import('../lib/summary');
    const p = summaryFilePath(new Date(2026, 4, 17), '-Users-alice-Projects-my-app');
    expect(p).toBe(path.join(tmpDir, '2026-05-17__-Users-alice-Projects-my-app.md'));
  });

  it('rangeSummaryFilePath joins with _to_ separator', async () => {
    const { rangeSummaryFilePath } = await import('../lib/summary');
    const p = rangeSummaryFilePath(new Date(2026, 4, 11), new Date(2026, 4, 17));
    expect(p).toBe(path.join(tmpDir, '2026-05-11_to_2026-05-17.md'));
  });

  it('rangeSummaryFilePath includes project slug', async () => {
    const { rangeSummaryFilePath } = await import('../lib/summary');
    const p = rangeSummaryFilePath(
      new Date(2026, 4, 11),
      new Date(2026, 4, 17),
      '-Users-alice-Projects-my-app',
    );
    expect(p).toBe(
      path.join(tmpDir, '2026-05-11_to_2026-05-17__-Users-alice-Projects-my-app.md'),
    );
  });

  it('formatDateKey pads month and day', async () => {
    const { formatDateKey } = await import('../lib/summary');
    expect(formatDateKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });

  it('listSummaries returns empty when directory missing', async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const { listSummaries } = await import('../lib/summary');
    expect(listSummaries()).toEqual([]);
  });

  it('listSummaries parses date-only and project-suffixed filenames', async () => {
    fs.writeFileSync(path.join(tmpDir, '2026-05-17.md'), 'all');
    fs.writeFileSync(path.join(tmpDir, '2026-05-17__-Users-alice-Projects-my-app.md'), 'one');
    fs.writeFileSync(path.join(tmpDir, '2026-05-16.md'), 'older');
    fs.writeFileSync(path.join(tmpDir, 'not-a-summary.txt'), 'skip');

    const { listSummaries } = await import('../lib/summary');
    const entries = listSummaries();

    expect(entries).toHaveLength(3);
    expect(entries[0].date).toBe('2026-05-17');
    expect(entries[0].endDate).toBeNull();
    expect(entries[0].projectEncoded).toBeNull();
    expect(entries[1].date).toBe('2026-05-17');
    expect(entries[1].projectEncoded).toBe('-Users-alice-Projects-my-app');
    expect(entries[2].date).toBe('2026-05-16');
  });

  it('listSummaries parses range and range-with-project filenames', async () => {
    fs.writeFileSync(path.join(tmpDir, '2026-05-11_to_2026-05-17.md'), 'week');
    fs.writeFileSync(
      path.join(tmpDir, '2026-05-11_to_2026-05-17__-Users-alice-Projects-my-app.md'),
      'week+proj',
    );
    fs.writeFileSync(path.join(tmpDir, '2026-05-17.md'), 'single');

    const { listSummaries } = await import('../lib/summary');
    const entries = listSummaries();

    const range = entries.filter((e) => e.endDate !== null);
    expect(range).toHaveLength(2);
    expect(range[0].date).toBe('2026-05-11');
    expect(range[0].endDate).toBe('2026-05-17');
    const withProj = range.find((e) => e.projectEncoded !== null);
    expect(withProj?.projectEncoded).toBe('-Users-alice-Projects-my-app');

    const single = entries.find((e) => e.endDate === null);
    expect(single?.date).toBe('2026-05-17');
  });
});
