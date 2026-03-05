interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60 * 1000);

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitHeaders(result: { remaining: number; resetAt: number }) {
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
