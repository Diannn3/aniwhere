const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function retryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
}

function safeMessage(value, apiKey) {
  const text = String(value ?? '').slice(0, 500);
  return apiKey ? text.split(apiKey).join('[redacted]') : text;
}

export function createRoutingClient({
  baseUrl,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = 15_000,
  maxAttempts = 4,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  if (!baseUrl) throw new Error('Routing provider base URL is required.');
  if (!apiKey) throw new Error('Routing provider API key is required.');

  return async function request(path, body) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json, application/geo+json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const responseText = await response.text();
        if (!response.ok) {
          const error = new Error(
            `Routing provider ${response.status} ${response.statusText}: ${safeMessage(responseText, apiKey)}`
          );
          error.status = response.status;
          error.retryable = RETRYABLE_STATUS.has(response.status);
          error.retryAfterMs = retryAfterMs(response.headers.get('retry-after'));
          throw error;
        }

        try {
          return JSON.parse(responseText);
        } catch {
          throw new Error('Routing provider returned malformed JSON.');
        }
      } catch (error) {
        lastError = error;
        const retryable =
          error?.retryable === true ||
          error?.name === 'AbortError' ||
          (error?.status === undefined && !String(error?.message || '').includes('malformed JSON'));

        if (!retryable || attempt === maxAttempts) throw error;

        const backoff = Math.min(8_000, 500 * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * 200);
        await sleep(error?.retryAfterMs ?? backoff + jitter);
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error('Routing provider request failed.');
  };
}
