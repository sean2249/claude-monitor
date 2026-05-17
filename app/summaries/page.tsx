'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { commonPrefixParts, relativeDisplayPath } from '@/lib/display';
import type { SummaryListEntry } from '@/lib/summary';

type ProjectInfo = {
  encodedFolder: string;
  projectPath: string;
  lastActivityAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

async function summaryFetcher(url: string): Promise<string | null> {
  const r = await fetch(url);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Failed to load summary (${r.status})`);
  const data = (await r.json()) as { markdown: string };
  return data.markdown;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildSummaryUrl(date: string, projectEncoded: string | null): string {
  const base = `/api/summary/${date}`;
  return projectEncoded ? `${base}?project=${encodeURIComponent(projectEncoded)}` : base;
}

export default function SummariesPage() {
  const [date, setDate] = useState<string>(todayKey());
  const [projectEncoded, setProjectEncoded] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: history = [], mutate: mutateHistory } = useSWR<SummaryListEntry[]>(
    '/api/summary/list',
    fetcher,
  );
  const { data: projects = [] } = useSWR<ProjectInfo[]>('/api/projects', fetcher);

  const summaryUrl = buildSummaryUrl(date, projectEncoded);
  const {
    data: markdown = null,
    isLoading: loading,
    mutate: mutateSummary,
  } = useSWR<string | null>(summaryUrl, summaryFetcher);

  const prefixLen = useMemo(
    () => commonPrefixParts(projects.map((p) => p.projectPath)).length,
    [projects],
  );

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(summaryUrl, { method: 'POST' });
      const data = (await r.json()) as { markdown?: string; error?: string };
      if (!r.ok) {
        setError(data.error ?? 'Unknown error');
      } else {
        await mutateSummary(data.markdown ?? null, { revalidate: false });
        mutateHistory();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  function selectHistory(entry: SummaryListEntry) {
    setDate(entry.date);
    setProjectEncoded(entry.projectEncoded);
  }

  const hasExisting = markdown !== null;
  const selectedProject = projects.find((p) => p.encodedFolder === projectEncoded);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Summaries</h1>
        </div>
      </header>

      <main className="flex-1 flex">
        {/* Left: history list */}
        <aside className="w-72 border-r border-gray-800 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              History ({history.length})
            </h2>
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-600">No summaries yet.</p>
          ) : (
            <ul>
              {history.map((entry) => {
                const isSelected =
                  entry.date === date && entry.projectEncoded === projectEncoded;
                const label = entry.projectPath
                  ? relativeDisplayPath(entry.projectPath, prefixLen)
                  : entry.projectEncoded ?? 'All projects';
                return (
                  <li key={`${entry.date}__${entry.projectEncoded ?? ''}`}>
                    <button
                      onClick={() => selectHistory(entry)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-900 hover:bg-gray-900 transition-colors ${
                        isSelected ? 'bg-gray-900' : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-200">{entry.date}</div>
                      <div className="text-xs text-gray-500 truncate" title={label}>
                        {entry.projectEncoded ? label : 'All projects'}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right: controls + content */}
        <section className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-gray-500"
            />
            <label className="text-xs text-gray-500 uppercase tracking-wider ml-2">Project</label>
            <select
              value={projectEncoded ?? ''}
              onChange={(e) => setProjectEncoded(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-gray-500 min-w-[12rem]"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.encodedFolder} value={p.encodedFolder}>
                  {relativeDisplayPath(p.projectPath, prefixLen)}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={generate}
              disabled={generating}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {generating ? 'Generating…' : hasExisting ? 'Regenerate' : 'Generate'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {selectedProject && (
              <div className="mb-4 text-xs text-gray-500">
                Scope: <span className="text-gray-300">{selectedProject.projectPath}</span>
              </div>
            )}
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : markdown ? (
              <div className="prose prose-invert prose-sm max-w-3xl">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No summary for {date}
                {projectEncoded ? ` · ${selectedProject?.projectPath ?? projectEncoded}` : ''}.
                Click <span className="text-gray-300">Generate</span> to create one.
              </p>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-950 border border-red-800 rounded text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
