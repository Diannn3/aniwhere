# AniWhere Supabase handoff

This directory is the production-backend scaffold for AniWhere. It is intentionally **not connected to the hackathon demo runtime yet**.

## Why it exists

The frontend prototype originally stored a crop rule directly inside an outlet fixture. That is safe for a deterministic demo, but it collapses two different facts:

1. a **place** exists and may handle a commodity; and
2. a **current buyer offer** has quantity, price, schedule, and expiry.

The v2 schema keeps those concepts separate.

## Migration

`migrations/202609180001_market_data_v2.sql` creates:

- organizations and membership roles
- stable reviewed places
- explicit place editors
- crop capability facts with accepted / excluded / unknown semantics
- time-sensitive offers with lifecycle, validity windows, and receiving days
- source/provenance records
- verification records
- reference prices kept separate from buyer quotes
- RLS and least-privilege grants

Farmers remain anonymous readers of approved public data. Buyers/stewards may edit only assigned places/offers.

## Tests

`tests/market_data_rls.test.sql` is a first pgTAP contract that verifies RLS is enabled on every exposed table and that the key offer policies exist.

When the Supabase CLI is added to the development environment:

```bash
supabase start
supabase db reset
supabase test db
```

Before production, extend the RLS suite with allow/deny behavior tests for:

- anonymous farmer reads
- buyer editing an assigned place
- buyer denied access to another buyer's place
- steward access through organization membership
- draft/paused/expired offers hidden from anonymous farmers
- service-role verification writes

## Important boundary

No migration in this directory is proof that a live Supabase project is configured. The current hackathon demo remains local-first and uses explicit fictional fixtures.
