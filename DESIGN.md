# AniWhere Design System Specification

## 1. Product Identity
AniWhere is a harvest-based market-discovery and decision-support tool for smallholder farmers in Laguna, Philippines.
- Core Farmer Question: *Saan ko ibebenta ang ani ko?* (Where do I sell my harvest?)
- Core Positioning: *Tell us your harvest. We show where it can realistically go.*
- Visual Character: Warm, editorial, documentary-atlas aesthetic grounded in Philippine agriculture. Calm, high legibility, honest data presentation.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Core Palette Tokens
```yaml
tokens:
  color:
    field-olive: "#597928"   # Primary action background, selected controls, agricultural anchor
    young-leaf: "#91AC67"    # Soft large emphasis surfaces only (NEVER small text)
    soil-brown: "#6E3511"    # Warm accent, category marker, warning/confirmation cues
    rice-cream: "#FCECD8"    # Warm secondary surface, soft callouts, badges
    warm-surface: "#FFFDF8"  # Main application surface, card background
    field-ink: "#20251E"     # Monolithic primary text, headings, strong borders/icons
    route-blue: "#4E7380"    # Illustrative map water, route accents, link emphasis
```

### 2.2 Semantic Aliases
```css
:root {
  --color-text-primary: var(--field-ink);
  --color-text-secondary: #4A5245;
  --color-text-muted: #596052;
  --color-text-inverse: var(--warm-surface);

  --color-surface-base: var(--warm-surface);
  --color-surface-raised: #FFFFFF;
  --color-surface-warm: var(--rice-cream);
  --color-surface-soft: rgba(252, 236, 216, 0.45);
  
  --color-action-primary: var(--field-olive);
  --color-action-primary-hover: #486320;
  --color-action-primary-text: var(--warm-surface);

  --color-border-subtle: rgba(32, 37, 30, 0.12);
  --color-border-strong: rgba(32, 37, 30, 0.28);
  --color-border-focus: var(--field-olive);

  --color-route-accent: var(--route-blue);
  --color-soil-accent: var(--soil-brown);
}
```

### 2.3 Verified Contrast Ratios (WCAG 2.2 AA)
- `field-ink` on `warm-surface`: **15.36:1** (PASS AAA)
- `field-ink` on `rice-cream`: **13.48:1** (PASS AAA)
- `warm-surface` on `field-olive`: **4.93:1** (PASS AA Normal Text, AAA Large)
- `soil-brown` on `rice-cream`: **8.32:1** (PASS AAA)
- `route-blue` on `warm-surface`: **5.05:1** (PASS AA)
- *Prohibited Pairings for Text*:
  - `route-blue` on `rice-cream` (4.44:1 - FAIL for normal text)
  - `field-olive` on `rice-cream` (4.33:1 - FAIL for normal text)
  - `warm-surface` on `young-leaf` (2.49:1 - STRICTLY FORBIDDEN FOR TEXT)

---

## 3. Typography Hierarchy

### 3.1 Typefaces
- **Display / Headings (H1, H2)**: `Source Serif 4`, serif fallback `Georgia, serif`.
  - Weight: 600 (Semibold) or 700 (Bold)
  - Letter-spacing: `-0.02em` (tight tracking)
  - Line-height: `1.15` to `1.25`
  - Purpose: Restrained editorial titles, warm agricultural bookcraft. Exactly **one** H1 per page.
- **UI / Body / Controls / Tables**: `Source Sans 3`, sans-serif fallback `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
  - Weights: 400 (Regular), 500 (Medium), 600 (Semibold)
  - Body base: minimum `16px` on mobile for high legibility
  - Tabular Numbers (`font-variant-numeric: tabular-nums`): Mandatory on all financial, kilogram, and comparison data columns.

### 3.2 Typography Scale
- `H1`: 2.25rem (36px) mobile / 3.0rem (48px) desktop; leading tight
- `H2`: 1.5rem (24px) mobile / 1.875rem (30px) desktop; leading snug
- `H3`: 1.25rem (20px); font-sans semibold
- `Body Large`: 1.125rem (18px); font-sans regular
- `Body Base`: 1.0rem (16px); font-sans regular; leading relaxed (1.6)
- `Caption / Meta`: 0.875rem (14px); font-sans medium
- `Data / Numerical Metric`: 1.25rem - 2.0rem; font-sans bold with tabular numerals

---

## 4. Spacing, Shapes & Elevation

### 4.1 Spacing Scale (8pt Grid)
- Scale: `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px`
- Micro-padding / touch bounds: `4px, 8px`
- Card padding: `16px` (mobile), `24px` (desktop)
- Section spacing: `32px` (mobile), `48px - 64px` (desktop)

### 4.2 Border Radius
- `8px` (`rounded-lg`): Small form inputs, buttons, pills, tag badges
- `12px` (`rounded-xl`): Standard cards, tables, modal containers
- `16px` (`rounded-2xl`): Hero surfaces, mobile nonmodal bottom sheet, media wrappers

### 4.3 Depth & Elevation
- Subtle 1px borders (`border-field-ink/10`) paired with ambient warm shadows:
  - Base Card: `box-shadow: 0 1px 3px rgba(32, 37, 30, 0.05), 0 1px 2px rgba(32, 37, 30, 0.03)`
  - Elevated Popover / Bottom Sheet: `box-shadow: 0 10px 25px -5px rgba(32, 37, 30, 0.1), 0 8px 10px -6px rgba(32, 37, 30, 0.05)`
- Zero aggressive neon glows or heavy drop shadows.

---

## 5. Signature Visual Motif: The Harvest Route
The central visual anchor is the **Harvest Route**: transforming entered harvest mass into tangible destination pathways across the illustrated Laguna landscape (Mt. Makiling contours, Laguna de Bay waterline, quiet farm parcel geometries).
- Illustrated cleanly in accessible vector SVG/HTML.
- Map and List are peers, synchronized bidirectionally.

---

## 6. Strict Anti-Vibecode Rules & Product Invariants
1. **NO Eyebrows / Kickers Above H1/H2**: Do not prepend uppercase tags or pill badges like `MORE MARKETS` or `BETTER CHOICES` above primary headings. Start directly with the headline.
2. **NO Fake Status Dots**: Colored green/red/amber dots are banned unless reflecting a live binary WebSocket/hardware connection. Use text labels + icons.
3. **NO Winner / AI Recommendation Badges**: Never crown an outlet as "Best Choice", "Optimal", or "AI Pick". Present options on equal visual footing; the farmer decides.
4. **NO "Profit" Labeling**: Transparent arithmetic only (`gross - entered transport = after entered transport`). Include notice: *"After entered transport only — not profit or guaranteed income."*
5. **Visible Demo Notices**: Prominently display `Demo — sample data` on all screens rendering fictional buyers, prices, or capacities.
6. **Illustrative Map**: Label all map views as `Illustrative map`. Never claim live GPS navigation or real-time traffic accuracy.
7. **Zero Prompt Leakage**: Zero mention of `agent`, `prompt`, `seed`, `mock`, `anti-hallucination`, or internal architecture names in user-facing UI.
8. **Accessible Touch Targets**: Minimum 44x44px clickable bounds on mobile. Real `<button>` and `<a>` elements only; zero `<div onClick>`.


---

## 7. Premium Interaction Layer (September 22)

### Surface hierarchy
Use three intentional levels rather than nested-card stacking:
1. **Page plane** — Warm Surface.
2. **Decision surface** — raised white/warm surface for Harvest Ticket, selected result, comparison.
3. **Evidence inset** — Rice Cream/soft neutral for source, freshness, unknowns and confirmation.

A container earns a border only when it groups a distinct decision or interaction.

### Motion tokens
```css
--motion-instant: 80ms;
--motion-micro: 140ms;
--motion-ui: 220ms;
--motion-gentle: 360ms;
--ease-out: cubic-bezier(.2,.8,.2,1);
--ease-settle: cubic-bezier(.16,1,.3,1);
--travel-micro: 8px;
--travel-sheet: 16px;
```
Motion explains continuity; it never gates input. Prefer opacity/transform. Reduced motion uses immediate/static state changes.

### Ani character
Canonical Ani is a cream/ivory rounded seed-like character with asymmetric dark-olive and young-green leaf canopy, warm brown eyes, white highlights, tiny warm cheek dots and small rounded hands. Ani is quiet, friendly and agricultural—not a robot, orb, sparkle, farmer caricature or purple AI brand.

Semantic avatar states:
`idle | attentive | listening | thinking | working | speaking | success | uncertain | error | offline`.

Animation is derived from semantic state, not arbitrary props. Idle movement is rare and near-imperceptible. Listening must be visually explicit. Uncertain remains calm. Error never flashes. Reduced-motion uses static state changes.

### Assistant placement
Ani is contextual, not a permanent navigation destination. Desktop uses a compact trigger expanding into an integrated side/popover surface. Mobile uses an accessible floating trigger above the bottom navigation and safe area, opening a bottom sheet/near-full-height surface. Closed Ani is quiet and never covers primary actions.
