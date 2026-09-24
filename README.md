# AniWhere

**AniWhere: Harvest-Based Market Discovery for Farmers** is a Laguna-first agricultural market-discovery and decision-support web application developed by **Walang Ani Buseng** for the UPLB TTBDO NextGen Agri Hackathon 2026.

A farmer enters:

- crop;
- quantity;
- origin;
- harvest-ready date.

Optional progressive details can also be supplied when known:

- variety;
- grade;
- packaging.

AniWhere then evaluates potential outlets using explicit evidence and returns one of four states:

- **Matches your harvest**
- **Accepts part of your harvest**
- **Contact to confirm**
- **Does not match**

The product is deliberately a **pre-transaction decision layer**, not a checkout marketplace. A fit state describes compatibility with available information; it does not reserve capacity or guarantee acceptance.

## Current implementation

The repository contains a working high-fidelity frontend prototype built with:

- Astro 5
- Svelte 5
- TypeScript
- Tailwind CSS 4
- Vitest

Implemented routes include:

- `/` — harvest entry
- `/discover` — matching, filtering, list/map discovery
- `/places/[slug]` — outlet detail
- `/saved` — locally saved outlets
- `/compare` — compare up to three outlets
- `/buyer` — local-only buyer workspace demo
- `/404` — recovery page

## Trust model

AniWhere is designed to prefer uncertainty over fabricated certainty.

Important invariants include:

- missing crop-acceptance information -> **Contact to confirm**, not rejection;
- explicit crop exclusion -> **Does not match**;
- unknown capacity -> no fabricated accepted quantity;
- expired, paused, or future-incompatible demand cannot become a current match;
- ready date is evaluated against known offer validity/receiving days;
- explicit structured requirements use deterministic matching only:
  - missing required harvest detail -> **Contact to confirm**;
  - known incompatible detail -> **Does not match**;
- partial proceeds use accepted quantity only;
- missing price -> no fabricated proceeds;
- missing hauling estimate -> no fabricated transport deduction;
- evidence source and freshness travel with the match result;
- reference prices must remain separate from buyer quotes.

The implementation report for this hardening pass is:

[docs/ANIWHERE_TRUST_MODEL_V2_IMPLEMENTATION_2026-09-18.md](./docs/ANIWHERE_TRUST_MODEL_V2_IMPLEMENTATION_2026-09-18.md)

## Demo boundary

The current running frontend is still designed to be dependable during an offline hackathon demonstration.

At runtime it currently uses:

- explicit fictional demo data separated into stable places, crop capabilities, time-sensitive offers, provenance, and hauling assumptions;
- a presentation adapter that composes those records for the current UI;
- browser `localStorage`;
- a progressive Laguna map: MapLibre + OpenFreeMap when network/WebGL are available, with the in-repo SVG map as the resilient fallback;
- deterministic Haversine straight-line distance;
- a fail-closed road-routing matrix contract with an OpenRouteService artifact generator.

It does **not** currently use:

- a live Supabase database;
- real-time buyer demand;
- live authentication;
- real buyer prices;
- a generated OpenRouteService road matrix in the checked-in default artifact (the default remains intentionally `not_generated` until run with a valid private key);
- payments, reservations, or checkout.

The app labels demo evidence as demo data. Generated or fixture business names, capacities, prices, contacts, and transport costs must not be represented as real market facts.

Runtime data mode is explicit through `PUBLIC_DATA_MODE`. This branch supports `demo`; requesting `pilot` fails closed until a reviewed pilot repository adapter is actually implemented, preventing fictional fixtures from silently appearing as live pilot data.

See [docs/FRONTEND_LIMITATIONS.md](./docs/FRONTEND_LIMITATIONS.md).

## Production backend scaffold

A production-oriented **declarative Supabase schema scaffold** is now versioned under `supabase/`. It has not been applied to a local or remote project yet.

It separates:

- stable reviewed places;
- place/crop capability facts;
- time-sensitive buyer offers;
- structured quality/packaging requirement payloads;
- source/provenance records;
- verification records;
- public/reference prices;
- organizations, memberships, and explicit place editors.

Row Level Security is designed around:

- anonymous farmer read access to approved public data;
- assigned buyer/editor writes;
- steward/admin organization access.

The presence of these SQL files does **not** mean a live Supabase project is configured or that a versioned migration has been generated/applied.

See [supabase/README.md](./supabase/README.md).

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The default example config uses `PUBLIC_DATA_MODE=demo`.

Verification:

```bash
pnpm test
pnpm check
pnpm build
```

Optional road-routing artifact generation (ops/CI only):

```bash
ORS_API_KEY=... pnpm routing:generate
# Add precomputed road geometry for all demo origin/outlet pairs:
ORS_API_KEY=... pnpm routing:generate:geometry
```

The ORS key is never sent to the browser. Without a generated artifact, AniWhere labels distances as straight-line and does not invent driving time.

The same frontend checks run in GitHub Actions through `.github/workflows/ci.yml`.

## Pilot crop scope

Detailed fixture matching is currently implemented for:

- tomato / kamatis;
- eggplant / talong;
- calamansi / kalamansi.

Other crops intentionally fall back to **Contact to confirm** instead of receiving invented detailed terms.

## Financial wording

AniWhere does not calculate "profit."

Where buyer/demo price and hauling are both known, the bounded calculation is:

```text
Gross amount = accepted quantity × posted price
Amount after transport = gross amount − known/entered hauling expense
```

Farm production costs are outside that figure.

## Planning and design archives

The original planning package remains available:

[AniWhere-Complete-Planning-Package-2026-09-17.zip](./AniWhere-Complete-Planning-Package-2026-09-17.zip)

The UI reference audit remains under:

[ui-reference-audit-2026-09-17](./ui-reference-audit-2026-09-17/)

These are historical/design artifacts; the current source tree and current implementation report take precedence for implementation status.

## Team & Contributors

**Team Walang Ani Buseng** &middot; UPLB TTBDO NextGen Agri Hackathon 2026

- **Aedrian F. Ponce** ([@Diannn3](https://github.com/Diannn3))
- **Kalinaw Lukas Aom C. Bebis** ([@klnwlks](https://github.com/klnwlks))
- **Jazz Avo M. Abadier** ([@avoabadier](https://github.com/avoabadier))
- **Mentor**: Asst. Prof. Allen L. Nazareno
