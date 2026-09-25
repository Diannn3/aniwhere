import { createRequestLimiter } from './rate-limit.mjs';
import { routeEstimateFromPayload } from './route-handler.mjs';

const MAX_BODY_BYTES = 4_096;

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      throw new Error('payload_too_large');
    }
  }
  return body ? JSON.parse(body) : null;
}

function send(res, status, body, retryAfterSeconds = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (retryAfterSeconds > 0) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
  }
  res.end(JSON.stringify(body));
}

export function runtimeRoutingDevPlugin() {
  let apiKey = '';
  let baseUrl = '';
  const limiter = createRequestLimiter();

  return {
    name: 'aniwhere-runtime-routing-dev',
    apply: 'serve',
    configResolved() {
      apiKey = process.env.ORS_API_KEY || '';
      baseUrl =
        process.env.ORS_BASE_URL ||
        'https://api.heigit.org/openrouteservice/v2';
    },
    configureServer(server) {
      server.middlewares.use('/api/route-estimate', async (req, res) => {
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          send(res, 405, { error: 'method_not_allowed' });
          return;
        }

        const clientKey = req.socket.remoteAddress || 'unknown';
        const limit = limiter.allow(clientKey);
        if (!limit.allowed) {
          send(res, 429, { error: 'rate_limited' }, limit.retryAfterSeconds);
          return;
        }

        let payload;
        try {
          payload = await readJson(req);
        } catch (error) {
          send(
            res,
            error?.message === 'payload_too_large' ? 413 : 400,
            { error: error?.message === 'payload_too_large' ? 'payload_too_large' : 'invalid_json' }
          );
          return;
        }

        const result = await routeEstimateFromPayload(payload, { apiKey, baseUrl });
        send(res, result.status, result.body);
      });
    },
  };
}
