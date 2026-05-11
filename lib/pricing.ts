import type { Tokens } from './types';

type Rates = {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
};

// Rates in USD per 1M tokens
const PRICING: Record<string, Rates> = {
  'claude-opus-4-7': {
    input: 15.0,
    output: 75.0,
    cacheRead: 1.5,
    cacheCreation: 18.75,
  },
  'claude-sonnet-4-6': {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.3,
    cacheCreation: 3.75,
  },
  'claude-haiku-4-5-20251001': {
    input: 0.8,
    output: 4.0,
    cacheRead: 0.08,
    cacheCreation: 1.0,
  },
  // aliases
  'claude-sonnet-4-5': {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.3,
    cacheCreation: 3.75,
  },
};

export function estimateCost(tokens: Tokens, model: string | null): number {
  if (!model) return 0;
  const rates = PRICING[model];
  if (!rates) return 0;

  const M = 1_000_000;
  return (
    (tokens.input / M) * rates.input +
    (tokens.output / M) * rates.output +
    (tokens.cacheRead / M) * rates.cacheRead +
    (tokens.cacheCreation / M) * rates.cacheCreation
  );
}
