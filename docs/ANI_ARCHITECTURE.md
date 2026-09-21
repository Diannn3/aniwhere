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

## Current blocker

Current Astro config is `output: 'static'`. There is no trusted token endpoint in this branch. Production Gemini activation is therefore blocked by backend/secret provisioning. Do not silently convert the app to SSR.

Environment contract:
- `PUBLIC_ANI_ENABLED` — public feature gate
- `ANI_MODEL=gemini-3.8-live` — server configuration
- `GEMINI_API_KEY` — server only, never `PUBLIC_`

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
