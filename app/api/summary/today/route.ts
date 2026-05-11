import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import '@/lib/init';
import { generateTodaySummary, ApiKeyMissingError } from '@/lib/summary';
import { summariesDir } from '@/lib/config';

function summaryFilePath(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return path.join(summariesDir, `${date}.md`);
}

export async function GET() {
  const filePath = summaryFilePath();
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json({ markdown: content });
  } catch {
    return NextResponse.json({ error: 'No summary yet' }, { status: 404 });
  }
}

export async function POST() {
  try {
    const markdown = await generateTodaySummary();
    return NextResponse.json({ markdown });
  } catch (err) {
    if (err instanceof ApiKeyMissingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
