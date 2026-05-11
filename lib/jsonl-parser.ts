import fs from 'fs';
import path from 'path';
import type { Message, ContentBlock } from './types';

type OffsetEntry = { byteOffset: number; mtime: number };
const offsetMap = new Map<string, OffsetEntry>();

export type ParsedFile = {
  sessionId: string;
  projectPath: string;
  encodedFolder: string;
  isSidechain: boolean;
  parentSessionId: string | null;
  messages: Message[];
  firstTimestamp: Date | null;
  lastTimestamp: Date | null;
  lastRole: 'user' | 'assistant' | 'system' | null;
  model: string | null;
  lastToolName: string | null;
  aiTitle: string | null;
};

function extractPathInfo(filePath: string): {
  encodedFolder: string;
  isSidechain: boolean;
  parentSessionId: string | null;
} {
  // Subagent path: <base>/<encoded-project>/<parent-uuid>/subagents/<agent-id>.jsonl
  // Main path:     <base>/<encoded-project>/<uuid>.jsonl
  const parts = filePath.split('/');
  const subIdx = parts.lastIndexOf('subagents');
  if (subIdx > 1) {
    return {
      encodedFolder: parts[subIdx - 2],
      isSidechain: true,
      parentSessionId: parts[subIdx - 1],
    };
  }
  return {
    encodedFolder: path.basename(path.dirname(filePath)),
    isSidechain: false,
    parentSessionId: null,
  };
}

export function decodeProjectPath(encodedFolder: string): string {
  // Claude Code encodes cwd by replacing '/' with '-'
  // e.g. '-Users-alice-Projects-my-app' → '/Users/alice/Projects/my-app'
  return encodedFolder.replace(/-/g, '/');
}

export async function parseIncremental(filePath: string): Promise<ParsedFile> {
  const stat = fs.statSync(filePath);
  const entry = offsetMap.get(filePath);

  const needsFullRead =
    !entry || stat.size < entry.byteOffset || stat.mtimeMs < entry.mtime;

  const startOffset = needsFullRead ? 0 : entry!.byteOffset;

  const newLines = await readLinesFrom(filePath, startOffset);
  const parsed = parseLines(newLines.lines);

  offsetMap.set(filePath, { byteOffset: newLines.endOffset, mtime: stat.mtimeMs });

  // For a full re-read we return only new content; for incremental we append.
  // The session-store owns the merge; we return what was found.
  const sessionId = path.basename(filePath, '.jsonl');
  const { encodedFolder, isSidechain, parentSessionId } = extractPathInfo(filePath);
  const projectPath = decodeProjectPath(encodedFolder);

  return {
    sessionId,
    projectPath,
    encodedFolder,
    isSidechain,
    parentSessionId,
    messages: parsed.messages,
    firstTimestamp: parsed.firstTimestamp,
    lastTimestamp: parsed.lastTimestamp,
    lastRole: parsed.lastRole,
    model: parsed.model,
    lastToolName: parsed.lastToolName,
    aiTitle: parsed.aiTitle,
    // signal to caller whether this was a full re-read
    ...(needsFullRead ? { fullRead: true } : { fullRead: false }),
  } as ParsedFile & { fullRead: boolean };
}

export function resetOffset(filePath: string): void {
  offsetMap.delete(filePath);
}

async function readLinesFrom(
  filePath: string,
  offset: number,
): Promise<{ lines: string[]; endOffset: number }> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { start: offset });
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => { buffer += chunk; });
    stream.on('end', () => {
      const lines = buffer.split('\n').filter((l) => l.trim().length > 0);
      // endOffset = offset + byte length of consumed content
      const consumed = Buffer.byteLength(buffer, 'utf8');
      resolve({ lines, endOffset: offset + consumed });
    });
    stream.on('error', reject);
  });
}

function parseLines(lines: string[]): {
  messages: Message[];
  firstTimestamp: Date | null;
  lastTimestamp: Date | null;
  lastRole: 'user' | 'assistant' | 'system' | null;
  model: string | null;
  lastToolName: string | null;
  aiTitle: string | null;
} {
  const messages: Message[] = [];
  let firstTimestamp: Date | null = null;
  let lastTimestamp: Date | null = null;
  let lastRole: 'user' | 'assistant' | 'system' | null = null;
  let model: string | null = null;
  let lastToolName: string | null = null;
  let aiTitle: string | null = null;

  for (const line of lines) {
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line);
    } catch {
      console.warn('[jsonl-parser] skipping malformed line:', line.slice(0, 80));
      continue;
    }

    const type = obj.type as string;
    if (type === 'ai-title') {
      aiTitle = (obj.aiTitle as string) ?? null;
      continue;
    }
    if (type !== 'user' && type !== 'assistant' && type !== 'system') continue;

    const ts = obj.timestamp ? new Date(obj.timestamp as string) : new Date();
    if (!firstTimestamp) firstTimestamp = ts;
    lastTimestamp = ts;
    lastRole = type as 'user' | 'assistant' | 'system';

    if (type === 'assistant') {
      const msgObj = obj.message as Record<string, unknown> | undefined;
      const m = (msgObj?.model ?? obj.model) as string | undefined;
      if (m) model = m;

      // Track the last tool being called; reset if this message has no tool_use
      const content = msgObj?.content;
      if (Array.isArray(content)) {
        const toolUse = [...content].reverse().find(
          (b) => (b as Record<string, unknown>).type === 'tool_use',
        ) as Record<string, unknown> | undefined;
        lastToolName = toolUse ? (toolUse.name as string) : null;
      } else {
        lastToolName = null;
      }
    } else {
      // user/system message means Claude handed off — tool is no longer "active"
      lastToolName = null;
    }

    const msgContent = obj.message as Record<string, unknown> | undefined;
    const blocks = extractBlocks(msgContent);
    messages.push({ role: type as Message['role'], timestamp: ts, blocks });
  }

  return { messages, firstTimestamp, lastTimestamp, lastRole, model, lastToolName, aiTitle };
}

function extractBlocks(message: Record<string, unknown> | undefined): ContentBlock[] {
  if (!message) return [];
  const content = message.content;
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  if (Array.isArray(content)) {
    return content.map((block): ContentBlock => {
      const b = block as Record<string, unknown>;
      if (b.type === 'text') return { type: 'text', text: (b.text as string) ?? '' };
      if (b.type === 'tool_use')
        return { type: 'tool_use', id: b.id as string, name: b.name as string, input: b.input };
      if (b.type === 'tool_result')
        return {
          type: 'tool_result',
          tool_use_id: b.tool_use_id as string,
          content: (b.content as string) ?? '',
        };
      if (b.type === 'thinking')
        return { type: 'thinking', thinking: (b.thinking as string) ?? '' };
      return { type: 'text', text: JSON.stringify(b) };
    });
  }
  return [];
}
