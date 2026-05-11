import { describe, it, expect } from 'vitest';
import { estimateCost } from '../lib/pricing';
import type { Tokens } from '../lib/types';

const oneMillionTokens: Tokens = {
  input: 1_000_000,
  output: 1_000_000,
  cacheRead: 1_000_000,
  cacheCreation: 1_000_000,
};

const zeroTokens: Tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };

describe('estimateCost', () => {
  it('returns correct cost for claude-sonnet-4-6', () => {
    const cost = estimateCost(oneMillionTokens, 'claude-sonnet-4-6');
    // 3 + 15 + 0.3 + 3.75 = 22.05
    expect(cost).toBeCloseTo(22.05, 4);
  });

  it('returns correct cost for claude-opus-4-7', () => {
    const cost = estimateCost(oneMillionTokens, 'claude-opus-4-7');
    // 15 + 75 + 1.5 + 18.75 = 110.25
    expect(cost).toBeCloseTo(110.25, 4);
  });

  it('returns 0 for unknown model', () => {
    expect(estimateCost(oneMillionTokens, 'unknown-model-xyz')).toBe(0);
  });

  it('returns 0 for null model', () => {
    expect(estimateCost(oneMillionTokens, null)).toBe(0);
  });

  it('returns 0 for all-zero tokens', () => {
    expect(estimateCost(zeroTokens, 'claude-sonnet-4-6')).toBe(0);
  });
});
