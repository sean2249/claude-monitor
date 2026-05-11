export type SessionStatus = 'active' | 'waiting' | 'idle' | 'done';

export type Tokens = {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
};

export type TokenEvent = {
  ts: Date;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
};

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string | ContentBlock[] }
  | { type: 'thinking'; thinking: string };

export type Message = {
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  blocks: ContentBlock[];
};

export type Session = {
  id: string;
  projectPath: string;
  encodedFolder: string;
  filePath: string;
  startedAt: Date;
  lastActivityAt: Date;
  status: SessionStatus;
  messageCount: number;
  tokens: Tokens;
  estimatedCost: number;
  lastMessagePreview: string;
  model: string | null;
  lastToolName: string | null;
  aiTitle: string | null;
  isSidechain: boolean;
  parentSessionId: string | null;
  subagents?: Session[];
};

export type SessionDetail = Session & { messages: Message[] };

export type SessionDigest = {
  project: string;
  startedAt: string;
  endedAt: string;
  status: SessionStatus;
  messageCount: number;
  tokens: Tokens;
  cost: number;
  firstUserMessage: string;
  lastAssistantMessage: string;
};
