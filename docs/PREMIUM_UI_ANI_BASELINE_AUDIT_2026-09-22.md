# AniWhere Premium UI/UX + Ani Navigator — Baseline Audit

**Date:** 2026-09-22  
**Baseline:** `main@6a92a43b65136e9c8fee6ff7fe1f3aecf1cb56d4`  
**Scope:** current Astro/Svelte farmer experience, deterministic trust model, responsive/a11y suite, and Ani integration boundary.

## Source-of-truth findings

AniWhere is a static Astro 5 + Svelte 5 application with Tailwind 4, Vitest, Playwright and axe. Runtime market data is deliberately demo-only; `PUBLIC_DATA_MODE=pilot` fails closed. The production Supabase work is a schema scaffold, not a connected backend. The matching engine is `src/lib/domain/match.ts`; AI must wrap it, never replace it.

The four authoritative fit states remain Match, Partial, Contact to confirm, and No match. Unknown capacity stays unknown; price and transport arithmetic remain nullable; evidence kind/source/freshness travel with every fit result.

## P0 — correctness / trust / task completion

1. **Ani cannot safely be called live from the current static runtime.** A long-lived Gemini key must never enter browser code. Live activation requires a trusted token-minting endpoint or edge function. The app must stay fully usable with Ani unavailable.
2. **The GUI and future Ani need one harvest contract.** URL harvest state is already canonical for discovery/compare. Ani must write through the same serializer/state mechanisms, not maintain a private conversational harvest.
3. **AI may not reinterpret fit.** Tool responses must carry the exact deterministic `FitResult` fields and preserve null/unknown distinctions.
4. **Demo mode must reach Ani.** Fixture capacities/prices/buyers need explicit demo disclosure in tool output and assistant language.

## P1 — major usability

1. The current shell is clear but visually dense: demo banner + sticky header + content + mobile tab bar compete vertically on small phones.
2. Ani needs a contextual affordance above mobile navigation, not a fourth tab. It must never cover primary submit/filter/compare actions.
3. Discovery is information-rich and needs stronger progressive disclosure: fit/accepted/remainder/evidence first; secondary proof and confirmation questions second.
4. List/map state should feel continuous. Selection needs persistent visual identity across list, map, detail and compare.
5. Comparison's ledger model is correct; mobile horizontal scanning needs stronger sticky context and explicit scroll affordance.
6. Buyer workspace must remain visually separated as a demo/admin-adjacent surface so farmers do not infer buyer actions are live.

## P2 — system consistency

1. Global CSS has useful semantic colors but layout code still contains repeated raw hex values. Move shared shell/actions/states to semantic tokens.
2. Motion is currently mostly generic Tailwind transitions plus the illustrative route-line loop. Define durations/easing/travel centrally.
3. Surface hierarchy needs fewer equally bordered containers. Prefer page plane → raised decision surface → evidence inset.
4. Typography is sound (Source Sans 3 + Source Serif 4) but headings, labels, numerical values and evidence metadata need explicit roles.
5. State color must remain redundant with icon/text. Never let green alone mean Match.

## P3 — polish

1. Introduce restrained physical continuity: short settle, opacity/translate, selected-result continuity, sheet transitions.
2. Use Ani's cream body/olive leaf palette as a character accent, not a new AI theme.
3. Give save, compare selection and successful harvest updates tactile but brief feedback.
4. Avoid constant mascot movement; state changes should carry the delight.

## Accessibility / resilience baseline

Strengths already present: skip link, semantic navigation, EN/FIL document language, reduced-motion override, forced-colors handling, keyboard/error-summary tests, axe WCAG A/AA audits, and overflow checks from 320×568 through 1440×900.

Gaps to close: Ani live-region announcements, mic permission fallback, focus trap/restore for assistant sheet, Escape close, 44px-class touch targets, transcript alternative, text-only operation, assistant reduced-motion states, and CI execution of E2E/a11y.

## Performance baseline

The core app is intentionally light and static. Do not load Live/audio code before Ani is opened. Avoid React, WebGL and large animation packages. CSS/Web Animations/Svelte transitions are sufficient for the premium pass.

## Implementation order

1. Design + motion tokens and shared shell refinement.
2. Home/Harvest Ticket hierarchy.
3. Discovery/list/map/detail continuity.
4. Comparison/saved/secondary surface polish.
5. Ani avatar + accessible shell.
6. Provider abstraction + mock provider.
7. Typed tool dispatcher wrapping deterministic domain logic.
8. Shared harvest/navigation synchronization.
9. Live-provider boundary and secure-token contract; activate only when trusted runtime + secret exist.
10. Voice/text failure states, tests, E2E/a11y CI and final visual QA.

## Acceptance rule

A change fails review if it makes evidence harder to see, implies a buyer commitment, fabricates a quantity/price/route fact, creates a second harvest truth, blocks manual use when Ani fails, or makes a modest mobile device pay a large visual-performance cost.
