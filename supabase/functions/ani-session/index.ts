declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const MODEL = Deno.env.get('ANI_MODEL') || 'gemini-3.8-live';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ANI_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value: string) => value.trim())
    .filter(Boolean),
);

const WINDOW_MS = 60_000;
const MAX_TOKENS_PER_WINDOW = 6;
const buckets = new Map<string, { count: number; resetAt: number }>();

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function clientKey(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

function rateLimited(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_TOKENS_PER_WINDOW;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors(origin) });
  }

  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json(403, { error: 'origin_not_allowed' }, origin);
  if (!GEMINI_API_KEY) return json(503, { error: 'ani_not_configured' }, origin);

  const key = clientKey(req);
  if (rateLimited(key)) return json(429, { error: 'rate_limited' }, origin);

  const now = Date.now();
  const expireTime = new Date(now + 10 * 60_000).toISOString();
  const newSessionExpireTime = new Date(now + 60_000).toISOString();

  const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uses: 1,
      expireTime,
      newSessionExpireTime,
      liveConnectConstraints: {
        model: `models/${MODEL}`,
        config: {
          responseModalities: ['AUDIO'],
          sessionResumption: {},
        },
      },
    }),
  });

  if (!upstream.ok) {
    console.error('Gemini ephemeral token request failed', upstream.status);
    return json(502, { error: 'token_provider_unavailable' }, origin);
  }

  const token = await upstream.json();
  if (!token?.name || typeof token.name !== 'string') {
    return json(502, { error: 'invalid_token_response' }, origin);
  }

  return json(200, {
    token: token.name,
    model: MODEL,
    expiresAt: expireTime,
    newSessionExpiresAt: newSessionExpireTime,
  }, origin);
});
