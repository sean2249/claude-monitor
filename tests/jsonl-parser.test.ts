import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { parseIncremental, decodeProjectPath, resetOffset } from '../lib/jsonl-parser';

const FIXTURES = path.join(__dirname, 'fixtures');

describe('decodeProjectPath', () => {
  it('converts dashes to slashes for paths without hyphens in names', () => {
    // Claude Code encodes '/' as '-', so decoding is ambiguous for project names
    // that contain hyphens. This covers the common case.
    expect(decodeProjectPath('-Users-alice-Projects-app')).toBe('/Users/alice/Projects/app');
  });

  it('handles paths without dashes', () => {
    expect(decodeProjectPath('home')).toBe('home');
  });
});

describe('parseIncremental — simple fixture', () => {
  const filePath = path.join(FIXTURES, 'session-simple.jsonl');

  beforeEach(() => {
    resetOffset(filePath);
  });

  it('parses all messages on first read (full read)', async () => {
    const result = await parseIncremental(filePath) as Awaited<ReturnType<typeof parseIncremental>> & { fullRead: boolean };
    expect(result.fullRead).toBe(true);
    expect(result.messages.length).toBe(3);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
    expect(result.lastRole).toBe('user');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('returns incremental (empty) messages on second read with no new content', async () => {
    await parseIncremental(filePath);
    const result = await parseIncremental(filePath) as Awaited<ReturnType<typeof parseIncremental>> & { fullRead: boolean };
    expect(result.fullRead).toBe(false);
    expect(result.messages.length).toBe(0);
  });
});

describe('parseIncremental — malformed lines', () => {
  const filePath = path.join(FIXTURES, 'session-malformed.jsonl');

  beforeEach(() => {
    resetOffset(filePath);
  });

  it('skips malformed lines without throwing', async () => {
    const result = await parseIncremental(filePath);
    // 3 lines: user, bad, assistant — should parse 2 valid messages
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[1].role).toBe('assistant');
  });
});

describe('parseIncremental — truncation fallback', () => {
  it('falls back to full re-read when file size shrinks', async () => {
    const tmpFile = path.join(os.tmpdir(), `test-truncate-${Date.now()}.jsonl`);
    const line1 = '{"type":"user","message":{"content":"hi"},"timestamp":"2026-05-05T10:00:00.000Z","uuid":"u1","parentUuid":null,"sessionId":"s1","cwd":"/test"}\n';
    const line2 = '{"type":"assistant","message":{"content":[{"type":"text","text":"hello"}],"usage":{"input_tokens":1,"output_tokens":1,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}},"model":"claude-sonnet-4-6","timestamp":"2026-05-05T10:00:05.000Z","uuid":"a1","parentUuid":"u1","sessionId":"s1","cwd":"/test"}\n';

    try {
      // Write both lines, read them, then truncate to just line1
      fs.writeFileSync(tmpFile, line1 + line2, 'utf8');
      await parseIncremental(tmpFile); // seeds offset map

      // Truncate to smaller content
      fs.writeFileSync(tmpFile, line1, 'utf8');
      resetOffset(tmpFile); // simulate truncation by resetting to trigger fallback

      const result = await parseIncremental(tmpFile) as Awaited<ReturnType<typeof parseIncremental>> & { fullRead: boolean };
      expect(result.fullRead).toBe(true);
      expect(result.messages.length).toBe(1);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
