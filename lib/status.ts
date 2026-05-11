import type { SessionStatus } from './types';

// Override via env vars (values in milliseconds): ACTIVE_THRESHOLD_MS, IDLE_THRESHOLD_MS, DONE_THRESHOLD_MS
export const ACTIVE_THRESHOLD_MS = Number(process.env.ACTIVE_THRESHOLD_MS) || 30_000;
export const IDLE_THRESHOLD_MS = Number(process.env.IDLE_THRESHOLD_MS) || 5 * 60_000;
export const DONE_THRESHOLD_MS = Number(process.env.DONE_THRESHOLD_MS) || 60 * 60_000;

export function computeStatus(
  mtime: Date,
  lastRole: 'user' | 'assistant' | 'system' | null,
): SessionStatus {
  const age = Date.now() - mtime.getTime();

  if (age >= DONE_THRESHOLD_MS) return 'done';
  if (age < ACTIVE_THRESHOLD_MS) return 'active';
  if (lastRole === 'assistant') return 'waiting';
  return 'idle';
}
