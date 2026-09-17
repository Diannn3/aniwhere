# Generation prompts and visual QA — screens 01–03

Generated 17 September 2026 using the built-in image generator. Each call used the corresponding original UI as composition/style reference and original image 11 as the supplied logo. Both source images for each call were inspected with view_image before generation. Original files retained. These are visual mockups, not functioning or accessibility-tested UI.

## 01 — 01-mobile-harvest.png

Output: `01-mobile-harvest.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-1.png` — layout/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0af7d-5707-7603-8f28-1257131691b4\exec-7cefacae-83bb-4080-b2a6-62eca580d8de.png`

### Exact submitted prompt

```text
Use case: ui-mockup. Generate a polished high-fidelity AniWhere interface, one UI per image. Input image 1 is the composition/style reference; input image 2 is the supplied brand mark, preserve its rounded A silhouette with winding white route and green/brown fields and use compactly beside the exact wordmark "AniWhere". Seamlessly integrate logo onto cream with no white rectangular sticker. Warm editorial agricultural design: Source Serif 4-like titles, Source Sans 3-like body. UI palette: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Main text ink on warm or cream; warm text on solid olive buttons. Crisp comfortably large type, excellent spacing, minimal consistent outline icons, restrained fine borders and shadow. English interface with visible "EN / FIL" switch. No external artboard title, collage, extra screen, physical device, browser chrome, fake metric, match percentages, handwritten slogan, gradients or floating leaves. Supplied reference is inspiration; correct its problematic content using the following screen specification.
Asset: direct portrait mobile app screen, tall 1024x1536-like ratio, no phone bezel or system status bar. Screen 01: accountless farmer harvest entry. Header compact logo/wordmark at left and EN / FIL at right. Large two-line serif heading "What are you harvesting?" and short body "Find places to sell your harvest in Laguna." Include one restrained horizontal photo crop of fresh tomatoes at a Philippine farm, taking only about one eighth of height. Visible small notice "Demo — sample data". Main form stacked or neatly 2-column where roomy: "Crop" dropdown "Tomatoes"; "Quantity" numeric input "300" with separate "kg" suffix and NO dropdown arrow on quantity; "Location" input "Los Baños, Laguna"; "Ready date" input "17 Sep 2026". Comfortable touch-height controls. Prominent full-width solid olive CTA "Find places to sell" visible in the main viewport. Beneath, small helper "No account needed to explore." and brief informational line "Check requirements and confirm terms before travel." Bottom navigation exactly "Home", "Discover", "Saved" with outline icons, Home active. Prioritize clear form hierarchy with no huge empty hero. No map necessary, no result counts, no notification bell, no buyer verification. Render only these UI details and exact copy without invented additions.
```

### Visual inspection

One direct portrait UI, no physical device or extra screen. Header preserves the supplied A/route/fields silhouette, English control is visible. Crop Tomatoes, numeric 300 with separate kg suffix, Los Baños, Laguna and 17 Sep 2026 all read correctly. Prominent action and exactly Home/Discover/Saved bottom navigation. No invented counts or notifications. Small photo occupies more vertical space than the prompt's approximate one-eighth but form and CTA are still clearly visible. Primary action has subtle generated tonal shading despite the flat-fill prompt, and a few crop/navigation glyphs are filled; use flat #597928 and a consistent outline icon family in implementation. Geographic location is entered text, not a claimed measured route.

## 02 — 02-desktop-home.png

Output: `02-desktop-home.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-2.png` — layout/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0af7d-5707-7603-8f28-1257131691b4\exec-64e0dfdb-addf-4759-a5bb-fb7998bb47b9.png`

### Exact submitted prompt

```text
Use case: ui-mockup. Generate a polished high-fidelity AniWhere interface, one UI per image. Input image 1 is the composition/style reference; input image 2 is the supplied brand mark, preserve its rounded A silhouette with winding white route and green/brown fields and use compactly beside the exact wordmark "AniWhere". Seamlessly integrate logo onto cream with no white rectangular sticker. Warm editorial agricultural design: Source Serif 4-like titles, Source Sans 3-like body. UI palette: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Main text ink on warm or cream; warm text on solid olive buttons. Crisp comfortably large type, excellent spacing, minimal consistent outline icons, restrained fine borders and shadow. English interface with visible "EN / FIL" switch. No external artboard title, collage, extra screen, physical device, browser chrome, fake metric, match percentages, handwritten slogan, gradients or floating leaves. Supplied reference is inspiration; correct its problematic content using the following screen specification.
Asset: direct landscape desktop homepage, approximately 1536x1024, no laptop or browser frame. Screen 02: premium AniWhere homepage adapting reference 2. Top nav logo/wordmark, "Discover", "How it works", "For buyers", right "EN / FIL" and "Buyer sign in". Cream canvas, strong left editorial headline "More places for your harvest." in large ink serif, body "Discover markets, cooperatives and buyers across Laguna. Compare requirements before you travel." Right hero is a beautifully quiet schematic map with muted blue lake and olive land, minimal generic pins, restrained labels "Laguna de Bay", "Los Baños", and explicit small "Illustrative map". No prices, businesses, road distances or route times. One broad warm search panel overlapping the lower hero edge in an orderly grid: label "Crop", placeholder "Select crop"; "Quantity", placeholder "Enter kg" numeric field no dropdown; "Location", value "Los Baños, Laguna"; "Ready date", placeholder "Select date"; solid olive CTA "Find places to sell". Single search action, no competing tabs. Below use three concise text-led columns separated by subtle rules: "Find nearby options" with "Explore places that may buy your crop."; "Check your harvest fit" with "See quantity needs and questions to confirm."; "Compare before you travel" with "Consider offer terms and transport costs." Bottom a restrained panoramic photograph strip of Laguna-inspired farmland and mountains, no text on photo or fabricated farmer metrics. Generous editorial whitespace, functional premium hierarchy. All text readable and English only apart from place names.
```

### Visual inspection

One direct desktop UI. No metrics, price claims, travel times or real business claims. Exact main heading, Laguna scope and unified crop/quantity/location/date search. Map is explicitly labeled Illustrative map; topology and roads are conceptual, not validated geography. Supplied logo is recognizable. Landscape strip is synthetic imagery, not a verified Laguna photo. Three supporting columns are legible. Some pictograms are filled rather than the requested outline style; standardize in implementation. No data fixture is prefilled beyond the search location, so no demo prices or business-record state is implied.

## 03 — 03-mobile-buyer.png

Output: `03-mobile-buyer.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-3.png` — layout/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0af7d-5707-7603-8f28-1257131691b4\exec-be365dcf-d875-433e-9395-c62fd1bd49e1.png`

### Exact submitted prompt

```text
Use case: ui-mockup. Generate a polished high-fidelity AniWhere interface, one UI per image. Input image 1 is the composition/style reference; input image 2 is the supplied brand mark, preserve its rounded A silhouette with winding white route and green/brown fields and use compactly beside the exact wordmark "AniWhere". Seamlessly integrate logo onto cream with no white rectangular sticker. Warm editorial agricultural design: Source Serif 4-like titles, Source Sans 3-like body. UI palette: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Main text ink on warm or cream; warm text on solid olive buttons. Crisp comfortably large type, excellent spacing, minimal consistent outline icons, restrained fine borders and shadow. English interface with visible "EN / FIL" switch. No external artboard title, collage, extra screen, physical device, browser chrome, fake metric, match percentages, handwritten slogan, gradients or floating leaves. Supplied reference is inspiration; correct its problematic content using the following screen specification.
Asset: direct portrait mobile buyer workspace, tall 1024x1536-like ratio, no phone or system-status frame. Screen 03: compact offer management. Top compact supplied logo and AniWhere plus EN / FIL switch. Serif greeting "Welcome back." and body "Manage your buying offers." Restrained farm landscape photo strip around one tenth of height, warm morning natural photo without slogan. Small visible "Demo — sample data". Strong section heading "Your buying offers" and solid olive full-width action "+ Create offer". Exactly three beautiful readable offer cards with small authentic produce thumbnail on left: first "Tomatoes", "300 kg · PHP 28/kg", status badge "Published", source line "Sample offer · 17 Sep 2026"; second "Eggplant", "150 kg · Price not posted", status badge "In review"; third "Calamansi", "100 kg", status badge "Draft". One subtle edit/chevron affordance each. No other quantities or records. Under list a calm warm box titled "How review works" and copy "Submitted offers are reviewed before publication. Keep quantities and validity up to date." Optional fine line "Only published offers appear in discovery." Bottom nav exactly "Offers", "Create", "Account", Offers active. No counts necessary; no farmer map, inquiry count, matches, farmer registry, chat, notifications, trend chart, profile name or unsupported real activity. Use remaining space for comfortable readable cards, not ornamental graphics.
```

### Visual inspection

One direct portrait UI. Exactly three offer records: Tomatoes 300 kg PHP 28/kg Published; Eggplant 150 kg Price not posted In review; Calamansi 100 kg Draft. Sample source date 17 Sep 2026 is visible on published offer, and Demo — sample data is visible above. No farmer map, inquiries, private identities or trend metrics. Three bottom destinations Offers/Create/Account. Review explanation matches the scope. Landscape is synthetic. The generated button has subtle olive tonal variation and status colors are approximate; production tokens/contrast and icon consistency require implementation review. No material text/data defect observed.


