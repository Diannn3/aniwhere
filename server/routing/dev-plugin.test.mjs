import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runtimeRoutingDevPlugin } from './dev-plugin.mjs';

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(value = '') { this.body = value; },
  };
}

function registeredMiddleware() {
  const plugin = runtimeRoutingDevPlugin();
  plugin.configResolved({ mode: 'test' });
  let mountedPath;
  let handler;
  plugin.configureServer({
    middlewares: {
      use(path, callback) {
        mountedPath = path;
        handler = callback;
      },
    },
  });
  return { mountedPath, handler };
}

describe('runtime routing dev middleware', () => {
  it('mounts the same-origin endpoint and rejects non-POST requests', async () => {
    const { mountedPath, handler } = registeredMiddleware();
    expect(mountedPath).toBe('/api/route-estimate');
    const res = response();
    await handler({ method: 'GET', socket: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: 'method_not_allowed' });
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('reaches the route handler and fails closed when the key is absent', async () => {
    const previous = process.env.ORS_API_KEY;
    delete process.env.ORS_API_KEY;
    try {
      const { handler } = registeredMiddleware();
      const req = Readable.from([JSON.stringify({
        originMunicipalityId: 'los-banos',
        destination: { lat: 14.275, lng: 121.459 },
      })]);
      req.method = 'POST';
      req.socket = { remoteAddress: '127.0.0.1' };
      const res = response();
      await handler(req, res);
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body)).toEqual({ error: 'routing_not_configured' });
    } finally {
      if (previous === undefined) delete process.env.ORS_API_KEY;
      else process.env.ORS_API_KEY = previous;
    }
  });
});
