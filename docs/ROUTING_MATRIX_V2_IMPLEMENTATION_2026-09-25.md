# AniWhere Routing Matrix v2 — Implementation Handoff

**Date:** 25 September 2026  
**Branch:** `feat/routing-matrix-v2`  
**Initial baseline:** `main@1e3d29e1cf5f663dbc34eafa6546bbf587650163`  
**Reconciled current main:** `0f43dad659dacda253ff24598b3af6ed0a57d444` — Bagsakan demand flow merge

## Status

The routing pipeline has been generalized and hardened. PR #14 committed the reviewed 10 × 11 OpenRouteService artifact and 106 route geometries. The current artifact is `partial` only because four co-located zero-distance pairs intentionally have Matrix metrics without synthetic polylines.

Missing or invalid routing evidence still fails closed; AniWhere never fabricates a driving distance or duration.

## Current routing inputs

Generation now reads `scripts/routing-points.json`:

- 10 Laguna municipality reference points;
- 11 current fictional demo outlets;
- 110 expected origin/outlet cells.

`src/lib/routing/routing-inputs.test.ts` compares that manifest against
`LAGUNA_MUNICIPALITIES` and `DEMO_PLACES`. Adding, removing, or moving a point makes CI fail until
routing inputs and the artifact are deliberately refreshed.

## Artifact v2

`src/generated/routing-matrix.json` uses schema version 2 and records:

- provider and provider base;
- driving profile;
- generation mode;
- status;
- routing/OpenStreetMap attribution;
- SHA-256 input fingerprint;
- optional geometry run ID;
- origin/outlet coordinate snapshots after generation;
- every expected route cell;
- metric provenance (`matrix` or `directions`);
- geometry state (`not_requested`, `ready`, or `unavailable`).

The placeholder artifact can remain `not_generated` without inventing route cells.

## Generation safety

`scripts/generate-routing-matrix.mjs`:

1. requires `ORS_API_KEY`;
2. refuses unsafe/duplicate routing IDs and invalid coordinates;
3. sends one Matrix request for the current 10 × 11 coverage;
4. validates response dimensions and every matrix cell;
5. retries only temporary failures/rate limits with bounded backoff;
6. honors `Retry-After`;
7. redacts the private key from provider error text;
8. optionally requests Directions geometry;
9. accepts geometry only with a valid LineString and valid Directions summary;
10. uses Directions distance/duration whenever its geometry is displayed;
11. validates the complete artifact;
12. writes through a temporary file and renames only after successful re-read/validation.

A failed core generation does not replace a previously good matrix.

## Geometry

Geometry mode writes same-origin route assets beneath:

`/generated/routes/<run-id>/<origin-id>--<outlet-id>.geojson`

The matrix stores only the path and provenance. The browser loads only the selected route geometry.
This prevents all route coordinates from inflating the initial JavaScript bundle.

If geometry fails while Matrix metrics are valid:

- road distance remains available;
- estimated drive remains available;
- the map falls back to straight-line geographic context;
- the artifact is marked `partial`;
- no fake road polyline is drawn.

## Runtime truth rules

Valid road metrics:
- label as **Road distance**;
- label duration as **Estimated drive**;
- disclose the municipality reference point;
- state that it is not an exact-farm or live-traffic ETA.

No valid road metrics:
- use Haversine;
- label as **Straight-line distance**;
- show **Road route unavailable**;
- show no driving duration.

Routing never changes:
- MATCH / PARTIAL / CONTACT TO CONFIRM / NO MATCH;
- accepted or remaining kg;
- price;
- capacity;
- buyer activity;
- hauling cost;
- financial outcome.

## Shared sorting basis

Discovery and Compare retain `sharedDistanceBasis()`.

Road distance is used for ordering only when every compared/visible route has road evidence.
Otherwise every candidate is ordered by straight-line distance so the comparison does not mix units of
evidence.

## Duration behavior

The old forced minimum of one minute was removed.

Provider evidence now preserves seconds:
- 0 seconds → `0 min`;
- 1–59 seconds → `<1 min`;
- 60+ seconds → rounded estimated minutes.

## Offline behavior

The static matrix remains available without provider/network access after build.

Generated route GeoJSON is cached on demand by the service worker after its first successful load.
If route geometry is unavailable offline, text road metrics can still remain usable.

## Security

The ORS key is ops-only.

Never create:
- `PUBLIC_ORS_API_KEY`;
- a browser ORS Authorization header;
- a committed API key.

CI runs `pnpm routing:secrets` after the production build and fails if ORS secret environment markers
appear in `dist`.

## Authorized generation runbook

Before generation:

```bash
git fetch origin
pnpm install --frozen-lockfile
pnpm routing:check
pnpm test
pnpm check
```

Set `ORS_API_KEY` only in the operator environment.

Metrics:

```bash
ORS_API_KEY=... pnpm routing:generate
```

Metrics + road geometry:

```bash
ORS_API_KEY=... pnpm routing:generate:geometry
```

Then inspect the generated diff and verify:

- 10 origin records;
- 11 outlet records;
- 110 explicit cells;
- current input fingerprint;
- no secret material;
- legitimate unavailable routes remain unavailable.

Finally run:

```bash
pnpm verify
pnpm routing:secrets
```

## Manual route QA

At minimum inspect:

- Los Baños → Nagcarlan Hinog Kitchen;
- Los Baños → Ani at Agos Farmers Cooperative;
- Los Baños → Kusina Verde Processing House;
- Los Baños → Pagsanjan Ilog Harvest Hub;
- Los Baños → Biñan Sariwa Corner;
- San Pablo → Santa Cruz;
- Nagcarlan → Liliw.

Check that geometry follows plausible roads, endpoints snap reasonably, there are no impossible water
crossings, and distance/time remain plausible planning estimates.

## Bagsakan routing boundary

The same-device Bagsakan remains intentionally outside the checked-in 10 × 11 matrix because its coordinates can be created or moved at runtime.

The runtime-routing layer now resolves a selected local Bagsakan through a same-origin server endpoint that keeps `ORS_API_KEY` server-side, restricts origins to AniWhere's municipality references, restricts destinations to the Laguna map bounds, rate-limits requests, and falls back to Haversine when unavailable. Static outlets continue using the reviewed artifact with no runtime provider request.

## Remaining boundary

Runtime Bagsakan road routing is operational on `pnpm dev` when `ORS_API_KEY` is supplied in the server process. Production remains fail-closed until the serverless route adapter is deployed with a rotated server-side ORS key and `PUBLIC_RUNTIME_ROUTING_ENDPOINT` points the frontend at that endpoint.
