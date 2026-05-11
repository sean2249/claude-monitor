import { NextResponse } from 'next/server';
import { watcherReady } from '@/lib/init';
import { store } from '@/lib/session-store';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await watcherReady;
  const { id } = await params;
  const session = store.get(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}
