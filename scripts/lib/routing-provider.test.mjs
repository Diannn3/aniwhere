import { describe, expect, it, vi } from 'vitest';
import { createRoutingClient } from './routing-provider.mjs';

function response(status, body, headers = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: (key) => normalized[key.toLowerCase()] ?? null },
    text: async () => body,
  };
}

describe('routing provider client', () => {
  it('keeps authorization in the ops request and parses JSON', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(init.headers.Authorization).toBe('private-key');
      return response(200, '{"distances":[[1]],"durations":[[2]]}');
    });
    const request = createRoutingClient({
      baseUrl: 'https://api.heigit.org/openrouteservice/v2',
      apiKey: 'private-key',
      fetchImpl,
    });

    await expect(request('/matrix/driving-car', { locations: [] })).resolves.toMatchObject({
      distances: [[1]],
      durations: [[2]],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry authentication failures and redacts the key from errors', async () => {
    const fetchImpl = vi.fn(async () =>
      response(401, 'credential private-key rejected')
    );
    const request = createRoutingClient({
      baseUrl: 'https://routing.example',
      apiKey: 'private-key',
      fetchImpl,
      sleep: vi.fn(),
    });

    await expect(request('/matrix', {})).rejects.toThrow('[redacted]');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('honors Retry-After for rate limits before retrying', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return calls === 1
        ? response(429, 'slow down', { 'retry-after': '2' })
        : response(200, '{"ok":true}');
    });
    const sleep = vi.fn(async () => undefined);
    const request = createRoutingClient({
      baseUrl: 'https://routing.example',
      apiKey: 'private-key',
      fetchImpl,
      sleep,
    });

    await expect(request('/matrix', {})).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('retries temporary server failures within a bounded attempt count', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return calls < 3 ? response(503, 'temporary') : response(200, '{"ok":true}');
    });
    const request = createRoutingClient({
      baseUrl: 'https://routing.example',
      apiKey: 'private-key',
      fetchImpl,
      maxAttempts: 3,
      sleep: vi.fn(async () => undefined),
    });

    await expect(request('/matrix', {})).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries aborted requests but stops at the configured attempt limit', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      expect(init.signal).toBeDefined();
      throw error;
    });
    const sleep = vi.fn(async () => undefined);
    const request = createRoutingClient({
      baseUrl: 'https://routing.example',
      apiKey: 'private-key',
      fetchImpl,
      maxAttempts: 2,
      sleep,
    });

    await expect(request('/matrix', {})).rejects.toThrow('aborted');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('does not retry forbidden responses', async () => {
    const fetchImpl = vi.fn(async () => response(403, 'forbidden'));
    const sleep = vi.fn(async () => undefined);
    const request = createRoutingClient({
      baseUrl: 'https://routing.example',
      apiKey: 'private-key',
      fetchImpl,
      sleep,
    });

    await expect(request('/matrix', {})).rejects.toThrow('403');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('fails closed on malformed successful JSON instead of retrying', async () => {
    const fetchImpl = vi.fn(async () => response(200, 'not-json'));
    const request = createRoutingClient({
      baseUrl: 'https://routing.example',
      apiKey: 'private-key',
      fetchImpl,
      sleep: vi.fn(),
    });

    await expect(request('/matrix', {})).rejects.toThrow('malformed JSON');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
