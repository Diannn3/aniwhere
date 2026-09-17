# Generation prompts and visual QA — screens 07–10

Generated 18 September 2026 with the built-in image generator after the delegated generation agent reached its usage limit. Each call used the corresponding original UI reference first and supplied logo image 11 second. These are individual UI concepts, not functioning or accessibility-tested application screens.

## 07 — `07-desktop-detail.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-7.png` — original desktop detail composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-9736775e-1a3a-496d-98fb-968af86ccf8f.png`.

### Exact submitted prompt

```text
Use case: ui-mockup. Generate one polished high-fidelity AniWhere desktop web app screen, using Input image 1 as composition/style reference and Input image 2 as the supplied AniWhere logo reference. Preserve the exact rounded A silhouette with winding white route, green fields and brown soil and place it beside the exact wordmark “AniWhere”; integrate it on the cream surface with no white sticker. Direct landscape browser-content screenshot, approximately 1536x1024, no laptop frame, no browser chrome, no collage, no second screen.

Premium warm editorial agricultural product: Source Serif 4-like display headlines, Source Sans 3-like UI/body, strict 8-point spacing, readable data, restrained borders/shadows, consistent Lucide-like outline icons. Interface colors: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Use Field Ink for text, Warm Surface text on Olive actions. No gradients, fake status dots, emojis, handwritten slogans, match percentages, fake reviews, registration claims, private person/phone/email, guarantee or “verified buyer” badge.

Screen 07: desktop place detail for the fictional “Demo Cooperative”. Include top navigation with AniWhere, Discover, How it works, For buyers, About, and EN / FIL. Show a compact breadcrumb and a calm agricultural produce-depot photo labeled Demo Cooperative, a visible “Demo — sample data” notice, and a map panel labeled “Illustrative map” without exact road distance or travel time. Harvest context: Tomatoes, 300 kg, Los Baños, Laguna, ready 17 Sep 2026. Show exact terms: 300 kg accepted; PHP 28 / kg; PHP 8,400 gross; PHP 600 entered transport; PHP 7,800 after entered transport; 0 kg remaining. State “Matches your harvest” and reason “Listed for tomatoes and accepts up to 300 kg.” Explicitly label calculation “After entered transport only — not profit or guaranteed income.” Add requirements as questions to confirm (grade, packing, receiving schedule), “Confirm terms before travel”, and generic actions “Prepare message”, “Public contact”, “Compare options”. Source row says “Sample offer · 17 Sep 2026”; do not call the cooperative real or verified. Keep the information architecture to two main sections: decision summary and requirements/contact. Do not add unsupported metrics, reviews, real addresses, names or precise geographic measurements. Render only one coherent desktop UI screen with legible text.
```

### Visual inspection

One direct landscape UI. The logo, demo notice, illustrative map, fictional cooperative, fit reason and all six financial/quantity values are legible. The decision-summary arithmetic is correct. A generic descriptive sentence and a small footer slogan were generated; remove those in code if a restrained screen is desired. The photo and map are illustrative.

## 08 — `08-desktop-compare.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-8.png` — original desktop comparison composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-6b75e07a-1c57-40a3-a50d-eee40cb31b21.png`.

### Exact submitted prompt

```text
Use case: ui-mockup. Generate one polished high-fidelity AniWhere desktop web app comparison screen. Input image 1 is the original comparison UI reference for layout; Input image 2 is the supplied AniWhere logo reference. Preserve the rounded A mark, white winding route and green/brown fields and use it beside exact wordmark “AniWhere”, integrated on the warm cream surface. Direct landscape browser-content UI, 1536x1024-like, no laptop frame, no browser chrome, no collage, no second screen.

Design: premium warm editorial agriculture product, Source Serif 4-like display headings and Source Sans 3-like readable data, 8-point spacing, structured grid, subtle separators, restrained shadows, Lucide-like outline icons. Palette only for UI: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Use Ink for text, Warm Surface text on Olive actions. No gradients, fake status dots, emoji icons, handwritten slogans, crowns, recommendation badges, unsupported percentages, ratings, verification or adoption metrics.

Screen 08: desktop comparison after a farmer enters Tomatoes, 300 kg, Los Baños, Laguna, ready 17 Sep 2026. Header with logo, Discover navigation and EN / FIL. Heading “Compare options for your harvest” and a visible “Demo — sample data” notice. Show exactly three equal columns/cards:
Demo Cooperative — Matches your harvest; accepted 300 kg; remaining 0 kg; PHP 28 / kg; gross PHP 8,400; entered transport PHP 600; after entered transport PHP 7,800.
Demo Processor — Matches your harvest; accepted 300 kg; remaining 0 kg; PHP 32 / kg; gross PHP 9,600; entered transport PHP 300; after entered transport PHP 9,300.
Demo Market — Accepts part of your harvest; accepted 200 kg; remaining 100 kg; PHP 30 / kg; gross PHP 6,000; entered transport PHP 300; after entered transport PHP 5,700.
Repeat “After entered transport only — not profit or guaranteed income.” Use equal “View details” and “Choose this option” actions; do not identify a best option. Include “Confirm terms before travel” and a short explanatory note that the figures are fictional. Avoid exact kilometers, minutes, real business names, fake building signs, private contacts and route claims. Do not add aggregated statistics or a large decorative landscape that reduces table legibility. Render exactly one coherent desktop UI screen with every key value readable and arithmetic exact.
```

### Visual inspection

One direct landscape screen. All three columns show the correct accepted/remaining quantities, prices, gross amounts, entered transport and after-transport amounts. Cards receive equal treatment and no recommendation badge. The generator added a small eyebrow line (“BETTER MARKETS...”), which is not required; remove it in implementation under the anti-eyebrow rule. The remaining interface is legible and no route/distance claim appears.

## 09 — `09-desktop-buyer.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-9.png` — original desktop buyer workspace composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-024e107b-39e3-4f0d-b106-c3bad4a8e6f4.png`.

### Exact submitted prompt

```text
Use case: ui-mockup. Generate one polished high-fidelity AniWhere desktop web app screen for a buyer workspace. Input image 1 is the original AniWhere buyer-dashboard UI reference for composition and density. Input image 2 is the supplied AniWhere logo reference; preserve its rounded A, white winding route, green fields and brown soil and integrate it beside the exact wordmark “AniWhere”. Direct landscape browser-content screen approximately 1536x1024, no laptop/device frame, no browser chrome, no collage, no extra screen.

Premium warm editorial agriculture product: Source Serif 4-like headings, Source Sans 3-like body/data, strict 8-point grid, readable table rows, subtle borders and restrained shadows, consistent Lucide-like outline icons. UI palette: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Use Ink for text and Warm Surface text on Olive actions. No gradients, fake pulsing status dots, emoji icons, handwritten slogans, unsupported trend lines, percentages, inquiry counts, reviews, farmer-tracking map, verification or adoption claims.

Screen 09: authenticated buyer workspace titled “Your buying offers”. Show a calm header/navigation with logo, Offers, How it works, Help, EN / FIL and a small generic Account control. Add an unobtrusive “Demo — sample data” notice. Primary action “Create offer”. Main table/list contains exactly three fictional records, no other records and no fake metrics: Tomatoes — 300 kg — PHP 28 / kg — Published — Sample offer · 17 Sep 2026; Eggplant — 150 kg — Price not posted — In review — needs review before publication; Calamansi — 100 kg — Price not posted — Draft. Show summary counts only if exactly “1 published · 1 in review · 1 draft”. Add a compact review guidance panel: “Only published offers appear in farmer discovery.” and “Keep quantity, crop requirements and validity current.” Do not show inquiries or farmer matches. A small “Source and review” area may say “Terms are reviewed before publication.” Include table filters/search only if they fit and do not imply extra data. Footer can repeat the logo without slogans. Render one coherent, usable desktop UI with accurate spelling and no invented extra figures.
```

### Visual inspection

One direct landscape buyer workspace. The three prescribed rows and statuses are present, counts are exactly 1/1/1, review guidance is included and no inquiry/farmer metrics appear. The generator used a realistic-looking account label “Del Cruz Trading” and added a small eyebrow line; replace the account label with “Demo buyer” and remove the eyebrow in implementation so the concept does not imply a real identity or use a forbidden kicker. All crop and price text is otherwise correct.

## 10 — `10-desktop-discover.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-10.png` — original desktop discovery composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-74b6c951-f7cf-49e3-8f5f-378659203f2f.png`.

### Exact submitted prompt

```text
Use case: ui-mockup. Generate one polished high-fidelity AniWhere desktop discovery UI. Input image 1 is the original desktop discovery reference for composition and hierarchy. Input image 2 is the supplied AniWhere logo reference; preserve its rounded A shape, winding white route, green fields and brown soil and integrate it beside exact wordmark “AniWhere”. Direct landscape web UI, approximately 1536x1024, no laptop frame, no browser chrome, no collage, no second screen.

Premium warm editorial agricultural product: Source Serif 4-like display headings, Source Sans 3-like body/data, readable 16px+ controls, generous 8-point spacing, subtle borders, restrained shadows, consistent Lucide-like outline icons. UI palette: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Ink text and Warm Surface text on Olive actions. No gradients, fake status dots, emoji icons, handwritten slogans, match percentages, aggregate market statistics, average prices, ratings, verification badges, real business names or unsupported route measurements.

Screen 10: desktop farmer discovery after entering Tomatoes, 300 kg, origin Los Baños, Laguna, ready 17 Sep 2026. Header with logo, Discover active, How it works, For buyers, About, EN / FIL and generic account/sign-in. Heading “Find places to sell your harvest” with short copy “Compare requirements and entered transport costs before you travel.” Add a compact harvest summary and a prominent visible “Demo — sample data” notice. Layout: left filter rail with Crop Tomatoes, quantity 300 kg, location Los Baños, Laguna, fit/type filters; center results list; right map labeled “Illustrative map”. Use exactly three fictional results and consistent terms:
Demo Cooperative — Cooperative — Matches your harvest — accepts 300 kg — PHP 28/kg — source “Sample offer · 17 Sep 2026”.
Demo Processor — Processor — Matches your harvest — accepts 300 kg — PHP 32/kg — source “Sample offer · 17 Sep 2026”.
Demo Market — Market — Accepts part of your harvest — accepts 200 kg, 100 kg remaining — PHP 30/kg — source “Sample offer · 17 Sep 2026”.
A result with missing terms may say Contact to confirm only if it does not add another organization. Make each result explain why. Do not show kilometers, minutes, exact route lines, monthly capacities, total demand, average price or ranking as “best”. Show a small note “Confirm terms before travel.” Make map/list labels agree and ensure the map does not dominate the results. Render only one coherent, shippable desktop discovery screen with no invented additional figures or copy beyond helpful UI labels.
```

### Visual inspection

One direct landscape discovery interface. It includes the requested harvest summary, three fictional results, fit explanations, sample-offer dates, filter rail and illustrative map. Quantities and prices agree with the shared fixture. The map contains labels and pins for the fictional options but no distance/time. A small helper says “best fit” in a non-ranking filter hint; remove or change that wording in code to “Adjust filters to see other fits.”
