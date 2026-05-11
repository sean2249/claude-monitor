import chokidar from 'chokidar';
import { store } from './session-store';
import { claudeProjectsDir } from './config';

// chokidar v4 dropped glob support — watch the directory and filter .jsonl files in handlers.
const WATCH_DIR = claudeProjectsDir;

let initialised = false;

export async function initWatcher(): Promise<void> {
  if (initialised) return;
  initialised = true;

  const pending: Promise<void>[] = [];

  // chokidar v4 watches recursively by default (unlimited depth).
  // Subagent files live at <project>/<parent-uuid>/subagents/*.jsonl (4 levels deep)
  // and are discovered automatically. The .jsonl filter in each handler excludes noise.
  const watcher = chokidar.watch(WATCH_DIR, {
    persistent: true,
    ignoreInitial: false,
  });

  // Wire events BEFORE ready so initial 'add' events (which fire before ready) are captured.
  watcher.on('add', (filePath) => {
    if (!filePath.endsWith('.jsonl')) return;
    pending.push(store.upsertFromFile(filePath).catch(logErr));
  });
  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.jsonl')) return;
    store.upsertFromFile(filePath).catch(logErr);
  });
  watcher.on('unlink', (filePath) => {
    if (!filePath.endsWith('.jsonl')) return;
    store.removeFile(filePath);
  });
  watcher.on('error', (err) => { console.error('[file-watcher] error:', err); });

  // Wait until chokidar has finished its initial scan.
  await new Promise<void>((resolve) => { watcher.on('ready', resolve); });

  // Wait for all initial upserts to complete before declaring ready.
  await Promise.all(pending);
}

function logErr(err: unknown): void {
  console.error('[file-watcher] upsert error:', err);
}
