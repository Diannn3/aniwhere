# AniWhere Trust Model v2 — Research, Findings, Implementation, and Handoff

**Date:** 18 September 2026  
**Branch:** `feat/trust-model-v2`  
**Base:** `d2e90fb6842950756f7fb8da791e7c9077b8b78d`  
**Project:** AniWhere: Harvest-Based Market Discovery for Farmers  
**Team:** Walang Ani Buseng  
**Scope of this pass:** truth-model hardening, matching semantics, temporal validity, provenance/freshness, financial honesty, production data contracts, security scaffolding, and continuous verification.

---

## 1. Executive summary

This pass moves AniWhere from a polished deterministic frontend prototype toward a trustworthy market-discovery system without destroying the reliable offline hackathon demo.

The most important design decision is that AniWhere must not behave like a generic buyer directory or a marketplace that assumes every listed place is currently buying. The product's value is the decision layer between a farmer's harvest and a set of potential outlets:

> **Given this crop, quantity, location, and availability date, what outlets are compatible with what is currently known, how much can each take, what remains unknown, and what does the trip look like economically?**

The implementation therefore prioritizes **epistemic correctness**:

- unknown information stays unknown;
- absence of an acceptance record is not a rejection;
- expired or paused demand cannot become a current match;
- stable place facts are separate from time-sensitive offers;
- reference prices are not buyer quotes;
- missing transport cost cannot silently become an invented default;
- a partial match computes proceeds only for the accepted quantity;
- a reviewed place may still be discoverable when current demand is unknown;
- the user interface shows the source and freshness of the evidence used by the matching engine.

This pass intentionally does **not** connect a live Supabase project, fetch real buyer demand, or replace the resilient SVG map with a live routing dependency. Instead it establishes the contracts, security model, declarative database schema scaffold, and deterministic logic needed to do those safely next.

---

## 2. Research basis

This implementation was informed by the current AniWhere repository, the canonical AniWhere anti-hallucination context, and a fresh September 2026 research pass.

### 2.1 Department of Agriculture market-linkage workflows

The Department of Agriculture's Agribusiness and Marketing Assistance Service already frames market access as a combination of market information, buyer/seller directories, supply-demand information, institutional buyer linkage, ICT/business networking, and market matching.

Source:

- DA Agribusiness and Marketing Assistance:  
  https://www.da.gov.ph/services/agribusiness-and-marketing-assistance/

This supports AniWhere's direction as a **decision-support and market-linkage layer**, but it also means AniWhere should not claim that no farmer-to-buyer linkage mechanisms exist.

A stronger and more defensible position is:

> Existing systems and institutions help farmers list, trade, aggregate, or get connected. AniWhere starts with a specific harvest and makes the compatibility, uncertainty, capacity, freshness, travel, and economic tradeoffs explicit before the farmer travels.

### 2.2 Harvest timing is operationally important

On 24 August 2026, DA described an effort to sharpen early-warning mechanisms around vegetable harvests and supply conditions so market linkage can happen earlier and gluts, spoilage, and distress selling can be reduced.

Source:

- DA sharpens early warning system to curb vegetable gluts:  
  https://www.da.gov.ph/da-sharpens-early-warning-system-to-curb-vegetable-gluts/

This reinforced a repo-level finding: AniWhere already collected `readyDate`, but the matching engine did not use it. This pass makes availability date part of deterministic matching.

### 2.3 Rural and agricultural UX should remain focused and resilient

GSMA's AgriTech UX guidance emphasizes the realities of agricultural users, including users with low digital literacy and the importance of designing for varying connectivity and channels.

Sources:

- GSMA AgriTech UX Design Guidebook:  
  https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/blog/introducing-the-agritech-user-experience-ux-design-guidebook/

This supports keeping AniWhere's initial farmer input small:

1. crop;
2. quantity;
3. location;
4. availability date.

More procurement requirements can be progressively disclosed or represented as conditions to confirm rather than making the entry form a procurement ERP.

### 2.4 Supabase security guidance

Current Supabase guidance reinforces several backend decisions made in this pass:

- exposed tables should use Row Level Security;
- grants and RLS policies both matter;
- policies should be tested;
- database tests can run through `supabase test db`;
- secrets for external services should be kept server-side rather than shipped to the browser.

Sources:

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Database testing: https://supabase.com/docs/guides/local-development/testing/overview
- Production checklist: https://supabase.com/docs/guides/deployment/going-into-prod

The schema scaffold in this branch is therefore RLS-first rather than dashboard-first.

### 2.5 Mapping and routing implications

MapLibre remains appropriate for a future production map, but its current browser/worker integration should be treated as a progressive enhancement rather than a reason to discard the resilient current map.

Source:

- MapLibre GL JS documentation: https://maplibre.org/maplibre-gl-js/docs/

OpenRouteService is suitable for selected road-distance queries, but the public service has usage limits and its API key should not be exposed directly in the client. Routing should therefore be requested only when useful and proxied through a server-side function.

Sources:

- openrouteservice FAQ: https://giscience.github.io/openrouteservice/frequently-asked-questions/
- openrouteservice directions: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/post

This pass does not integrate MapLibre or ORS yet. It preserves the deterministic Haversine/SVG fallback and records the server-side routing direction for the next pass.

---

## 3. Baseline repository state

Before this branch, AniWhere was already a substantial high-fidelity frontend prototype.

### Implemented before this pass

- Astro + Svelte + TypeScript + Tailwind application;
- harvest entry;
- discovery list and illustrative Laguna map;
- four visible fit states;
- outlet detail pages;
- saved outlets;
- comparison of up to three outlets;
- editable hauling costs;
- local buyer-demo workspace;
- English/Filipino UI;
- localStorage persistence;
- deterministic fixture data;
- Vitest domain/state tests;
- responsive design and documented demo boundaries.

### Important existing boundary

The frontend was intentionally local/demo-only:

- no live Supabase connection;
- no external database;
- no production authentication;
- no live buyer-demand synchronization;
- no MapLibre tiles;
- no OpenRouteService road routing;
- no live public-price feed.

That offline reliability is worth preserving for the hackathon.

---

## 4. Critical problems found in the current implementation

### 4.1 Unknown crop acceptance was being turned into a rejection

The previous matching engine effectively did:

```ts
const cropRule = outlet.acceptedCrops[normalizedCrop];

if (!cropRule) {
  return NO_MATCH;
}
```

That was inconsistent with AniWhere's canonical trust model.

If the data model has no crop rule, AniWhere knows **nothing** about current acceptance. It should not tell the farmer that the outlet does not match.

The data model already has `excludedCrops` for explicit negative evidence.

**Resolution:** missing crop acceptance now becomes `CONTACT_TO_CONFIRM`; only explicit exclusions and other known incompatibilities become `NO_MATCH`.

---

### 4.2 The farmer's ready date was collected but not evaluated

The UI and URL state carried `readyDate`, but `evaluateFit()` ignored it.

That meant a farmer whose harvest would be ready after an offer expired could still receive a full match.

**Resolution:** offer validity windows and receiving weekdays are now evaluated against the farmer's availability date.

---

### 4.3 Offer freshness was reduced to a boolean

A single `isActive` flag cannot distinguish:

- draft;
- pending review;
- active;
- paused;
- expired;
- withdrawn;
- future validity window;
- current window.

**Resolution:** the domain now has an explicit offer lifecycle and validity metadata while temporarily preserving `isActive` for backward compatibility with the hackathon fixtures.

---

### 4.4 Stable place facts and current demand were conflated

The prototype stored current crop-buying conditions directly inside the outlet object.

That is acceptable for a fixture, but unsafe as a production data model. A place can continue to exist when it has no active offer. Likewise, an expired price should disappear as a current quote without deleting the physical place.

**Resolution:** new production-facing contracts and the Supabase schema separate:

- `PlaceRecord`;
- `place_crop_capabilities`;
- `BuyerOfferRecord`;
- `SourceRecord`;
- `VerificationRecord`;
- `reference_prices`.

The local fixture adapter remains compatible so the demo still works.

---

### 4.5 Financial comparison could invent a transport value

The comparison UI previously contained a fallback equivalent to:

```ts
return defaultCost ?? 300;
```

If transport cost was not known, the app could therefore introduce a synthetic PHP 300 hauling cost and calculate an "after transport" result.

That violates AniWhere's rule against invented hauling tariffs.

**Resolution:** unknown hauling now remains `null`. An after-transport amount is calculated only when a fixture has an explicitly labeled demo default or the farmer supplies a value.

---

### 4.6 Unknown remaining quantity could appear as zero

When accepted quantity/capacity was unknown, comparison could render the remaining amount as `0 kg`.

That implied a full allocation despite missing capacity data.

**Resolution:** unknown remaining quantity now renders as **Confirm**, not zero.

---

### 4.7 Prototype dates were hard-coded throughout runtime paths

Several components defaulted to `2026-09-17`.

That would make a later demo or continued development silently stale.

Affected runtime areas included:

- homepage harvest form;
- discovery URL fallback;
- compare;
- outlet detail;
- saved outlets;
- map fallback;
- buyer-offer creation.

**Resolution:** runtime defaults now use the current date in `Asia/Manila` through a shared `todayInManila()` helper.

Historical fixture timestamps remain historical on purpose.

---

### 4.8 Some UI labels implied a recommendation or stronger evidence than existed

Examples included:

- "Best Fit";
- "Highest Payout";
- "Direct Sourcing";
- "Active Schedule";
- "Verified Fixture".

Some of those claims were not derived from the actual evidence object.

**Resolution:** labels were neutralized or replaced with source/freshness fields. Sorting still works, but AniWhere does not proclaim a winner.

---

### 4.9 The repo had no continuous verification gate

The repository documented successful tests/builds, but future pushes were not automatically prevented from drifting.

**Resolution:** this branch adds GitHub Actions for install, unit tests, Astro type checking, and production build.

---

### 4.10 The README still described a planning-only repository

The repo had moved far beyond that state.

**Resolution:** README is updated in this pass to describe the actual working prototype and its current boundaries.

---

## 5. Trust-model invariants implemented

These are the rules the implementation now tries to encode as software rather than prose.

### Invariant A — unknown is not negative

```text
no crop evidence
!=
known crop rejection
```

- missing acceptance fact -> CONTACT_TO_CONFIRM;
- explicit exclusion -> NO_MATCH.

### Invariant B — current compatibility requires current evidence

A paused/non-current offer cannot become MATCH or PARTIAL.

### Invariant C — offer-window mismatch is not automatically place rejection

A future or expired buyer offer cannot produce MATCH/PARTIAL, but the physical place may still have another intake path that AniWhere does not know about. Therefore:

- harvest before a recorded offer starts -> CONTACT_TO_CONFIRM;
- harvest after a recorded offer expires -> CONTACT_TO_CONFIRM;
- expired offer is never treated as active demand;
- a known incompatible receiving weekday inside an otherwise-current intake rule may still become NO_MATCH because that schedule conflict is explicit.

### Invariant D — missing date information stays uncertain

If the buyer has a date-constrained offer but the farmer does not provide a valid ready date, AniWhere returns CONTACT_TO_CONFIRM.

### Invariant E — capacity must be known for a quantity claim

If crop acceptance is plausible/current but capacity is unknown:

- accepted kg = unknown;
- remaining kg = unknown;
- proceeds = not calculated;
- state = CONTACT_TO_CONFIRM.

### Invariant F — partial economics use only accepted quantity

```text
accepted_quantity = min(harvest_quantity, known_capacity)
remaining_quantity = harvest_quantity - accepted_quantity
gross_amount = buyer_price * accepted_quantity
amount_after_transport = gross_amount - known_or_entered_transport
```

No money is calculated on the unaccepted remainder.

### Invariant G — missing price does not become a price

If price is absent:

- no gross amount;
- no after-transport amount.

### Invariant H — missing transport does not become a tariff

No synthetic PHP/km rule and no generic PHP 300 fallback.

### Invariant I — evidence travels with the result

Every fit result can expose:

- evidence kind;
- source label;
- last update;
- validity end;
- unresolved/unknown fields.

### Invariant J — fit does not reserve capacity

Nothing in this branch creates checkout, reservation, payment, or inventory allocation semantics. Match status describes compatibility with current information only.

---

## 6. Domain implementation

### `src/lib/domain/types.ts`

Added a production-oriented contract without breaking the fixture adapter.

#### New offer lifecycle

```ts
type OfferLifecycleStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'expired'
  | 'withdrawn';
```

#### New evidence kinds

```ts
type MarketEvidenceKind =
  | 'demo'
  | 'buyer_offer'
  | 'reviewed_place'
  | 'public_reference'
  | 'unknown';
```

#### Crop conditions now support

- offer lifecycle;
- validity range;
- receiving weekdays;
- source kind;
- source label;
- last-update timestamp.

#### New production-facing models

- `PlaceRecord`
- `BuyerOfferRecord`
- `SourceRecord`
- `VerificationRecord`

These are deliberately distinct from the frontend fixture `Outlet`.

#### Fit results now include

- `evidenceKind`
- `sourceLabel`
- `dataUpdatedAt`
- `dataValidUntil`
- `unknowns`
- `unknownsFil`

---

## 7. Matching-engine implementation

### `src/lib/domain/match.ts`

The engine now evaluates in a trust-preserving order.

Conceptually:

```text
1. explicit crop exclusion?
   -> NO_MATCH

2. outside detailed pilot crop scope?
   -> CONTACT_TO_CONFIRM

3. acceptance record absent?
   -> CONTACT_TO_CONFIRM

4. recorded offer not current?
   -> CONTACT_TO_CONFIRM

5. date-constrained offer but ready date unknown?
   -> CONTACT_TO_CONFIRM

6. offer is future/expired for this harvest date?
   -> CONTACT_TO_CONFIRM (offer is unusable; alternative/general intake remains unknown)

7. known receiving-day conflict?
   -> NO_MATCH

8. capacity unknown?
   -> CONTACT_TO_CONFIRM

9. below known minimum?
   -> NO_MATCH

10. known capacity less than harvest?
    -> PARTIAL

11. otherwise
    -> MATCH
```

This ordering matters. AniWhere only makes a negative assertion when it has evidence for the incompatibility.

---

## 8. Tests added or expanded

### `src/lib/domain/match.test.ts`

The suite now explicitly covers:

1. full tomato match;
2. full processor match;
3. partial match and remainder;
4. unknown capacity -> confirm;
5. explicit exclusion -> no match;
6. missing crop rule -> confirm;
7. paused/non-current offer -> confirm;
8. future buying window -> confirm, never match;
9. expired buying window -> confirm, never active demand;
10. missing ready date on constrained offer -> confirm;
11. incompatible receiving weekday -> no match;
12. unknown price -> no fabricated proceeds;
13. Filipino/English crop aliases;
14. unsupported crop -> confirm;
15. demo evidence propagation.

### `src/lib/domain/validation.test.ts`

Added coverage for:

- optional omitted date;
- malformed date;
- impossible calendar date.

### `src/lib/state/url-state.test.ts`

Added coverage for Manila-local date behavior, including UTC-to-Manila day rollover.

---

## 9. Current-date and input handling

### Shared helper

`todayInManila()` now lives in `src/lib/state/url-state.ts`.

It uses an explicit `Asia/Manila` timezone rather than browser-local assumptions or a frozen hackathon date.

### Updated runtime consumers

- `HarvestForm.svelte`
- `ComparisonExperience.svelte`
- `OutletDetailExperience.svelte`
- `SavedOutletsExperience.svelte`
- `ResilientLagunaMap.svelte`
- `BuyerOfferEditorModal.svelte`

The homepage date field also exposes validation feedback and no longer silently accepts malformed dates.

---

## 10. Provenance and freshness UI

### Discovery cards

Cards now expose the evidence behind the result:

- source label;
- last-updated date;
- valid-until date;
- unresolved unknowns.

This keeps a future current buyer offer visibly distinct from:

- a reviewed place;
- a public reference;
- demo data;
- unknown information.

### Outlet detail

Previous implied claims were replaced with evidence-driven fields.

Instead of generic claims such as "Direct Sourcing" or "Verified Fixture", the detail page now surfaces:

- evidence type/source;
- last updated;
- valid until;
- still-unknown requirements.

### Comparison

Each comparison option now carries its provenance/freshness context alongside quantity and economics.

The comparison view also stops rendering unknown remaining quantity as zero.

---

## 11. Financial-integrity implementation

AniWhere continues to avoid the word **profit**.

The implemented arithmetic remains:

```text
Gross Amount
= accepted quantity x buyer-posted/demo price

Amount After Transport
= Gross Amount - known/entered hauling expense
```

It explicitly excludes:

- production cost;
- fertilizer;
- seed;
- labor;
- irrigation;
- handling;
- spoilage;
- other farm costs.

### Important correction in this pass

There is no longer an implicit PHP 300 fallback when hauling is unknown.

That means a missing logistics quote cannot create a fake economic comparison.

---

## 12. Demo-data handling

### `src/content/demo-outlets.ts`

Demo conditions now carry explicit metadata:

- `sourceKind: 'demo'`
- `sourceLabel: 'Demo — sample data'`
- `lastUpdatedAt`
- `validFrom`
- `validUntil`
- `offerStatus: 'active'`

The demo remains fictional.

These fields exist so the same UI and matching engine can later consume genuine current offers without pretending that fixture data is real.

---

## 13. Production database scaffold

### `supabase/schemas/market_data_v2.sql`

A production-oriented declarative SQL schema is now versioned in the repository.

This schema is **not applied to a live or local Supabase database in this pass**. A versioned migration must be generated and reviewed with the current Supabase CLI workflow once the project is intentionally initialized.

### Tables

#### `organizations`

Represents:

- buyer organizations;
- cooperatives;
- LGUs;
- agricultural programs;
- administrative organizations.

#### `profiles`

Authenticated human profile, keyed to Supabase Auth user ID.

#### `organization_memberships`

Roles:

- admin;
- steward;
- buyer_editor;
- viewer.

#### `sources`

Tracks where a fact came from.

Kinds include:

- buyer_offer;
- reviewed_place;
- public_reference;
- demo.

#### `places`

Stable physical outlet information:

- name;
- category;
- municipality;
- coordinates;
- contact;
- review status;
- source;
- last review time.

#### `place_editors`

Explicit assignment of people who may maintain a place.

#### `place_crop_capabilities`

Longer-lived knowledge about whether a place is known to handle a crop.

The critical field is:

```text
accepted
excluded
unknown
```

This encodes the distinction that was previously missing from the frontend fixture model.

#### `offers`

Time-sensitive buyer demand.

Fields include:

- crop;
- status;
- min/max quantity;
- buyer price;
- valid from/to;
- receiving weekdays;
- receiving times;
- variety;
- grade;
- packaging;
- notes;
- source;
- author;
- update timestamps.

#### `verifications`

Review trail for:

- places;
- offers;
- crop capabilities.

#### `reference_prices`

Public/contextual price observations.

Price type is explicitly constrained to:

- farmgate reference;
- retail reference;
- historical reference.

This table is deliberately not the buyer-offer table.

---

## 14. Supabase authorization model

The declarative schema is designed around the current AniWhere operating model.

### Anonymous farmer

Can read:

- reviewed public places;
- public crop capabilities;
- active/current public offers;
- public sources;
- public reference-price context.

Does not need an account to search.

### Buyer/editor

Can manage offers only for assigned places.

### Steward/admin

Can receive broader place-level rights through organization membership.

### System/service role

Reserved for privileged administrative/verification workflows that should not be exposed to ordinary clients.

---

## 15. RLS and grants

The schema:

- enables RLS on every exposed data table;
- revokes broad defaults;
- selectively grants operations;
- defines `private.can_edit_place(uuid)` as a tightly scoped security-definer helper outside the exposed `public` schema;
- uses assignment/membership checks for writes;
- hides non-current offers from anonymous public reads;
- requires reviewed place status for public discovery;
- keeps raw verification notes non-public for now.

This is a scaffold and must still undergo local Supabase testing before it is applied to a production project.

---

## 16. Initial database test contract

### `supabase/tests/market_data_rls.test.sql`

A pgTAP test file now asserts that:

- RLS is enabled on the schema tables;
- the edit authorization helper exists;
- offers have distinct policy coverage.

This first file is structural.

The next security-test pass should add behavioral tests for:

- anonymous farmer can read approved records;
- anonymous user cannot write;
- buyer can edit assigned place;
- buyer cannot edit another buyer's place;
- steward can edit organization-managed place;
- draft/paused/expired offer is hidden publicly;
- current active offer is public;
- service role can write verification records.

The Supabase tests are not part of the frontend GitHub workflow yet because the repository does not currently install/run a local Supabase stack in CI.

### Supabase security/workflow audit performed in this pass

After the initial scaffold was written, it was re-audited against the current Supabase skill/documentation. That audit caused two important corrections before handoff:

1. the RLS membership helper was moved from the exposed `public` schema into a non-exposed `private` schema, with an empty `search_path`, explicit `auth.uid()` checks, revoked public execution, and authenticated-only execute permission;
2. the hand-authored file was moved from `supabase/migrations/` to `supabase/schemas/` because this repository has not yet initialized and verified a local Supabase project. The next implementation pass should generate the actual versioned migration through the current CLI workflow after local testing/advisors rather than pretending the scaffold is already a deployable migration.

The audit also added an assigned-editor SELECT policy for `place_crop_capabilities`, because PostgreSQL RLS UPDATE behavior requires the target row to be selectable.

---

## 17. Continuous integration

### `.github/workflows/ci.yml`

The repository now has an automatic frontend verification gate.

Every relevant push/PR runs:

```text
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build
```

An early CI run failed during Node setup because the cache configuration was coupled to setup behavior before any source validation ran. The workflow was corrected by removing that cache coupling.

The branch should not be merged until the latest branch-head CI run is green.

---

## 18. README and repository truth

The repository README is updated in this pass because the old README described AniWhere as planning materials rather than a completed application.

The new README distinguishes:

- implemented high-fidelity frontend;
- deterministic domain logic;
- demo data;
- current local/offline architecture;
- Supabase production scaffold;
- future live-data/routing work;
- verification commands.

---

## 19. Files changed in this pass

### Domain

- `src/lib/domain/types.ts`
- `src/lib/domain/match.ts`
- `src/lib/domain/match.test.ts`
- `src/lib/domain/validation.ts`
- `src/lib/domain/validation.test.ts`

### State

- `src/lib/state/url-state.ts`
- `src/lib/state/url-state.test.ts`

### Demo data

- `src/content/demo-outlets.ts`

### UI

- `src/components/harvest/HarvestForm.svelte`
- `src/components/discovery/DiscoveryExperience.svelte`
- `src/components/places/OutletDetailExperience.svelte`
- `src/components/compare/ComparisonExperience.svelte`
- `src/components/saved/SavedOutletsExperience.svelte`
- `src/components/map/ResilientLagunaMap.svelte`
- `src/components/buyer/BuyerOfferEditorModal.svelte`

### Backend scaffold

- `supabase/schemas/market_data_v2.sql`
- `supabase/tests/market_data_rls.test.sql`
- `supabase/README.md`

### Engineering

- `.github/workflows/ci.yml`

### Documentation

- `README.md`
- `docs/FRONTEND_LIMITATIONS.md`
- this implementation report

---

## 20. What this pass deliberately does not claim

This branch does **not** mean AniWhere has:

- a live Supabase production backend;
- verified live buyer demand;
- signed buyer/LGU/cooperative partnerships;
- current real buyer prices;
- real freight tariffs;
- MapLibre production maps;
- OpenRouteService road-distance integration;
- payment/checkout;
- reserved buyer capacity;
- transaction settlement;
- automated logistics booking;
- AI-based buyer prediction;
- satellite-based harvest-maturity detection.

The hackathon fixture remains a fixture.

---

## 21. Why MapLibre/ORS are deferred from this pass

The existing SVG/Haversine implementation provides a dependable zero-network fallback.

The next mapping architecture should be progressive:

```text
Discovery
  -> Haversine for all candidate outlets
  -> MapLibre when live map resources are available
  -> ORS only for selected/detail/compare destinations
  -> server-side proxy + cache
  -> fall back to straight-line distance when routing fails
```

This avoids:

- exposing an ORS API key;
- routing every search result unnecessarily;
- exhausting service quotas;
- allowing a network failure to break the farmer's core decision workflow.

---

## 22. Recommended next implementation sequence

### P0 — verify and merge this trust-model pass

- make CI green;
- inspect branch diff;
- merge only after tests/typecheck/build pass.

### P0 — behavioral Supabase security tests

Extend pgTAP tests from structural RLS checks to actual allow/deny scenarios.

### P0 — adapter/repository boundary

Introduce explicit interfaces such as:

```ts
interface PlaceRepository {
  findCandidates(query: HarvestQuery): Promise<PlaceRecord[]>;
}
```

Implement:

- demo adapter;
- Supabase adapter.

This keeps demo and production data physically difficult to mix.

### P0 — real place pilot dataset

Build a small reviewed Laguna dataset.

A real place with unknown current demand must show:

> Contact to confirm

—not a fabricated buyer offer.

### P1 — Supabase project connection

Once a target project is intentionally selected:

- initialize and test the Supabase project locally;
- generate/review a versioned migration through the current CLI workflow;
- run database advisors and RLS tests;
- apply the reviewed migration to the intended project;
- generate typed client definitions;
- validate RLS;
- create buyer/steward invitation flow;
- migrate the buyer workspace off localStorage only for authenticated production mode.

### P1 — source and verification workflow

Build steward/admin tooling for:

- add/review place;
- attach source;
- record verification date;
- mark stale;
- approve capability;
- invite buyer;
- review current offer.

### P1 — MapLibre progressive map

Add MapLibre behind the resilient fallback.

Keep list mode usable even when map initialization fails.

### P1 — ORS server proxy

Use a Supabase Edge Function or equivalent server endpoint:

```text
browser -> trusted server function -> ORS -> cached route result
```

Never expose the routing secret directly in browser code.

### P1 — public reference-price layer

Ingest carefully attributed reference prices separately from buyer offers.

Do not label a retail/reference series as a buyer quote.

### P2 — PWA/offline synchronization

Cache:

- shell;
- translations;
- reviewed places;
- last search;
- saved places.

For authenticated writes:

- queued/pending-sync state;
- explicit sync success;
- never show "published" before the server confirms it.

### P2 — upcoming harvest mode

Use the existing `readyDate` semantics to support future harvest discovery and optional alerts.

### P2 — institutional coordinator view

Only after enough real data exists, expose:

- upcoming supply;
- active demand;
- stale records;
- unmatched likely supply.

Do not fabricate forecasting from fixture data.

---

## 23. Product direction after this pass

AniWhere should remain intentionally narrow.

It should not become an agriculture super-app.

The target product is:

> **A trustworthy harvest-to-market decision layer that tells a farmer what is known, what is uncertain, which destinations are compatible with the current evidence, how much each can take, and what the trip means economically before the farmer travels.**

That means the key product asset is not the map.

Over time the durable asset becomes:

- reviewed market network;
- buyer-demand history;
- provenance;
- freshness;
- institutional stewardship;
- records of successful or failed market linkage.

---

## 24. Merge-readiness checklist

Before merging this branch:

- [ ] latest GitHub Actions run passes;
- [ ] unit tests pass;
- [ ] Astro type check passes;
- [ ] production build passes;
- [ ] no current demo claim is presented as real market demand;
- [ ] missing crop rule returns CONTACT_TO_CONFIRM;
- [ ] explicit excluded crop returns NO_MATCH;
- [ ] expired/future offer window cannot return MATCH and degrades to CONTACT_TO_CONFIRM unless another current intake path is known;
- [ ] explicit incompatible receiving schedule cannot return MATCH;
- [ ] unknown capacity does not calculate accepted/remainder values;
- [ ] unknown price does not calculate proceeds;
- [ ] unknown hauling does not calculate amount-after-transport;
- [ ] source/freshness visible in discovery/detail/compare;
- [ ] current date defaults use Asia/Manila;
- [ ] Supabase schema remains clearly marked as scaffold until actually applied;
- [ ] branch diff reviewed before merge.

---

## 25. Final note for future agents

Treat this report and the canonical AniWhere anti-hallucination master context as complementary:

- the canonical master context defines product truth and anti-hallucination constraints;
- this report documents what was actually changed in the repository during the trust-model-v2 implementation pass.

If they disagree about implementation state, inspect the current repository before making a claim.

Never infer that a schema file means a live database exists.

Never infer that a reviewed place has a current offer.

Never infer that a current offer reserves capacity.

Never infer that a public/reference price is a buyer quote.

Never convert an unknown into a match or a rejection simply to make the UI look complete.


---

## 26. Continued implementation log after the initial hardening pass

This branch continued evolving after the first version of this report. The following changes were pushed as separate feature/fix commits rather than held locally.

### 26.1 Supabase workflow correction

A fresh audit against current Supabase documentation changed the backend handoff strategy.

**Finding:** for a new project, current Supabase documentation supports a declarative-schema workflow under `supabase/schemas/`, followed by a CLI-generated migration and local verification. A hand-authored timestamped migration that has never been generated/applied/tested by the CLI can falsely look deploy-ready.

**Implemented:**

- moved the undeployed market schema to `supabase/schemas/market_data_v2.sql`;
- removed the unverified hand-authored migration from `supabase/migrations/`;
- updated the handoff documentation to require:
  - local Supabase initialization;
  - declarative schema inclusion;
  - CLI-generated migration;
  - review of the generated diff;
  - local reset;
  - database advisors;
  - pgTAP tests;
- kept the explicit boundary that no live Supabase project is connected by this branch.

### 26.2 RLS helper security hardening

**Finding:** privileged helper functions in an exposed schema are an unnecessary attack surface, especially when `SECURITY DEFINER` is involved. Current Supabase security guidance recommends treating grants and RLS as separate layers and reviewing privileged functions carefully.

**Implemented:**

- isolated privileged authorization helpers under a non-exposed `private` schema;
- moved the timestamp trigger helper out of `public`;
- revoked anonymous/public execution on private helpers;
- retained only the minimum authenticated execute permission required for the RLS authorization helper;
- added restrictive default privileges for future public-schema objects;
- changed direct `auth.uid()` predicates to scalar subqueries where used repeatedly in policies;
- corrected malformed dollar quoting discovered during the schema audit;
- expanded the pgTAP structural contract to check:
  - the `private` schema exists;
  - `private.can_edit_place(uuid)` exists;
  - `private.set_updated_at()` exists;
  - anonymous users cannot execute the place authorization helper;
  - authenticated users can execute only the authorization helper needed by RLS;
  - authenticated users cannot directly execute the timestamp trigger helper.

These database tests remain source-controlled contracts until a local Supabase stack is intentionally initialized and run.

### 26.3 Runtime place/offer separation

**Finding:** the production schema separated stable places from time-sensitive offers, but the frontend fixture source still authored them as one monolithic `Outlet` object. That made the runtime architecture contradict the production model and increased the chance that later real data would be mixed incorrectly.

**Implemented:**

Stable facts are now authored separately in:

- `src/content/demo-places.ts`
- `src/content/demo-capabilities.ts`
- `src/content/demo-sources.ts`

Time-sensitive demand is authored separately in:

- `src/content/demo-offers.ts`

Demo-only logistics assumptions are isolated in:

- `src/content/demo-transport.ts`

Repository contracts now live in:

- `src/lib/data/market-repository.ts`
- `src/lib/data/demo-market-repository.ts`

A pure presentation adapter lives in:

- `src/lib/data/outlet-adapter.ts`

The legacy `DEMO_OUTLETS` export still exists so the UI does not need a risky rewrite during the hackathon pass, but it is now derived at the presentation boundary instead of being the source of truth.

This means:

```text
stable place
+ crop capability evidence
+ current/non-current offers
+ provenance
+ demo hauling assumption
        ↓
presentation adapter
        ↓
existing Outlet UI contract
```

The adapter deliberately does **not** convert an explicitly unknown capability into an accepted crop.

### 26.4 Runtime data-separation tests

Added `src/lib/data/outlet-adapter.test.ts` to verify:

- every demo offer references an existing place;
- explicit crop exclusions survive composition;
- active offer price/capacity/provenance survive composition;
- demo hauling assumptions stay explicit;
- an accepted capability with no offer does not invent price/capacity/offer status;
- an `unknown` capability does not become an accepted crop.

### 26.5 Build-system defects found by CI

The new GitHub Actions gate found two existing repository issues before source tests could run:

1. `pnpm-workspace.yaml` had no valid `packages` entry, causing clean `pnpm install --frozen-lockfile` to fail.
2. the first CI setup used unnecessary Node cache coupling.

Both were corrected. The workflow now installs cleanly, runs tests, performs Astro checking, and builds the production site.

A later CI run also exposed that old comparison tests omitted `readyDate`. The stricter engine correctly refused date-constrained economics without a harvest date. The tests were fixed to provide an explicit availability date rather than weakening the engine.

### 26.6 Current rule for feature pushes

From this point in the pass, each completed feature or fix is pushed immediately to `feat/trust-model-v2` instead of being accumulated locally. This gives the branch an inspectable rollback trail and makes CI feedback available feature-by-feature.


### 26.7 Explicit demo-vs-pilot data-mode isolation

**Finding:** even after separating demo places and offers, runtime components still needed an explicit guard against a future configuration accidentally showing demo fixtures under a pilot/live label.

**Implemented:**

- added `src/lib/data/current-market.ts`;
- added `PUBLIC_DATA_MODE=demo` to `.env.example`;
- runtime pages now consume `CURRENT_OUTLETS` instead of importing demo fixtures directly;
- `demo` is the only configured runtime mode in this branch;
- requesting `PUBLIC_DATA_MODE=pilot` fails closed with a clear error until a reviewed pilot adapter is implemented;
- unknown data-mode values are rejected rather than silently coerced;
- added unit tests for mode parsing and fail-closed semantics.

This prevents an environment-variable change from making fictional fixture data look like a live pilot.

### 26.8 Structured quality and packaging matching

**Finding:** quality/packaging requirements were previously prose-only. AniWhere could display them, but could not distinguish:

- requirement exists + farmer has not provided the detail; from
- requirement exists + farmer detail is explicitly incompatible.

**Implemented:**

- added `StructuredRequirement` and `HarvestDetailField` domain contracts;
- harvest queries may now carry optional `variety`, `grade`, and `packaging`;
- buyer-offer records can carry structured requirements;
- the Supabase declarative schema now includes a JSONB structured-requirements payload;
- the presentation adapter carries structured requirements into the deterministic match engine;
- matching semantics are now:
  - required detail missing -> **CONTACT_TO_CONFIRM**;
  - required detail present and incompatible -> **NO_MATCH**;
  - required detail present and compatible -> continue normal schedule/capacity matching;
- matching remains exact, deterministic, case-normalized, and auditable; no LLM inference is used;
- added tests for missing, incompatible, and compatible structured requirements.

### 26.9 Progressive optional harvest-detail UX

**Finding:** machine-evaluable requirements are only useful if a farmer can provide the relevant information without turning the homepage into a long procurement form.

**Implemented:**

- the main four inputs remain unchanged:
  - crop;
  - quantity;
  - origin;
  - ready date;
- added an optional collapsed **Harvest details** section for:
  - variety;
  - grade;
  - packaging;
- added English/Filipino labels;
- optional details are serialized into URL state;
- URL parsing/round-trip tests cover them;
- discovery's inline harvest editor can update them;
- outlet-detail, saved, compare, and back-navigation links preserve them;
- the prepared inquiry message includes known harvest details instead of dropping them.

This follows progressive-disclosure UX: farmers are not forced to understand procurement fields before searching, while explicit requirements can still be evaluated when relevant.

### 26.10 Contact-data truth hardening

**Finding:** the detail page labeled an action **Public contact** but the demo modal contained invented operating hours and a masked fictional phone line. Even with a demo notice, those operational details could be mistaken for real information.

**Implemented:**

- added optional `contactPhone` and `contactEmail` fields to the outlet presentation contract;
- the place-to-outlet adapter carries verified contact values only when they exist in the underlying place record;
- removed invented operating hours;
- removed the fictional masked phone line;
- if no verified public contact exists, AniWhere now says so explicitly;
- the action label changes to **No verified contact** for records without one;
- the modal states that AniWhere does not substitute invented contact details;
- changed "Laguna Market Pilot" fixture wording to **Illustrative Laguna demo**.

### 26.11 Evidence-aware price wording

**Finding:** the UI historically used "Sample price" everywhere, which is correct for demo fixtures but would become wrong as soon as a real buyer-posted offer is connected. The inquiry template also rendered an awkward `₱---/kg` when price was unknown.

**Implemented:**

Price labeling now follows evidence type:

- demo -> **Sample price**;
- buyer offer -> **Buyer-posted price**;
- other/unknown -> neutral **Price**.

The prepared inquiry message now:

- asks for the current price when none is known;
- calls demo fixture prices demo/sample prices;
- calls real buyer-offer prices posted prices;
- never inserts `₱---` as if it were a meaningful figure.

Discovery, outlet detail, and comparison use consistent evidence-aware price wording.

### 26.12 Copy and sorting correctness sweep

**Findings:**

- homepage copy still claimed "verified local outlets" even though the runtime is demo fixtures;
- the 404 page still referenced "verified Laguna pilot fixtures";
- discovery transport sorting used a falsy fallback, so a legitimate zero transport value would be treated as unknown.

**Implemented:**

- removed unearned "verified outlet" and "verified pilot" language;
- replaced it with potential/illustrative-data wording;
- price/payout sorting now sends truly missing values to the bottom using nullish semantics;
- transport sorting now preserves a legitimate `0` value and treats only null/undefined as unknown.

### 26.13 Verification status during continued implementation

GitHub Actions has repeatedly validated intermediate heads during this pass. CI caught:

- invalid workspace configuration;
- an old comparison test that omitted required availability date context;
- one misplaced URL-state assertion introduced while expanding tests.

Each was fixed rather than bypassed.

The merge rule remains: **do not merge until the exact final branch head passes install, unit tests, Astro type checking, and production build.**


### 26.14 Final frontend verification before PR

The exact code head immediately before this documentation update was:

`5b2c7e94b7cd8e30889996503fd70e064bcd415c`

GitHub Actions run **35323978068** completed successfully on 18 September 2026.

Verified stages:

- clean `pnpm install --frozen-lockfile`;
- full Vitest suite;
- Astro type checking;
- production build.

Result: **success**.

This verifies the frontend/application portion of the trust-model-v2 pass. It does **not** claim that the undeployed Supabase declarative schema has been applied to or tested against a live/local Supabase database; that remains an explicit next-step boundary documented in `supabase/README.md`.
