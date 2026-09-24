import { describe, expect, it } from 'vitest';
import { createRequestLimiter } from './rate-limit.mjs';

describe('runtime route request limiter', () => {
  it('limits repeated requests per client and resets after the window', () => {
    let time = 1_000;
    const limiter = createRequestLimiter({
      windowMs: 10_000,
      maxRequests: 2,
      now: () => time,
    });
    expect(limiter.allow('client').allowed).toBe(true);
    expect(limiter.allow('client').allowed).toBe(true);
    expect(limiter.allow('client')).toEqual({
      allowed: false,
      retryAfterSeconds: 10,
    });
    expect(limiter.allow('other').allowed).toBe(true);
    time += 10_001;
    expect(limiter.allow('client').allowed).toBe(true);
  });
});
