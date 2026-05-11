import { describe, it, expect } from 'vitest';
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
