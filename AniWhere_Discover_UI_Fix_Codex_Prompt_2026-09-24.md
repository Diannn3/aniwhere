# AniWhere Discover UI Fix — Codex Implementation Prompt

You are working on **AniWhere** in `Diannn3/aniwhere`.

This task is **ONLY about fixing the Discover page UI shown in the attached screenshots**. Another agent is separately working on the Bagsakan redesign, so **do not touch buyer/Bagsakan architecture or unrelated files**.

Latest known `main` is:

`1e3d29e1cf5f663dbc34eafa6546bbf587650163`

but **fetch and verify current `main` first**.

## Problem

The current `/discover` page is visually broken.

From the screenshots:

- the filter/sort panel is badly positioned and overlaps content;
- the filter chips and sort control are cramped/misaligned;
- the map workspace and result area have layout/z-index problems;
- the filter panel appears to float into the wrong region;
- the page has too much visual collision between:
  - harvest summary,
  - map,
  - filters,
  - list/results,
  - Map/List toggle;
- most importantly, **I cannot click between `Map` and `List`**.

Treat the screenshots as evidence of a real UI regression, not just a styling preference.

## Your task

**Inspect, reproduce, diagnose, and fix the Discover page.**

Do not blindly patch CSS.

First trace the actual current implementation and identify the root cause of:

1. why the `Map / List` toggle is not clickable;
2. whether an invisible/transparent overlay is intercepting pointer events;
3. whether the problem comes from:
   - `z-index`,
   - `position: absolute/fixed/sticky`,
   - oversized containers,
   - `pointer-events`,
   - stacking contexts,
   - map canvas/map controls,
   - filter panel dimensions,
   - mobile/desktop layout logic,
   - or duplicated rendering;
4. why the filter/sort controls are visually overlapping and detached from the intended layout;
5. whether the map or another element is extending over the result/list region.

## Inspect these areas first

At minimum inspect:

```text
src/components/discovery/DiscoveryExperience.svelte
src/components/map/LiveLagunaMap.svelte
src/components/map/ResilientLagunaMap.svelte
src/pages/discover.astro
src/styles/global.css
src/layouts/BaseLayout.astro
tests/harvest-flow.spec.ts
tests/map-routing.spec.ts
tests/resilience-and-a11y.spec.ts
tests/market-evidence.spec.ts
tests/support.ts
DESIGN.md
```

Search the repo for:

```text
activeMobileView
view=map
view=list
Map
List
Filter & sort
statusFilter
sortBy
discovery-workspace
discovery-outlets
z-
pointer-events
sticky
absolute
fixed
overflow
```

## Reproduce before editing

Run the current app and reproduce the issue in-browser.

Use the same kind of scenario shown in the screenshots:

```text
crop = calamansi
quantity = 300 kg
origin = Los Baños
```

Check at least:

```text
1440x900
1366x768
1024x768
768x1024
390x844
375x667
```

Use Playwright or browser inspection to determine which element actually receives/intercepts the click on the `Map` and `List` buttons.

Verify:

- `Map` button receives click;
- `List` button receives click;
- clicking List actually renders the list;
- clicking Map actually renders the map;
- the state does not immediately get overwritten by URL/state sync;
- no transparent overlay is sitting above the buttons;
- keyboard activation works with Enter/Space;
- focus state is visible.

## Desired layout direction

Keep AniWhere's current visual identity, but make the Discover page much cleaner.

### Desktop

The page should read approximately:

```text
---------------------------------------------------------
Harvest summary / edit
---------------------------------------------------------

[ Filters / status / sort ]              [ Map | List ]

---------------------------------------------------------
main discovery workspace
---------------------------------------------------------
```

The filter controls should live in **one clean horizontal toolbar** or a compact responsive row.

Do not let them float on top of the map or overlap cards.

For example:

```text
All (11) | Matches (0) | Accepts part (0) |
Confirm first (11) | Doesn't match (0)

Sort: Match first                    Map | List
```

On smaller widths, wrap them cleanly into 2 rows.

### Map view

- map gets the main workspace;
- harvest summary may overlay the map only if intentionally positioned and not blocking controls;
- filters should not cover map controls;
- Map/List toggle must remain clickable;
- map attribution/zoom controls remain usable.

### List view

- do not leave the giant map occupying the page;
- list becomes the main content;
- result cards should flow normally;
- same filters/sort stay available;
- no empty absolute-positioned map layer should remain over the list.

## Important UX fix

Do **not** solve the click bug by just adding an absurdly high `z-index` to the toggle.

Find the root stacking/layout issue.

If there is a full-screen or oversized absolute element intercepting clicks, fix its bounds or pointer behavior correctly.

If a hidden view remains in the DOM and overlaps the active view, fix the rendering/layout logic rather than layering over it.

## Preserve AniWhere behavior

Do not change:

- `MATCH`
- `PARTIAL`
- `CONTACT TO CONFIRM`
- `NO MATCH`
- matching logic
- data semantics
- demo evidence semantics
- price/provenance logic
- routing truth model

This is a **Discover UI/interactivity repair**, not a product-logic redesign.

Do not modify:

```text
src/components/buyer/*
src/lib/state/buyer-demo.ts
Bagsakan implementation work
Supabase schema
Ani architecture
```

unless an unrelated import/build issue absolutely requires it.

## Implementation workflow

Create an isolated branch:

```bash
git switch main
git pull --ff-only origin main
git switch -c fix/discover-layout-toggle
```

Before editing, record current test status.

Use atomic commits.

Suggested sequence:

### Commit 1

`fix: restore discover view toggle interaction`

Only fix the Map/List interaction/root pointer-event/stacking bug.

Acceptance:

- both buttons clickable;
- state changes correctly;
- map/list switching works;
- keyboard works;
- no overlay intercepts them.

### Commit 2

`fix: reorganize discover filter and sort layout`

Fix:

- filter chip wrapping;
- sort layout;
- spacing;
- panel positioning;
- overlap shown in screenshots.

### Commit 3

`fix: separate map and list discovery surfaces`

Ensure:

- map view uses map workspace;
- list view uses normal document flow;
- inactive view cannot block pointer events;
- no giant empty map region remains in list mode.

### Commit 4

`test: cover discover map list interaction`

Add regression tests for:

- Map → List;
- List → Map;
- pointer click;
- keyboard interaction;
- active view visibility;
- hidden view not blocking controls;
- responsive layouts.

If fewer commits are sufficient, keep them atomic rather than forcing exactly four.

## Testing

Run:

```bash
pnpm test:unit
pnpm check
pnpm build
pnpm test:e2e -- tests/harvest-flow.spec.ts
pnpm test:e2e -- tests/map-routing.spec.ts
pnpm test:e2e -- tests/resilience-and-a11y.spec.ts
```

Then run the full Playwright suite if feasible.

Check:

```bash
git diff --check
```

## Visual acceptance

Before finishing, inspect screenshots at:

- 1440×900
- 1024×768
- 768×1024
- 390×844

The final Discover page should:

- have no overlapping filter panel;
- have no clipped controls;
- have no floating blank container;
- have a clearly clickable Map/List switch;
- show the correct active state;
- transition between map and list without layout corruption;
- preserve readable result cards;
- preserve map controls;
- avoid horizontal overflow;
- remain consistent with AniWhere's current visual system.

## Final response

Tell me:

1. root cause of the click bug;
2. root cause of the layout corruption;
3. exact files changed;
4. each atomic commit SHA/message;
5. test results;
6. whether anything remains broken;
7. branch name;
8. whether it was pushed.

**Do not merge into `main`. Push only the fix branch.**

Start by inspecting/reproducing the issue, then implement the fix.
