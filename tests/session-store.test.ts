import { describe, it, expect } from 'vitest';
import { aggregateEventsInWindow } from '../lib/session-store';
import type { TokenEvent } from '../lib/types';

function evt(ts: string, input = 100, output = 50): TokenEvent {
  return { ts: new Date(ts), input, output, cacheRead: 0, cacheCreation: 0 };
}

describe('aggregateEventsInWindow', () => {
  it('returns zeros and null oldestTokenTs when events array is empty', () => {
    const result = aggregateEventsInWindow([], new Date('2026-05-10T00:00:00Z'));
    expect(result.tokens).toEqual({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
    expect(result.oldestTokenTs).toBeNull();
  });

  it('sums all events when window covers them all', () => {
    const events = [
      evt('2026-05-10T08:00:00Z', 100, 50),
      evt('2026-05-10T09:00:00Z', 200, 75),
    ];
    const result = aggregateEventsInWindow(events, new Date('2026-05-10T00:00:00Z'));
    expect(result.tokens.input).toBe(300);
    expect(result.tokens.output).toBe(125);
    expect(result.oldestTokenTs?.toISOString()).toBe('2026-05-10T08:00:00.000Z');
  });

  it('returns zeros when no events fall within the window', () => {
    const events = [
      evt('2026-05-09T08:00:00Z', 100, 50),
      evt('2026-05-09T09:00:00Z', 200, 75),
    ];
    const result = aggregateEventsInWindow(events, new Date('2026-05-10T00:00:00Z'));
    expect(result.tokens).toEqual({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
    expect(result.oldestTokenTs).toBeNull();
  });

  it('includes events at the boundary and excludes those before', () => {
    const start = new Date('2026-05-10T00:00:00Z');
    const events = [
      evt('2026-05-09T23:59:59Z', 999, 999), // before
      evt('2026-05-10T00:00:00Z', 100, 50), // exactly at boundary — included
      evt('2026-05-10T05:00:00Z', 200, 75),
    ];
    const result = aggregateEventsInWindow(events, start);
    expect(result.tokens.input).toBe(300);
    expect(result.tokens.output).toBe(125);
    expect(result.oldestTokenTs?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });

  it('sums events from multiple sources (e.g. main + sidechain) when callers concatenate them', () => {
    // The store passes a flattened array from all sessions including sidechains;
    // this test confirms the helper does not care about origin.
    const main: TokenEvent[] = [evt('2026-05-10T08:00:00Z', 100, 50)];
    const sidechain: TokenEvent[] = [evt('2026-05-10T08:30:00Z', 50, 25)];
    const result = aggregateEventsInWindow(
      [...main, ...sidechain],
      new Date('2026-05-10T00:00:00Z'),
    );
    expect(result.tokens.input).toBe(150);
    expect(result.tokens.output).toBe(75);
  });

  it('tracks oldestTokenTs across events given out of chronological order', () => {
    const events = [
      evt('2026-05-10T10:00:00Z', 50, 25),
      evt('2026-05-10T05:00:00Z', 100, 50),
      evt('2026-05-10T08:00:00Z', 75, 30),
    ];
    const result = aggregateEventsInWindow(events, new Date('2026-05-10T00:00:00Z'));
    expect(result.oldestTokenTs?.toISOString()).toBe('2026-05-10T05:00:00.000Z');
  });
});
