# Premium UI + Ani Navigator — Implementation Log

**Date:** 2026-09-22  
**Branch:** `feat/premium-ui-ani-navigator`  
**Baseline:** `main@6a92a43b65136e9c8fee6ff7fe1f3aecf1cb56d4`

## Source-of-truth pass

The branch was built from the current main repository, not from old mockups. The current README/docs, deterministic match engine, demo market repository, URL state, save/compare state, tests, Astro/Svelte/Tailwind setup, static deployment mode, and Supabase scaffold were inspected before the premium/Ani work.

The trust model remains binding: AniWhere is a pre-transaction decision layer; Match/Partial/Contact/No Match come only from deterministic domain logic; null remains unknown; demo data remains demo; buyer-posted/reference/demo prices remain distinct; after-transport is not profit.

## Implementation sequence

1. Added the baseline premium UI/Ani audit with P0–P3 findings.
2. Extended `DESIGN.md` with surface hierarchy, semantic motion and canonical Ani character rules.
3. Added `MOTION_SYSTEM.md`, `ANI_ARCHITECTURE.md`, and `ANI_TOOL_CONTRACT.md`.
4. Refined shell, Harvest Ticket, discovery, map/list, outlet detail, comparison, saved and buyer surfaces without migrating away from Astro + Svelte.
5. Added the supplied Ani mascot as the canonical first-pass asset and built semantic avatar states.
6. Added an accessible contextual Ani assistant: keyboard close, focus containment/restoration, live status, text mode, explicit microphone initiation, stop-audio control, Filipino/English copy and calm offline fallback.
7. Added `AniProvider`, explicit `MockAniProvider`, and lazy-loaded `GeminiLiveAniProvider`.
8. Added a typed tool dispatcher over the existing deterministic market data and `evaluateFit`; no LLM fit engine was introduced.
9. Structurally separated buyer-posted, public-reference and demo price fields in Ani tool results.
10. Added route allowlisting, argument validation, shared harvest events, compare/save/navigation execution and transport-state synchronization.
11. Added Gemini 3.8 Live WebSocket transport for text, PCM microphone audio, output audio/transcription, function calls, interruption, session resumption, GoAway handling and context-window compression.
12. Added a Supabase Edge Function source for constrained one-use ephemeral Gemini credentials. `GEMINI_API_KEY` remains server-only.
13. Batched microphone capture into ~80 ms chunks and labels PCM with the actual browser capture rate.
14. Expanded CI so feature branches run unit tests, Astro typecheck, production build, Chromium Playwright, axe accessibility and visual QA screenshots.
15. Added the requested 320×568, 360×800, 390×844, 768×1024 and 1440×900 visual matrix plus map/detail/saved/buyer/404/Filipino states.
16. Fixed issues exposed by the QA loop: transient page-animation contrast, buyer filter ARIA semantics, buyer helper contrast, duplicate main landmark, mobile Ani/comparison-dock collision, data-mode hardcoding, comparison transport sync, and ambiguous Filipino navigation naming.

## Verification evidence

Latest fully green verification before this documentation commit:

- Head: `386bbf3daad19c95a4ff6e8ba93d1ef0c91335bb`
- GitHub Actions run: `35672225830`
- Typecheck, unit tests and production build: **PASS**
- Playwright, accessibility and visual QA: **PASS**
- Visual artifact: `aniwhere-premium-visual-qa` / artifact `10671507750`
- Browser suite: **30 passed**
- axe WCAG A/AA target-route audit: **PASS**
- Requested responsive screenshot matrix: **captured and manually inspected**

## Visual review notes

The final captures show a coherent warm agricultural system rather than generic monochrome SaaS styling. The home page remains decision-first; the Harvest Ticket is the dominant action; the illustrative route is explicitly labelled; discovery prioritizes fit, accepted/remainder quantities, evidence and next action; comparison remains an evidence ledger; outlet detail preserves uncertainty and confirmation work; Ani is visually integrated without becoming a fourth navigation destination.

The 390px discovery status row intentionally scrolls horizontally rather than shrinking touch targets. The comparison ledger intentionally scrolls horizontally on phones and explicitly tells the farmer to scroll sideways.

## Production blockers

1. **Gemini Live is not claimed live in production.** No AniWhere Supabase project is connected in the available Supabase workspace, so the included `ani-session` function has not been deployed and no Gemini secret has been configured.
2. The token function's in-memory issuance bucket is defense-in-depth, not a globally durable public quota. Before public launch, pair issuance with authenticated/anonymous identity and durable edge/database rate limiting or equivalent abuse control.
3. Filipino live speech quality cannot be truthfully certified until the real Gemini session endpoint is deployed and tested with representative Filipino/Taglish speakers and devices.
4. No real buyer/market pilot data adapter is connected. `PUBLIC_DATA_MODE=pilot` continues to fail closed.
5. Real farmer usability testing is still required; automated QA and visual inspection do not substitute for field testing.

These blockers do not break the deterministic manual AniWhere experience.
