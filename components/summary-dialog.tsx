'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SummaryDialog({ open, onClose }: Props) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/summary/today')
      .then(async (r) => {
        setError(null);
        if (r.ok) {
          const data = await r.json() as { markdown: string };
          setMarkdown(data.markdown);
          setHasExisting(true);
        } else {
          setMarkdown(null);
          setHasExisting(false);
        }
      })
      .catch(() => {
        setError(null);
        setMarkdown(null);
        setHasExisting(false);
      });
  }, [open]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/summary/today', { method: 'POST' });
      const data = await r.json() as { markdown?: string; error?: string };
      if (!r.ok) {
        setError(data.error ?? 'Unknown error');
      } else {
        setMarkdown(data.markdown ?? null);
        setHasExisting(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Today&apos;s Summary</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {markdown ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No summary generated yet for today.</p>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-950 border border-red-800 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
          >
            {loading ? 'Generating…' : hasExisting ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
