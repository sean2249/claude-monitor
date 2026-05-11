import { describe, it, expect } from 'vitest';
import { computeStatus, ACTIVE_THRESHOLD_MS, DONE_THRESHOLD_MS } from '../lib/status';

function mtime(ageMs: number): Date {
  return new Date(Date.now() - ageMs);
}

describe('computeStatus', () => {
  it('returns active when age < 30s', () => {
    expect(computeStatus(mtime(10_000), 'assistant')).toBe('active');
    expect(computeStatus(mtime(10_000), 'user')).toBe('active');
    expect(computeStatus(mtime(29_999), null)).toBe('active');
  });

  it('returns done when age >= 1h, overriding role', () => {
    expect(computeStatus(mtime(DONE_THRESHOLD_MS), 'assistant')).toBe('done');
    expect(computeStatus(mtime(DONE_THRESHOLD_MS + 1), 'user')).toBe('done');
    expect(computeStatus(mtime(DONE_THRESHOLD_MS * 2), null)).toBe('done');
  });

  it('returns waiting when 30s <= age < 1h and last role is assistant', () => {
    const age = ACTIVE_THRESHOLD_MS + 1000;
    expect(computeStatus(mtime(age), 'assistant')).toBe('waiting');
  });

  it('returns idle when 30s <= age < 1h and last role is user', () => {
    const age = ACTIVE_THRESHOLD_MS + 1000;
    expect(computeStatus(mtime(age), 'user')).toBe('idle');
    expect(computeStatus(mtime(age), null)).toBe('idle');
  });

  it('done takes priority over role-based rules', () => {
    expect(computeStatus(mtime(DONE_THRESHOLD_MS + 1), 'assistant')).toBe('done');
  });

  it('exports threshold constants', () => {
    expect(ACTIVE_THRESHOLD_MS).toBe(30_000);
    expect(DONE_THRESHOLD_MS).toBe(3_600_000);
  });
});
