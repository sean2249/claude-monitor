import { NextResponse } from 'next/server';
import { watcherReady } from '@/lib/init';
import { store } from '@/lib/session-store';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  await watcherReady;
  const now = new Date();
  const fiveHr = store.aggregateWindow(new Date(now.getTime() - FIVE_HOURS_MS));
  const weekly = store.aggregateWindow(new Date(now.getTime() - WEEK_MS));

  return NextResponse.json({
    fiveHr: {
      oldestTokenTs: fiveHr.oldestTokenTs ? fiveHr.oldestTokenTs.toISOString() : null,
    },
    weekly: {
      oldestTokenTs: weekly.oldestTokenTs ? weekly.oldestTokenTs.toISOString() : null,
    },
  });
}
