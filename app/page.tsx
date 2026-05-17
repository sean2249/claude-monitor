'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { StatsStrip } from '@/components/stats-strip';
import { SessionCard } from '@/components/session-card';
import { SummaryDialog } from '@/components/summary-dialog';
import { commonPrefixParts, relativeDisplayPath } from '@/lib/display';
import type { Session } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: sessions = [] } = useSWR<Session[]>('/api/sessions', fetcher, {
    refreshInterval: 2000,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const filter = searchParams.get('q') ?? '';

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value);
    else params.delete('q');
    router.replace(`/?${params.toString()}`, { scroll: false });
  }

  // Only main (non-sidechain) sessions reach here from the API — safe to use all for prefix
  const prefixLen = commonPrefixParts(sessions.map((s) => s.projectPath)).length;

  const visible = filter
    ? sessions.filter((s) =>
        relativeDisplayPath(s.projectPath, prefixLen).toLowerCase().includes(filter.toLowerCase()),
      )
    : sessions;

  const activeSessions = visible.filter((s) => s.status === 'active');
  const waitingSessions = visible.filter((s) => s.status === 'waiting');
  const idleSessions = visible.filter((s) => s.status === 'idle');
  const archiveSessions = visible.filter((s) => s.status === 'done');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">Claude Monitor</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter sessions…"
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500 w-48"
          />
          <button
            onClick={() => setDialogOpen(true)}
            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          >
            Generate Today&apos;s Summary
          </button>
          <Link
            href="/summaries"
            className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
          >
            Summaries
          </Link>
        </div>
      </header>

      {/* Stats */}
      <StatsStrip />

      {/* Content */}
      <main className="flex-1 px-6 py-6 space-y-8">
        {/* Active */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Active
          </h2>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-gray-600">No active sessions</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((s) => (
                <SessionCard key={s.id} session={s} displayPath={relativeDisplayPath(s.projectPath, prefixLen)} subagents={s.subagents ?? []} />
              ))}
            </div>
          )}
        </section>

        {/* Waiting for input */}
        {waitingSessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-3">
              Waiting for your input
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingSessions.map((s) => (
                <SessionCard key={s.id} session={s} displayPath={relativeDisplayPath(s.projectPath, prefixLen)} subagents={s.subagents ?? []} />
              ))}
            </div>
          </section>
        )}

        {/* Idle */}
        {idleSessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Idle
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {idleSessions.map((s) => (
                <SessionCard key={s.id} session={s} displayPath={relativeDisplayPath(s.projectPath, prefixLen)} subagents={s.subagents ?? []} />
              ))}
            </div>
          </section>
        )}

        {/* Archive — collapsed by default */}
        {archiveSessions.length > 0 && (
          <section>
            <button
              onClick={() => setArchiveOpen((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 hover:text-gray-500 transition-colors"
            >
              <span>{archiveOpen ? '▾' : '▸'}</span>
              Archive ({archiveSessions.length})
            </button>
            {archiveOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {archiveSessions.map((s) => (
                  <SessionCard key={s.id} session={s} displayPath={relativeDisplayPath(s.projectPath, prefixLen)} subagents={s.subagents ?? []} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <SummaryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
