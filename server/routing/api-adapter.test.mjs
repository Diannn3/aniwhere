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
  };
}

describe('runtime route API adapter', () => {
  it('rejects non-POST methods', async () => {
    const res = response();
    await handler({ method: 'GET', headers: {}, socket: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'method_not_allowed' });
    expect(res.headers.Allow).toBe('POST');
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
