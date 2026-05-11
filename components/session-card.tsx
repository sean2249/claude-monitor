'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Session } from '@/lib/types';

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-400',
  waiting: 'bg-yellow-400',
  idle: 'bg-gray-500',
  done: 'bg-gray-700',
};

function relativeTime(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SessionCard({
  session,
  displayPath,
  subagents = [],
}: {
  session: Session;
  displayPath: string;
  subagents?: Session[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  function navTo(id: string) {
    router.push(q ? `/sessions/${id}?q=${encodeURIComponent(q)}` : `/sessions/${id}`);
  }

  const totalTokens =
    session.tokens.input +
    session.tokens.output +
    session.tokens.cacheRead +
    session.tokens.cacheCreation;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div
        onClick={() => navTo(session.id)}
        className="cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[session.status]}`} />
          <span className="font-medium text-gray-100 truncate">{displayPath}</span>
          {subagents.length > 0 && (
            <span className="ml-1 text-xs text-gray-600 flex-shrink-0 bg-gray-800 px-1.5 py-0.5 rounded">
              {subagents.length} agent{subagents.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
            {relativeTime(session.lastActivityAt)}
          </span>
        </div>
        {session.aiTitle && (
          <p className="text-xs text-gray-500 truncate mb-1 pl-4">{session.aiTitle}</p>
        )}
        {session.status === 'active' && session.lastToolName && (
          <p className="text-xs text-purple-400 mb-1">⚙ {session.lastToolName}</p>
        )}
        {session.lastMessagePreview && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">{session.lastMessagePreview}</p>
        )}
        <div className="flex gap-3 text-xs text-gray-600">
          <span>{totalTokens.toLocaleString()} tokens</span>
          <span>${session.estimatedCost.toFixed(2)}</span>
        </div>
      </div>

      {subagents.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-800 space-y-1">
          {subagents.map((sub) => (
            <div
              key={sub.id}
              onClick={(e) => { e.stopPropagation(); navTo(sub.id); }}
              className="cursor-pointer flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[sub.status]}`} />
              <span className="text-xs text-gray-500 truncate flex-1 font-mono">{sub.id.slice(0, 16)}…</span>
              <span className="text-xs text-gray-700 flex-shrink-0">{relativeTime(sub.lastActivityAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionRow({ session, displayPath }: { session: Session; displayPath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  return (
    <div
      onClick={() => router.push(q ? `/sessions/${session.id}?q=${encodeURIComponent(q)}` : `/sessions/${session.id}`)}
      className="cursor-pointer flex items-center gap-3 py-2 px-4 hover:bg-gray-900 rounded transition-colors"
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[session.status]}`} />
      <span className="text-sm text-gray-300 truncate flex-1">{displayPath}</span>
      <span className="text-xs text-gray-500">{relativeTime(session.lastActivityAt)}</span>
      <span className="text-xs text-gray-600">{session.messageCount} msgs</span>
    </div>
  );
}
