import os from 'os';
import path from 'path';

function resolveAbsolute(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(os.homedir(), p.slice(1));
  }
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

export const claudeProjectsDir: string = resolveAbsolute(
  process.env.CLAUDE_PROJECTS_DIR && process.env.CLAUDE_PROJECTS_DIR.trim() !== ''
    ? process.env.CLAUDE_PROJECTS_DIR
    : path.join(os.homedir(), '.claude', 'projects'),
);

export const summariesDir: string = resolveAbsolute(
  process.env.SUMMARIES_DIR && process.env.SUMMARIES_DIR.trim() !== ''
    ? process.env.SUMMARIES_DIR
    : path.join(process.cwd(), 'data', 'summaries'),
);
