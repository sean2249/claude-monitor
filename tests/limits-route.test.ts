import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/init', () => ({ watcherReady: Promise.resolve() }));

const aggregateWindow = vi.fn();
vi.mock('@/lib/session-store', () => ({ store: { aggregateWindow } }));

beforeEach(() => {
  aggregateWindow.mockReset();
});

describe('GET /api/stats/limits', () => {
  it('returns oldestTokenTs for both windows when usage exists', async () => {
    aggregateWindow
      .mockReturnValueOnce({
        tokens: { input: 100, output: 50, cacheRead: 25, cacheCreation: 10 },
        oldestTokenTs: new Date('2026-05-10T08:00:00Z'),
      })
      .mockReturnValueOnce({
        tokens: { input: 1000, output: 500, cacheRead: 250, cacheCreation: 100 },
        oldestTokenTs: new Date('2026-05-04T12:00:00Z'),
      });

    const { GET } = await import('@/app/api/stats/limits/route');
    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({
      fiveHr: { oldestTokenTs: '2026-05-10T08:00:00.000Z' },
      weekly: { oldestTokenTs: '2026-05-04T12:00:00.000Z' },
    });
  });

  it('returns null oldestTokenTs when window is empty', async () => {
    aggregateWindow.mockReturnValue({
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      oldestTokenTs: null,
    });

    const { GET } = await import('@/app/api/stats/limits/route');
    const res = await GET();
    const body = await res.json();

    expect(body.fiveHr.oldestTokenTs).toBeNull();
    expect(body.weekly.oldestTokenTs).toBeNull();
  });
});
