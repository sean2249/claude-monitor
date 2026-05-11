import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';

const ORIGINAL_ENV = { ...process.env };

async function freshConfig() {
  vi.resetModules();
  return await import('../lib/config');
}

describe('lib/config', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_PROJECTS_DIR;
    delete process.env.SUMMARIES_DIR;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('claudeProjectsDir defaults to ~/.claude/projects when env unset', async () => {
    const { claudeProjectsDir } = await freshConfig();
    expect(claudeProjectsDir).toBe(path.join(os.homedir(), '.claude', 'projects'));
  });

  it('summariesDir defaults to <cwd>/data/summaries when env unset', async () => {
    const { summariesDir } = await freshConfig();
    expect(summariesDir).toBe(path.join(process.cwd(), 'data', 'summaries'));
  });

  it('CLAUDE_PROJECTS_DIR override is honored', async () => {
    process.env.CLAUDE_PROJECTS_DIR = '/tmp/custom-claude';
    const { claudeProjectsDir } = await freshConfig();
    expect(claudeProjectsDir).toBe('/tmp/custom-claude');
  });

  it('SUMMARIES_DIR override is honored', async () => {
    process.env.SUMMARIES_DIR = '/tmp/custom-summaries';
    const { summariesDir } = await freshConfig();
    expect(summariesDir).toBe('/tmp/custom-summaries');
  });

  it('tilde prefix in env var expands to home directory', async () => {
    process.env.CLAUDE_PROJECTS_DIR = '~/elsewhere/claude';
    const { claudeProjectsDir } = await freshConfig();
    expect(claudeProjectsDir).toBe(path.join(os.homedir(), 'elsewhere', 'claude'));
  });

  it('relative path in env var is resolved against cwd', async () => {
    process.env.SUMMARIES_DIR = './my-summaries';
    const { summariesDir } = await freshConfig();
    expect(summariesDir).toBe(path.resolve(process.cwd(), './my-summaries'));
  });

  it('empty env var falls back to default', async () => {
    process.env.CLAUDE_PROJECTS_DIR = '';
    const { claudeProjectsDir } = await freshConfig();
    expect(claudeProjectsDir).toBe(path.join(os.homedir(), '.claude', 'projects'));
  });

  it('resolved paths are always absolute', async () => {
    const { claudeProjectsDir, summariesDir } = await freshConfig();
    expect(path.isAbsolute(claudeProjectsDir)).toBe(true);
    expect(path.isAbsolute(summariesDir)).toBe(true);
  });
});
