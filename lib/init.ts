// Next.js singleton pattern — ensures the file watcher is initialised exactly
// once per server process, surviving hot-module reloads in dev mode.
import { initWatcher } from './file-watcher';

const g = globalThis as typeof globalThis & { __watcherInit?: Promise<void> };

if (!g.__watcherInit) {
  g.__watcherInit = initWatcher().catch((err) => {
    console.error('[init] watcher failed to start:', err);
  });
}

export const watcherReady: Promise<void> = g.__watcherInit;
