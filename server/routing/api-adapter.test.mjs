import { describe, expect, it } from 'vitest';
import handler from '../../api/route-estimate.js';

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end(body) { this.body = body; return this; },
  };
}

describe('runtime route API adapter', () => {
  it('rejects non-POST methods', async () => {
    const res = response();
    await handler({ method: 'GET', headers: {}, socket: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'method_not_allowed' });
    expect(res.headers.Allow).toBe('POST, OPTIONS');
  });

  it('rejects cross-site browser requests before provider work', async () => {
    const res = response();
    await handler({
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        host: 'aniwhere.example',
        'x-forwarded-proto': 'https',
      },
      socket: {},
      body: {
        originMunicipalityId: 'los-banos',
        destination: { lat: 14.275, lng: 121.459 },
      },
    }, res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'origin_not_allowed' });
  });

  it('allows the same browser origin to reach normal validation', async () => {
    const previous = process.env.ORS_API_KEY;
    delete process.env.ORS_API_KEY;
    try {
      const res = response();
      await handler({
        method: 'POST',
        headers: {
          origin: 'https://aniwhere.example',
          host: 'aniwhere.example',
          'x-forwarded-proto': 'https',
        },
        socket: { remoteAddress: '127.0.0.3' },
        body: {
          originMunicipalityId: 'los-banos',
          destination: { lat: 14.275, lng: 121.459 },
        },
      }, res);
      expect(res.statusCode).toBe(503);
      expect(res.body).toEqual({ error: 'routing_not_configured' });
    } finally {
      if (previous === undefined) delete process.env.ORS_API_KEY;
      else process.env.ORS_API_KEY = previous;
    }
  });

  it('answers CORS preflight only for an explicitly trusted origin', async () => {
    const previous = process.env.ROUTING_ALLOWED_ORIGINS;
    process.env.ROUTING_ALLOWED_ORIGINS = 'https://preview.example';
    try {
      const res = response();
      await handler({
        method: 'OPTIONS',
        headers: {
          origin: 'https://preview.example',
          host: 'api.aniwhere.example',
          'x-forwarded-proto': 'https',
        },
        socket: {},
      }, res);
      expect(res.statusCode).toBe(204);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('https://preview.example');
      expect(res.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
      expect(res.headers.Vary).toBe('Origin');
    } finally {
      if (previous === undefined) delete process.env.ROUTING_ALLOWED_ORIGINS;
      else process.env.ROUTING_ALLOWED_ORIGINS = previous;
    }
  });

  it('rejects oversized bodies before provider work', async () => {
    const res = response();
    await handler({
      method: 'POST',
      headers: {},
      socket: {},
      body: { padding: 'x'.repeat(5000) },
    }, res);
    expect(res.statusCode).toBe(413);
    expect(res.body).toEqual({ error: 'payload_too_large' });
  });

  it('fails closed without a server routing key', async () => {
    const previous = process.env.ORS_API_KEY;
    delete process.env.ORS_API_KEY;
    try {
      const res = response();
      await handler({
        method: 'POST',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        body: {
          originMunicipalityId: 'los-banos',
          destination: { lat: 14.275, lng: 121.459 },
        },
      }, res);
      expect(res.statusCode).toBe(503);
      expect(res.body).toEqual({ error: 'routing_not_configured' });
      expect(res.headers['Cache-Control']).toBe('no-store');
    } finally {
      if (previous === undefined) delete process.env.ORS_API_KEY;
      else process.env.ORS_API_KEY = previous;
    }
  });
});
