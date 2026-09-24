import { createRequestLimiter } from '../server/routing/rate-limit.mjs';
import { routeEstimateFromPayload } from '../server/routing/route-handler.mjs';

const limiter = createRequestLimiter();
const MAX_BODY_BYTES = 4_096;

function clientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function requestOriginAllowed(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;

  const allowlist = new Set(
    (process.env.ROUTING_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  if (allowlist.has(origin)) return true;

  try {
    const parsed = new URL(origin);
    const forwardedHost = req.headers?.['x-forwarded-host'];
    const host = (typeof forwardedHost === 'string' && forwardedHost) || req.headers?.host;
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    if (!host || parsed.host !== host) return false;
    return !forwardedProto || parsed.protocol === `${forwardedProto}:`;
  } catch {
    return false;
  }
}

function parseBody(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  if (typeof body !== 'string') return null;
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    const error = new Error('payload_too_large');
    error.status = 413;
    throw error;
  }
  return body ? JSON.parse(body) : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!requestOriginAllowed(req)) {
    return res.status(403).json({ error: 'origin_not_allowed' });
  }

  const serializedLength =
    req.body && typeof req.body === 'object'
      ? Buffer.byteLength(JSON.stringify(req.body))
      : typeof req.body === 'string'
        ? Buffer.byteLength(req.body)
        : 0;
  if (serializedLength > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'payload_too_large' });
  }

  const limit = limiter.allow(clientKey(req));
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSeconds));
    return res.status(429).json({ error: 'rate_limited' });
  }

  let payload;
  try {
    payload = parseBody(req.body);
  } catch (error) {
    return res
      .status(error?.status === 413 ? 413 : 400)
      .json({ error: error?.status === 413 ? 'payload_too_large' : 'invalid_json' });
  }

  const result = await routeEstimateFromPayload(payload);
  return res.status(result.status).json(result.body);
}
