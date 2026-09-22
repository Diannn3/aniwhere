# Ani Architecture — Farmer Navigator

Ani is an optional conversational navigator over AniWhere. The deterministic application remains authoritative.

```
farmer voice/text -> Ani UI -> AniProvider -> typed function request
-> AniToolDispatcher -> existing URL/state + evaluateFit/domain/data layer
-> structured authoritative result -> provider verbalization -> transcript/audio + GUI state
```

## Provider boundary

`AniProvider` owns session lifecycle and conversation transport. It does not own market truth. `MockAniProvider` is explicitly development/test behavior. `GeminiLiveAniProvider` is lazy-loaded only after the farmer opens/starts Ani.

The verified September 2026 model is `gemini-3.8-live`. It supports Live API audio and function calling. Direct browser connections should use short-lived constrained ephemeral tokens minted by a trusted backend; a long-lived API key must never ship in browser JavaScript.

## Current production boundary

Current Astro config remains `output: 'static'`; AniWhere was not converted to SSR. This branch now includes a trusted-token endpoint implementation at `supabase/functions/ani-session/`, but there is no AniWhere Supabase project connected in the available workspace and the function is therefore **not deployed**. Production Gemini activation remains blocked on creating/choosing the intended backend project, deploying that function, configuring its allowlisted production origin and server-only Gemini secret, and setting `PUBLIC_ANI_SESSION_ENDPOINT` in the frontend deployment.

The browser never receives `GEMINI_API_KEY`. It receives only a short-lived, one-use Gemini ephemeral token. The endpoint rejects non-allowlisted browser origins and applies a small issuance limit, but its current in-memory rate bucket is defense-in-depth rather than a globally durable production quota. Before public launch, pair token issuance with authenticated/anonymous Supabase identity plus durable rate limiting or an equivalent edge abuse-control layer. Do not describe the scaffold as production-hardened until that deployment work is complete.

Environment contract:
- `PUBLIC_ANI_ENABLED` — public feature gate
- `PUBLIC_ANI_SESSION_ENDPOINT` — public URL of the deployed token-minting endpoint; contains no secret
- `ANI_MODEL=gemini-3.8-live` — server configuration
- `GEMINI_API_KEY` — server only, never `PUBLIC_`
- `ANI_ALLOWED_ORIGINS` — server-side comma-separated origin allowlist

A future serverless or Supabase Edge endpoint should authenticate/rate-limit callers and mint one-use, short-lived, model-constrained tokens.

## State

Harvest remains the same `HarvestQuery` serialized through existing discover/compare URL state. Ani may propose/extract fields, but ambiguous fields are confirmed before commit. Navigation tools build validated AniWhere URLs. Save/compare delegate to the same mechanisms as manual UI.

## Failure

Provider unavailable, offline, denied microphone, quota/token failure or disconnect leaves the manual product intact. Ani shows a calm text fallback/retry state and never invents a market answer to hide failure.


## Verified provider facts — 2026-09-22

Official Google AI documentation was re-checked before the production transport pass:

- `gemini-3.8-live` is the stable Gemini 3.8 Live model and was released GA on 2026-09-15.
- Live API supports function calling and native audio.
- Browser/client Live connections should use short-lived ephemeral tokens rather than a long-lived API key.
- Live WebSocket connections are periodically reset; session resumption and `GoAway` handling are recommended.
- Context-window compression is recommended for longer audio sessions.

Implementation consequences:
- the browser receives only a constrained one-use ephemeral token;
- `GEMINI_API_KEY` remains server-only;
- the client retains resumption handles, reconnects through fresh token provisioning, and enables sliding-window context compression;
- CI never requires Gemini availability.

Official references:
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live
- https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- https://ai.google.dev/gemini-api/docs/live-api/session-management
- https://ai.google.dev/api/live
