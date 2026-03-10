/**
 * In-memory token bucket rate limiter.
 *
 * LIMITATION: This only works within a single serverless instance.
 * On Vercel, each cold start gets a fresh bucket. For production at scale,
 * replace with Vercel KV, Upstash Redis, or similar external store.
 * For MVP with moderate traffic, this provides basic protection within
 * warm instances.
 */

const buckets = new Map<string, { tokens: number; lastRefill: number }>();

const MAX_TOKENS = 100;
const REFILL_RATE_PER_MS = 100 / 60_000; // 100 tokens per 60 seconds
const CLEANUP_INTERVAL = 300_000; // 5 min
let lastCleanup = Date.now();

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();

  // Periodic cleanup to prevent memory leak
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastRefill > CLEANUP_INTERVAL) {
        buckets.delete(key);
      }
    }
    lastCleanup = now;
  }

  let bucket = buckets.get(identifier);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS - 1, lastRefill: now };
    buckets.set(identifier, bucket);
    return true;
  }

  // Refill based on elapsed time since last refill
  const elapsed = now - bucket.lastRefill;
  const refill = elapsed * REFILL_RATE_PER_MS;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + refill);
  bucket.lastRefill = now; // Always update lastRefill to prevent double-counting

  if (bucket.tokens < 1) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}
