import { NextResponse } from 'next/server';
import { watcherReady } from '@/lib/init';
import { listSummaries } from '@/lib/summary';

export async function GET() {
  await watcherReady;
  return NextResponse.json(listSummaries());
}
