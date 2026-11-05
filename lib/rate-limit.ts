/**
 * Counts requests per key in a fixed one-minute window. It lives in memory, so each server instance
 * counts on its own: enough to stop one client hammering AI calls and uploads, not a global quota.
 */
const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;

type Window = { startedAt: number; count: number };

export function createRateLimiter(maxPerMinute: number) {
  const windows = new Map<string, Window>();

  return function isAllowed(key: string, now = Date.now()): boolean {
    const current = windows.get(key);
    if (!current || now - current.startedAt >= WINDOW_MS) {
      if (windows.size >= MAX_KEYS) windows.clear();
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= maxPerMinute;
  };
}
