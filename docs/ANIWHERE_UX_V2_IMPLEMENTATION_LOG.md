# AniWhere UX V2 implementation log

## Product boundary

AniWhere is a harvest-based discovery aid for farmers. It shows illustrative market-fit information and explicit evidence states; it does not guarantee a buyer, price, capacity, reservation, or profit.

## 2026-09-21 — shared farmer shell and harvest intake

Implemented:

- an evidence-honest EN/FIL layout shell with a compact farmer navigation model;
- the Field Olive, Young Leaf, Soil Brown, Rice Cream, Warm Surface, Field Ink, and Route Blue system, including restrained agricultural gradients and forced-colors/reduced-motion fallbacks;
- locally bundled Source Sans 3 and Source Serif 4 variable fonts;
- a responsive Harvest Ticket with visible crop choices, native quantity/date controls, local draft restore, URL-state restore, optional crop details, error summary links, and inline error messages;
- a home route that leads with the decision task and uses an explicitly illustrative Laguna route diagram.

Verification is recorded per atomic change as the remaining route surfaces, automated checks, and browser QA are completed.

## 2026-09-21 — comparison ledger

Implemented a side-by-side, horizontally scrollable comparison ledger with metric rows and outlet columns. It keeps fit status, accepted and remaining quantity, price evidence, source freshness, and confirmation questions distinct. Transport is editable per outlet; the after-transport figure is explicitly not profit or guaranteed income, and it remains uncalculated when a transport amount is absent.
