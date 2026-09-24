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
- `/bagsakan` — local-only receiving-place profile and buying needs
- `/bagsakan/preview` — same-device farmer preview of a local Bagsakan entry
- `/buyer` — compatibility route for the Bagsakan workspace
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
- 11 fictional Laguna outlets with varied crop acceptance, capacity, price, and uncertainty scenarios across seven crops;
- demo-only buying windows and sample evidence dates shifted together relative to the current Manila date so an offline presentation remains navigable; these dates do **not** indicate a fresh market verification;
- one browser-local Bagsakan profile with editable dated buying needs; its demo entries appear in farmer discovery, saved places, comparison, map, and preview on the same device;
- a presentation adapter that composes those records for the current UI;
- browser `localStorage`;
- a progressive Laguna map: MapLibre + OpenFreeMap when network/WebGL are available, with the in-repo SVG map as the resilient fallback;
- deterministic Haversine straight-line distance;
- a fail-closed road-routing matrix contract with a drift-checked 10-origin × 11-outlet OpenRouteService artifact generator.

It does **not** currently use:

- a live Supabase database;
- real-time buyer demand;
- live authentication;
- real buyer prices;
- a generated OpenRouteService road matrix in the checked-in default artifact (the default remains intentionally `not_generated` until run with a valid private key);
- payments, reservations, or checkout.

The app labels demo evidence as demo data. Generated or fixture business names, capacities, prices, contacts, and transport costs must not be represented as real market facts.

The Bagsakan workspace saves only on this device. Its entries are not published to a live buyer network, and its optional price is a demo price rather than a verified buyer quote. The older buyer-demo browser key is left untouched but is not imported into this flow.

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

For local Bagsakan road routing in development, set the private key in the shell before starting Astro:

```bash
ORS_API_KEY=... pnpm dev
```

On PowerShell:

```powershell
$env:ORS_API_KEY="..."
pnpm dev
```

The dev server exposes a same-origin `/api/route-estimate` bridge; the browser never receives the ORS key. Production serverless deployments should keep `ORS_API_KEY` server-only and set `PUBLIC_RUNTIME_ROUTING_ENDPOINT=/api/route-estimate` at build time.

Verification:

```bash
pnpm test
pnpm check
pnpm build
```

Optional road-routing artifact generation (authorized ops only):

```bash
pnpm routing:check
ORS_API_KEY=... pnpm routing:generate
# Add versioned, lazily loaded road geometry for routed demo pairs:
ORS_API_KEY=... pnpm routing:generate:geometry
```

Routing inputs are checked against the current municipality and checked-in demo-place data and fingerprinted into the generated artifact. Generation validates the complete matrix before atomic replacement. The ORS key is never sent to the browser, and CI scans the production bundle for ORS secret markers. Without a reviewed generated artifact, AniWhere labels distances as straight-line and does not invent driving time.

A same-device Bagsakan is intentionally not part of the static road matrix because its coordinates can be created or moved at runtime. When the secure runtime route endpoint is configured, AniWhere requests one on-demand ORS Directions route for the selected local Bagsakan and keeps the key server-side. If the endpoint, network, or provider is unavailable, the UI remains on the labelled straight-line fallback.

See [docs/ROUTING_MATRIX_V2_IMPLEMENTATION_2026-09-25.md](./docs/ROUTING_MATRIX_V2_IMPLEMENTATION_2026-09-25.md).

The same frontend checks run in GitHub Actions through `.github/workflows/ci.yml`.

## Pilot crop scope

Detailed demo fixture matching is currently implemented for tomato / kamatis, eggplant / talong, calamansi / kalamansi, banana / saging, papaya, pechay / petsay, and string beans / sitaw.

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
