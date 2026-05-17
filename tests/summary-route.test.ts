import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/init', () => ({ watcherReady: Promise.resolve() }));

const sessionsMap = new Map<string, unknown>();
vi.mock('@/lib/session-store', () => ({
  store: {
    listProjects: () => [],
    digestsFor: () => ({
      digests: [],
      sessionCount: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      cost: 0,
    }),
    list: () => [],
    get: () => null,
    todayStats: () => ({
      sessionCount: 0,
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      cost: 0,
    }),
    aggregateWindow: () => ({
      tokens: { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 },
      oldestTokenTs: null,
    }),
    sessions: sessionsMap,
  },
}));

const anthropicCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: anthropicCreate };
    },
  };
});

const ORIGINAL_ENV = { ...process.env };
let tmpDir: string;

beforeEach(() => {
  vi.resetModules();
  anthropicCreate.mockReset();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-route-test-'));
  process.env.SUMMARIES_DIR = tmpDir;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.env = { ...ORIGINAL_ENV };
});

async function getRoute() {
  return await import('@/app/api/summary/[date]/route');
}

function req(url: string): Request {
  return new Request(url);
}

describe('GET /api/summary/[date]', () => {
  it('returns 400 for an invalid date', async () => {
    const { GET } = await getRoute();
    const res = await GET(req('http://test/api/summary/not-a-date'), {
      params: Promise.resolve({ date: 'not-a-date' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid project slug', async () => {
    const { GET } = await getRoute();
    const res = await GET(
      req('http://test/api/summary/2026-05-17?project=' + encodeURIComponent('../etc/passwd')),
      { params: Promise.resolve({ date: '2026-05-17' }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/project slug/i);
  });

  it('returns 404 when no summary file exists', async () => {
    const { GET } = await getRoute();
    const res = await GET(req('http://test/api/summary/2026-05-17'), {
      params: Promise.resolve({ date: '2026-05-17' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns markdown when summary file exists', async () => {
    fs.writeFileSync(path.join(tmpDir, '2026-05-17.md'), '# hello');
    const { GET } = await getRoute();
    const res = await GET(req('http://test/api/summary/2026-05-17'), {
      params: Promise.resolve({ date: '2026-05-17' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.markdown).toBe('# hello');
  });
});

describe('POST /api/summary/[date]', () => {
  it('returns 400 on invalid date', async () => {
    const { POST } = await getRoute();
    const res = await POST(req('http://test/api/summary/bogus'), {
      params: Promise.resolve({ date: 'bogus' }),
    });
    expect(res.status).toBe(400);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid project slug', async () => {
    const { POST } = await getRoute();
    const res = await POST(
      req('http://test/api/summary/2026-05-17?project=' + encodeURIComponent('../bad')),
      { params: Promise.resolve({ date: '2026-05-17' }) },
    );
    expect(res.status).toBe(400);
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when ANTHROPIC_API_KEY is missing', async () => {
    const { POST } = await getRoute();
    const res = await POST(req('http://test/api/summary/2026-05-17'), {
      params: Promise.resolve({ date: '2026-05-17' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('returns generated markdown on success', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    anthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# generated' }],
    });
    const { POST } = await getRoute();
    const res = await POST(req('http://test/api/summary/2026-05-17'), {
      params: Promise.resolve({ date: '2026-05-17' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.markdown).toBe('# generated');
    expect(anthropicCreate).toHaveBeenCalledOnce();
    expect(fs.readFileSync(path.join(tmpDir, '2026-05-17.md'), 'utf8')).toBe('# generated');
  });

  it('returns 500 on unexpected errors from the LLM call', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    anthropicCreate.mockRejectedValueOnce(new Error('boom'));
    const { POST } = await getRoute();
    const res = await POST(req('http://test/api/summary/2026-05-17'), {
      params: Promise.resolve({ date: '2026-05-17' }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('boom');
  });
});
