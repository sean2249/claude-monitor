import fs from 'fs';
import { NextResponse } from 'next/server';
import { watcherReady } from '@/lib/init';
import {
  ApiKeyMissingError,
  generateSummary,
  isSafeProjectEncoded,
  summaryFilePath,
} from '@/lib/summary';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(dateStr: string): Date | null {
  if (!DATE_RE.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date: dateStr } = await params;
  const date = parseDate(dateStr);
  if (!date) {
    return NextResponse.json({ error: 'Invalid date. Expected YYYY-MM-DD.' }, { status: 400 });
  }
  const url = new URL(req.url);
  const projectEncoded = url.searchParams.get('project') ?? undefined;
  if (projectEncoded !== undefined && !isSafeProjectEncoded(projectEncoded)) {
    return NextResponse.json({ error: 'Invalid project slug.' }, { status: 400 });
  }

  const filePath = summaryFilePath(date, projectEncoded);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ markdown: content });
  } catch {
    return NextResponse.json({ error: 'No summary yet' }, { status: 404 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date: dateStr } = await params;
  const date = parseDate(dateStr);
  if (!date) {
    return NextResponse.json({ error: 'Invalid date. Expected YYYY-MM-DD.' }, { status: 400 });
  }
  const url = new URL(req.url);
  const projectEncoded = url.searchParams.get('project') ?? undefined;
  if (projectEncoded !== undefined && !isSafeProjectEncoded(projectEncoded)) {
    return NextResponse.json({ error: 'Invalid project slug.' }, { status: 400 });
  }

  try {
    await watcherReady;
    const markdown = await generateSummary({ date, projectEncoded });
    return NextResponse.json({ markdown });
  } catch (err) {
    if (err instanceof ApiKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
