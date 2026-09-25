export function createRequestLimiter({
  windowMs = 60_000,
  maxRequests = 12,
  maxBuckets = 512,
  now = () => Date.now(),
} = {}) {
  const buckets = new Map();

  function prune(current) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= current) buckets.delete(key);
    }
  }

  function capacityRetryAfterSeconds(current) {
    let earliestReset = Infinity;
    for (const bucket of buckets.values()) {
      earliestReset = Math.min(earliestReset, bucket.resetAt);
    }
    return Number.isFinite(earliestReset)
      ? Math.max(1, Math.ceil((earliestReset - current) / 1000))
      : 1;
  }

  return {
    allow(key = 'unknown') {
      const current = now();
      if (buckets.size >= maxBuckets) prune(current);
      const bucket = buckets.get(key);
      if (!bucket && buckets.size >= maxBuckets) {
        return {
          allowed: false,
          retryAfterSeconds: capacityRetryAfterSeconds(current),
        };
      }
      if (!bucket || bucket.resetAt <= current) {
        buckets.set(key, { count: 1, resetAt: current + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      bucket.count += 1;
      if (bucket.count <= maxRequests) {
        return { allowed: true, retryAfterSeconds: 0 };
      }
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)),
      };
    },
  };
}
