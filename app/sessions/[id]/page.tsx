import Link from 'next/link';
import { notFound } from 'next/navigation';
import { store } from '@/lib/session-store';
import '@/lib/init';
import { MessageList } from '@/components/message-list';
import type { SessionStatus } from '@/lib/types';

const STATUS_LABEL: Record<SessionStatus, string> = {
  active: 'Active',
  waiting: 'Waiting',
  idle: 'Idle',
  done: 'Done',
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  active: 'text-green-400',
  waiting: 'text-yellow-400',
  idle: 'text-gray-400',
  done: 'text-gray-600',
};

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const backHref = sp?.q ? `/?q=${encodeURIComponent(sp.q)}` : '/';
  const session = store.get(id);
  if (!session) notFound();

  const parts = session.projectPath.split('/').filter(Boolean);
  const projectName = parts.slice(-2).join('/') || session.projectPath;
  const totalTokens =
    session.tokens.input +
    session.tokens.output +
    session.tokens.cacheRead +
    session.tokens.cacheCreation;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-800">
        <Link href={backHref} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{projectName}</h1>
          <p className="text-xs text-gray-500 truncate">{session.projectPath}</p>
          <p className="text-xs text-gray-700 truncate font-mono">raw: {session.encodedFolder}</p>
        </div>
        <div className="flex items-center gap-4 text-sm flex-shrink-0">
          <span className={STATUS_COLOR[session.status]}>
            {STATUS_LABEL[session.status]}
          </span>
          <span className="text-gray-600">
            {new Date(session.startedAt).toLocaleTimeString()}
          </span>
          <span className="text-gray-600">{totalTokens.toLocaleString()} tokens</span>
          <span className="text-gray-600">${session.estimatedCost.toFixed(2)}</span>
        </div>
      </header>

      {/* Message list (client component with SWR polling) */}
      <MessageList sessionId={id} />
    </div>
  );
}
