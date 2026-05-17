import fs from 'fs';
import { NextResponse } from 'next/server';
import '@/lib/init';
import { watcherReady } from '@/lib/init';
import {
  ApiKeyMissingError,
  EmptyRangeError,
  generateRangeSummary,
  isSafeProjectEncoded,
  rangeSummaryFilePath,
} from '@/lib/summary';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(dateStr: string): Date | null {
  if (!DATE_RE.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function parseRange(start: string, end: string): { start: Date; end: Date } | { error: string } {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) {
    return { error: 'Invalid date. Expected YYYY-MM-DD.' };
  }
  if (startDate > endDate) {
    return { error: 'Start date must be on or before end date.' };
  }
  return { start: startDate, end: endDate };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ start: string; end: string }> },
) {
  const { start, end } = await params;
  const parsed = parseRange(start, end);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const url = new URL(req.url);
  const projectEncoded = url.searchParams.get('project') ?? undefined;
  if (projectEncoded !== undefined && !isSafeProjectEncoded(projectEncoded)) {
    return NextResponse.json({ error: 'Invalid project slug.' }, { status: 400 });
  }

  const filePath = rangeSummaryFilePath(parsed.start, parsed.end, projectEncoded);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ markdown: content });
  } catch {
    return NextResponse.json({ error: 'No summary yet' }, { status: 404 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ start: string; end: string }> },
) {
  const { start, end } = await params;
  const parsed = parseRange(start, end);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const url = new URL(req.url);
  const projectEncoded = url.searchParams.get('project') ?? undefined;
  if (projectEncoded !== undefined && !isSafeProjectEncoded(projectEncoded)) {
    return NextResponse.json({ error: 'Invalid project slug.' }, { status: 400 });
  }

  try {
    await watcherReady;
    const markdown = await generateRangeSummary({
      startDate: parsed.start,
      endDate: parsed.end,
      projectEncoded,
    });
    return NextResponse.json({ markdown });
  } catch (err) {
    if (err instanceof ApiKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof EmptyRangeError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
