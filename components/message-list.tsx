'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { SessionDetail, ContentBlock } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type HighlightCache = Record<string, string>;

export function MessageList({ sessionId }: { sessionId: string }) {
  const { data } = useSWR<SessionDetail>(
    `/api/sessions/${sessionId}`,
    fetcher,
    { refreshInterval: 2000 },
  );

  const [highlights, setHighlights] = useState<HighlightCache>({});

  // Syntax highlight code blocks with shiki
  useEffect(() => {
    const messages = data?.messages ?? [];
    const codeBlocks: { key: string; code: string; lang: string }[] = [];

    for (const msg of messages) {
      for (const block of msg.blocks) {
        if (block.type === 'text') {
          const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
          let m;
          while ((m = codeRegex.exec(block.text)) !== null) {
            const key = `${m[1]}:${m[2].slice(0, 40)}`;
            if (!highlights[key]) {
              codeBlocks.push({ key, code: m[2], lang: m[1] || 'text' });
            }
          }
        }
      }
    }

    if (codeBlocks.length === 0) return;

    import('shiki').then(({ codeToHtml }) => {
      Promise.all(
        codeBlocks.map(({ key, code, lang }) =>
          codeToHtml(code, { lang: lang as string, theme: 'github-dark' })
            .then((html) => ({ key, html }))
            .catch(() => ({ key, html: `<pre><code>${escapeHtml(code)}</code></pre>` })),
        ),
      ).then((results) => {
        setHighlights((prev) => {
          const next = { ...prev };
          for (const { key, html } of results) next[key] = html;
          return next;
        });
      });
    });
  }, [data?.messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const messages = [...(data?.messages ?? [])].reverse();

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.map((msg, i) => (
        <MessageBubble key={i} role={msg.role} blocks={msg.blocks} highlights={highlights} />
      ))}
    </div>
  );
}

function MessageBubble({
  role,
  blocks,
  highlights,
}: {
  role: string;
  blocks: ContentBlock[];
  highlights: HighlightCache;
}) {
  const roleStyles: Record<string, string> = {
    user: 'bg-blue-950 border-blue-800 ml-8',
    assistant: 'bg-gray-900 border-gray-800 mr-8',
    system: 'bg-gray-950 border-gray-700 text-gray-500 text-xs',
  };
  const roleLabel: Record<string, string> = {
    user: 'You',
    assistant: 'Claude',
    system: 'System',
  };

  return (
    <div className={`rounded-lg border p-4 ${roleStyles[role] ?? 'bg-gray-900 border-gray-800'}`}>
      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        {roleLabel[role] ?? role}
      </div>
      <div className="space-y-2">
        {blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} highlights={highlights} />
        ))}
      </div>
    </div>
  );
}

function BlockRenderer({ block, highlights }: { block: ContentBlock; highlights: HighlightCache }) {
  if (block.type === 'text') {
    return <TextRenderer text={block.text} highlights={highlights} />;
  }
  if (block.type === 'tool_use') {
    return (
      <details className="bg-gray-800 rounded text-xs font-mono">
        <summary className="px-3 py-2 cursor-pointer list-none flex items-center gap-2">
          <span className="text-purple-400">tool_use</span>
          <span className="text-yellow-300">{block.name}</span>
        </summary>
        {block.input != null && (
          <pre className="px-3 pb-3 text-gray-400 whitespace-pre-wrap overflow-x-auto border-t border-gray-700 mt-0 pt-2">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        )}
      </details>
    );
  }
  if (block.type === 'tool_result') {
    const content =
      typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content, null, 2);
    return (
      <details className="bg-gray-800 rounded text-xs font-mono">
        <summary className="px-3 py-2 cursor-pointer list-none flex items-center gap-2">
          <span className="text-green-400">tool_result</span>
        </summary>
        <pre className="px-3 pb-3 text-gray-400 whitespace-pre-wrap overflow-x-auto max-h-40 border-t border-gray-700 pt-2">
          {content.slice(0, 2000)}
        </pre>
      </details>
    );
  }
  if (block.type === 'thinking') {
    return (
      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer text-gray-500">thinking</summary>
        <pre className="mt-1 whitespace-pre-wrap">{block.thinking}</pre>
      </details>
    );
  }
  return null;
}

function TextRenderer({ text, highlights }: { text: string; highlights: HighlightCache }) {
  const parts = text.split(/(```\w*\n[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          const key = `${codeMatch[1]}:${codeMatch[2].slice(0, 40)}`;
          const html = highlights[key];
          if (html) {
            return (
              <div
                key={i}
                className="rounded overflow-x-auto text-sm [&_pre]:p-4 [&_pre]:rounded"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
          return (
            <pre key={i} className="bg-gray-800 rounded p-3 text-sm overflow-x-auto whitespace-pre-wrap">
              <code>{codeMatch[2]}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
            {part}
          </p>
        );
      })}
    </>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
