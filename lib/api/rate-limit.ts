const tokenBuckets = new Map<
  string,
  { tokens: number; lastRefill: number }
>();

const MAX_TOKENS = 100;
const REFILL_RATE = 100; // tokens per minute
const REFILL_INTERVAL = 60_000; // 1 minute

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  let bucket = tokenBuckets.get(identifier);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    tokenBuckets.set(identifier, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed > REFILL_INTERVAL) {
    bucket.tokens = MAX_TOKENS;
    bucket.lastRefill = now;
  } else {
    const refill = Math.floor((elapsed / REFILL_INTERVAL) * REFILL_RATE);
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + refill);
  }

  if (bucket.tokens <= 0) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}
