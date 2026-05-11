'use client';

import useSWR from 'swr';
import { formatResetTime } from '@/lib/rate-limit-format';

type Stats = {
  sessionCount: number;
  tokens: { input: number; output: number; cacheRead: number; cacheCreation: number };
  cost: number;
};

type LimitsResponse = {
  fiveHr: { oldestTokenTs: string | null };
  weekly: { oldestTokenTs: string | null };
};

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StatsStrip() {
  const { data } = useSWR<Stats>('/api/stats/today', fetcher, { refreshInterval: 2000 });
  const { data: limits } = useSWR<LimitsResponse>('/api/stats/limits', fetcher, {
    refreshInterval: 2000,
  });

  const totalTokens = data
    ? data.tokens.input + data.tokens.output + data.tokens.cacheRead + data.tokens.cacheCreation
    : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400 px-6 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <span>
          Sessions:{' '}
          <span className="text-gray-200 font-medium">{data?.sessionCount ?? '–'}</span>
        </span>
        <span>·</span>
        <span>
          Tokens:{' '}
          <span className="text-gray-200 font-medium">
            {data ? totalTokens.toLocaleString() : '–'}
          </span>
        </span>
        <span>·</span>
        <span>
          Cost:{' '}
          <span className="text-gray-200 font-medium">
            ${data ? data.cost.toFixed(2) : '–'}
          </span>
        </span>
      </div>

      {limits && (
        <div className="flex items-center gap-4 ml-auto text-gray-500">
          {limits.fiveHr.oldestTokenTs && (
            <span>
              5hr resets in{' '}
              <span className="text-gray-300 tabular-nums">
                {formatResetTime(limits.fiveHr.oldestTokenTs, FIVE_HOURS_MS)}
              </span>
            </span>
          )}
          {limits.weekly.oldestTokenTs && (
            <span>
              Weekly resets in{' '}
              <span className="text-gray-300 tabular-nums">
                {formatResetTime(limits.weekly.oldestTokenTs, WEEK_MS)}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
