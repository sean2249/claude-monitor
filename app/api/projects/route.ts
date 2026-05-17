import { NextResponse } from 'next/server';
import { watcherReady } from '@/lib/init';
import { store } from '@/lib/session-store';

export async function GET() {
  await watcherReady;
  return NextResponse.json(store.listProjects());
}
