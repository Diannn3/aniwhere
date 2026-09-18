# AniWhere Supabase handoff

This directory is the production-backend scaffold for AniWhere. It is intentionally **not connected to the hackathon demo runtime yet**.

## Why it exists

The frontend prototype originally stored a crop rule directly inside an outlet fixture. That is safe for a deterministic demo, but it collapses two different facts:

1. a **place** exists and may handle a commodity; and
2. a **current buyer offer** has quantity, price, schedule, and expiry.

The v2 schema keeps those concepts separate.

## Migration

`schemas/market_data_v2.sql` declares:

- organizations and membership roles
- stable reviewed places
- explicit place editors
- crop capability facts with accepted / excluded / unknown semantics
- time-sensitive offers with lifecycle, validity windows, and receiving days
- source/provenance records
- verification records
- reference prices kept separate from buyer quotes
- RLS and least-privilege grants, with the privileged membership helper isolated in a non-exposed `private` schema

Farmers remain anonymous readers of approved public data. Buyers/stewards may edit only assigned places/offers.

## Tests

`tests/market_data_rls.test.sql` is a first pgTAP contract that verifies RLS is enabled on every exposed table and that the key offer policies exist.

This repository is not yet initialized against a live/local Supabase project. When that step is intentionally taken, use the current Supabase CLI workflow: initialize/start locally, include the declarative schema, generate a versioned migration with the CLI, run database advisors, review the generated migration, reset/apply locally, then run `supabase test db`. Do not treat the schema file itself as a deployed migration.

Before production, extend the RLS suite with allow/deny behavior tests for:

- anonymous farmer reads
- buyer editing an assigned place
- buyer denied access to another buyer's place
- steward access through organization membership
- draft/paused/expired offers hidden from anonymous farmers
- service-role verification writes

## Important boundary

No migration in this directory is proof that a live Supabase project is configured. The current hackathon demo remains local-first and uses explicit fictional fixtures.
