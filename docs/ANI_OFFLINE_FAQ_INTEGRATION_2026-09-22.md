# Ani Offline FAQ + Farmer UX Integration

**Date:** 22 September 2026  
**Integration branch:** `feat/ani-offline-faq-integration`  
**UX source branch:** `feat/farmer-ux-integration-hardening`  
**FAQ source branch:** `feat/faq-chatbot`  
**FAQ source commit:** `2489fdbade06dea3278adab12fbbf588462a110f`

## Purpose

This document records the integration decisions that must remain true when the offline FAQ work and the farmer UX hardening work are combined.

AniWhere is still a harvest-based market-discovery and decision-support system. Ani is a navigator and explanation layer. Neither the local FAQ nor an online model is allowed to become a second matching engine.

## Source-of-truth order

1. Current deterministic domain logic and typed market repository.
2. Current explicit product semantics in the repository.
3. This integration document.
4. Bundled FAQ copy.
5. Model-generated explanation.

If two layers disagree about a market fact, the deterministic domain/tool result wins.

## Canonical fit language

The farmer-facing states are:

- **Matches your harvest**
- **Accepts part of your harvest**
- **Contact to confirm**
- **Does not match**

Older phrases such as “full match” and “partial match” may remain FAQ search aliases so farmers can still find help, but they are not the preferred UI labels.

Unknown capacity remains unknown. An expired offer is not active demand. A reviewed place is not the same thing as a current buyer offer.

For partial acceptance, calculations that depend on quantity use only the accepted quantity. Remaining harvest must be shown separately.

## Ani architecture after integration

### Layer 1 — local help

Ani opens in local help mode.

Local help:

- is bundled with the application;
- uses the deterministic FAQ matcher in `src/lib/ani/faq.ts`;
- supports English, Filipino, and common alias phrases;
- can explain product concepts while the harvest form is incomplete;
- does not connect to an AI provider merely because Ani is opened;
- does not calculate market fit;
- does not create buyer demand, price, capacity, routes, contacts, reservations, or transactions.

If no FAQ is sufficiently close, Ani says that no local answer is available rather than inventing one.

### Layer 2 — online Ani

The farmer explicitly chooses **Use online Ani**.

Online Ani:

- uses the configured Ani provider;
- may use text and, when supported, voice;
- receives the current validated harvest context;
- delegates market-bearing operations to typed AniWhere tools;
- cannot independently reclassify an outlet;
- returns to local help if connection setup fails;
- is closed when the farmer switches back to local help.

On the home page, an invalid live harvest draft blocks market-tool execution. Ani must not silently reuse stale valid harvest data.

## Voice boundary

Local help is text-only.

Voice is an online-mode capability. The provider owns microphone acquisition. The shell must not separately call `getUserMedia` before the provider does so; this avoids duplicate permission prompts and competing streams.

## FAQ action links

FAQ actions use validated AniWhere URL serialization.

When valid harvest context exists, action links preserve:

- crop;
- quantity in kg;
- origin municipality;
- ready date;
- optional variety;
- optional grade;
- optional packaging;
- selected language.

An invalid home draft must not be converted into apparently valid market state merely to construct an action link.

## Distance and routing boundary

The current origin reference is the selected municipality center, not an exact farm GPS point.

Road distance/time may be shown only when the reviewed routing artifact provides them. Otherwise use straight-line distance and do not invent driving minutes.

The local FAQ must communicate the same boundary.

## Offline/PWA boundary

The service worker exists for resilience, not freshness.

- The first successful app load still requires a connection.
- Navigations are network-first when connectivity exists.
- Previously cached paths can be used as fallback when the network fails.
- Farmer query strings are not intentionally stored as navigation cache keys.
- API requests are not intercepted.
- Static application assets may be served cache-first.
- Live map tiles, fresh route generation, online Ani, and fresh market data still need network access.

A cached page being available offline does not make its market information current.

## Privacy boundary

Local FAQ messages are held in the current browser session by the UI and do not require an online provider.

Saved/Compare state remains device-browser state.

Harvest details may be represented in shareable URLs. Service-worker navigation caching intentionally uses pathname keys instead of harvest-bearing query strings.

When the farmer explicitly switches to online Ani, the relevant question and application context may be sent to the configured online provider.

## Merge strategy

The final integration history should preserve both lines of work.

1. Develop and validate the combined tree on `feat/ani-offline-faq-integration`.
2. Create a two-parent merge commit whose first parent is the validated integration head and whose second parent is FAQ source commit `2489fdbade06dea3278adab12fbbf588462a110f`.
3. Fast-forward `feat/farmer-ux-integration-hardening` to that merge commit.
4. Use the existing PR from `feat/farmer-ux-integration-hardening` to `main`.
5. Do not merge to `main` until the full verification workflow is green.

## Required verification gate

Before the PR is considered ready:

- unit tests pass;
- Astro type check passes;
- production build passes;
- Playwright user-flow tests pass;
- accessibility checks pass;
- narrow mobile viewport checks pass;
- local FAQ works after a loaded page loses network;
- local FAQ remains usable with incomplete harvest input;
- online market tools fail closed on invalid harvest state;
- Local → Online → Local lifecycle disposes the provider correctly;
- FAQ actions preserve valid harvest context;
- offline navigation does not intentionally cache harvest query strings;
- no test or UI regresses the four canonical fit states or market-evidence boundaries.

## Non-goals of this merge

This integration does not claim:

- production-quality offline market data;
- an offline generative AI model;
- live buyer demand;
- live prices;
- exact farm routing;
- live traffic;
- verified real-world demo contacts;
- automatic buyer messaging;
- reservations;
- completed transactions;
- guaranteed sales or profit.
