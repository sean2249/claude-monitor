import { describe, it, expect } from 'vitest';
import { formatResetTime } from '../lib/rate-limit-format';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe('formatResetTime', () => {
  const now = new Date('2026-05-10T12:00:00Z');

  it('returns "—" when oldestTokenTs is null (empty window)', () => {
    expect(formatResetTime(null, FIVE_HOURS_MS, now)).toBe('—');
  });

  it('returns "Xh Ym" when remaining time is under one day', () => {
    // Oldest token 1h ago, 5h window → resets in 4h 0m
    const oldest = new Date(now.getTime() - 60 * 60_000).toISOString();
    expect(formatResetTime(oldest, FIVE_HOURS_MS, now)).toBe('4h 0m');
  });

  it('returns just "Ym" when under one hour remains', () => {
    // Oldest token 4h 30m ago, 5h window → resets in 30m
    const oldest = new Date(now.getTime() - (4 * 60 + 30) * 60_000).toISOString();
    expect(formatResetTime(oldest, FIVE_HOURS_MS, now)).toBe('30m');
  });

  it('returns "Xd Yh" when remaining time exceeds one day (weekly window)', () => {
    // Oldest token 2 days ago, 7-day window → resets in 5d 0h
    const oldest = new Date(now.getTime() - 2 * 24 * 60 * 60_000).toISOString();
    expect(formatResetTime(oldest, WEEK_MS, now)).toBe('5d 0h');
  });

  it('returns "now" when remaining time is zero or negative', () => {
    const oldest = new Date(now.getTime() - 6 * 60 * 60_000).toISOString();
    expect(formatResetTime(oldest, FIVE_HOURS_MS, now)).toBe('now');
  });
});
