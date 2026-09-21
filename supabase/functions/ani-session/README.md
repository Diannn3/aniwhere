# Ani session token function

This Supabase Edge Function is the intended secure bridge between the static AniWhere frontend and Gemini Live.

It mints **one-use ephemeral Live API credentials**. It never returns the long-lived Gemini API key.

## Required server secrets

- `GEMINI_API_KEY` — Gemini API key, server only.
- `ANI_MODEL` — defaults to `gemini-3.8-live`.
- `ANI_ALLOWED_ORIGINS` — comma-separated exact production/preview origins.

Do not create any `PUBLIC_GEMINI_API_KEY`.

## Security posture

The function rejects non-POST requests, rejects origins outside the explicit allowlist, emits `Cache-Control: no-store`, requests one-use tokens, limits new-session use to one minute, and includes a best-effort per-instance request limiter.

The in-memory limiter is **not a distributed production quota**. Before public launch, enforce a second rate limit at the Supabase/project/gateway layer (or another shared store). Anonymous access is intentional because AniWhere's current farmer workflow does not require an account.

## Deployment status

Source is implemented but this repository does not prove that a Supabase project, secrets, or deployed function exist. Until those external resources are configured, `GeminiLiveAniProvider` must fail closed and AniWhere's manual deterministic experience remains available.
