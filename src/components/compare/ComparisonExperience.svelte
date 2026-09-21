<script lang="ts">
  import { onMount } from 'svelte';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila, comparisonIds } from '../../lib/state/url-state';
  import { safeStorage } from '../../lib/state/storage';
  import type { Outlet, HarvestQuery } from '../../lib/domain/types';
  import { t, outletCategoryLabel, evidenceLabel } from '../../content/translations';
  import { getCropLabel } from '../../lib/domain/crops';

  interface Props {
    initialLang?: 'en' | 'fil';
  }

  const { initialLang = 'fil' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let selectedIds = $state<string[]>([]);
  let harvest = $state<HarvestQuery>({
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: todayInManila(),
  });
  const historicalHarvest = $derived(Boolean(harvest.readyDate && harvest.readyDate < todayInManila()));

  // Local editable transport expense overrides per outlet
  let customTransports = $state<Record<string, number | null>>({});
  let transportError = $state(false);
  let queryIssues = $state<string[]>([]);

  onMount(() => {
    const parsed = parseDiscoverQuery(window.location.search);
    queryIssues = parsed.issues;
    harvest = parsed.harvest;
    if (parsed.lang) {
      lang = parsed.lang;
    }

    // Read places from URL search params first
    const searchParams = new URLSearchParams(window.location.search);
    const placesParam = searchParams.get('places');

    if (searchParams.has('places')) {
      selectedIds = comparisonIds(placesParam);
    } else {
      // Check local storage or provide the canonical 3-outlet demo fixture
      const stored = safeStorage.getItem<string[]>('aniwhere_compare_ids', []);
      if (stored && stored.length > 0) {
        selectedIds = stored.slice(0, 3);
      } else {
        // Default canonical 3-option comparison
        selectedIds = ['demo-processor', 'demo-cooperative', 'demo-market'];
      }
    }
    const restored = safeStorage.getItem<unknown>('aniwhere_transport_costs', {});
    if (restored && typeof restored === 'object' && !Array.isArray(restored)) {
      customTransports = Object.fromEntries(Object.entries(restored).filter(([, value]) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)));
    }
  });

  const isFil = $derived(lang === 'fil');

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]
  );

  const comparedOutlets = $derived(
    selectedIds
      .map((id) => CURRENT_OUTLETS.find((o) => o.id === id || o.slug === id))
      .filter((o): o is Outlet => Boolean(o))
      .slice(0, 3)
  );

  const mobileOptions = $derived(comparedOutlets.map((outlet) => {
    const defaultCost = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null;
    return { outlet, fit: evaluateFit(outlet, harvest, getTransportCost(outlet, defaultCost)) };
  }));

  function handleRemove(id: string) {
    selectedIds = selectedIds.filter((item) => item !== id);
    safeStorage.setItem('aniwhere_compare_ids', selectedIds);
    syncPlaces();
  }

  function syncPlaces() {
    const url = new URL(window.location.href);
    url.searchParams.set('places', selectedIds.join(','));
    window.history.replaceState({}, '', url);
    window.dispatchEvent(new Event('aniwhere:context-updated'));
  }

  function handleTransportChange(outletId: string, value: string) {
    if (value.trim() === '') {
      customTransports[outletId] = null;
      transportError = false;
    } else {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        transportError = true;
        return;
      }
      customTransports[outletId] = num;
      transportError = false;
    }
    safeStorage.setItem('aniwhere_transport_costs', customTransports);
  }

  function getTransportCost(outlet: Outlet, defaultCost: number | null): number | null {
    if (customTransports[outlet.id] !== undefined) {
      return customTransports[outlet.id];
    }
    return defaultCost;
  }

  function formatEvidenceDate(value: string | null | undefined): string {
    if (!value) return isFil ? 'Hindi alam' : 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
</script>

<div class="farmer-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 space-y-6">
  {#if queryIssues.length > 0}
    <p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'May di-wastong detalye sa link. Suriin ang ani, dami, lugar, at petsa bago magpatuloy.' : 'The shared link has invalid harvest details. Check the crop, quantity, location, and date before continuing.'}</p>
  {/if}
  {#if historicalHarvest}<p role="status" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'Lumipas na ang petsa ng ani. Makasaysayang halimbawa lamang ang paghahambing na ito.' : 'The harvest date is past. This comparison is a historical example.'}</p>{/if}
  {#if transportError}
    <p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">
      {isFil ? 'Maglagay ng halagang ₱0 o higit pa para sa biyahe.' : 'Enter a transport cost of ₱0 or more.'}
    </p>
  {/if}
  {#if queryIssues.length > 0}
    <a href="/" class="inline-flex min-h-[44px] items-center rounded-xl bg-[#597928] px-5 py-2 text-base font-semibold text-white">{isFil ? 'Itama ang detalye ng ani' : 'Correct harvest details'}</a>
  {:else}
  <!-- Page Header (Anti-Vibecode: Direct H1, No Kicker) -->
  <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#20251E]/10 pb-6">
    <div class="space-y-2 max-w-2xl">
      <h1 class="text-3xl sm:text-4xl font-serif font-bold text-[#20251E] tracking-tight">
        {isFil ? 'Paghambingin ang mga Pamilihan' : 'Compare Options for Your Harvest'}
      </h1>
      <p class="text-sm sm:text-base text-[#4A5245]">
        {isFil
          ? `Suriin at paghambingin ang mga potensyal na mapagbebentahan sa Laguna para sa iyong ${harvest.quantityKg} kg na ${getCropLabel(harvest.crop, lang)}.`
          : `Review and compare potential selling outlets in Laguna for your ${harvest.quantityKg} kg of ${getCropLabel(harvest.crop, lang)}.`}
      </p>
    </div>

    <!-- Active Harvest Badge / Edit Shortcut -->
    <div class="bg-white rounded-2xl border border-[#20251E]/12 p-4 shadow-sm flex items-center gap-4">
      <div class="space-y-0.5 text-xs">
        <div class="font-bold text-[#20251E] text-sm capitalize">{harvest.quantityKg} kg {getCropLabel(harvest.crop, lang)}</div>
        <div class="text-[#6B7265]">{originMun.name} &bull; {isFil ? 'Handa' : 'Ready'} {harvest.readyDate}</div>
      </div>

      <a
        href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}&places=${encodeURIComponent(selectedIds.join(','))}`}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FFFDF8] text-[#597928] border border-[#597928]/30 hover:bg-[#597928]/10 transition-colors min-h-[44px]"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>{isFil ? 'Baguhin ang Ani' : 'Edit harvest'}</span>
      </a>
    </div>
  </header>

  <!-- Notice Banner: Transparent Calculation -->
  <div class="rounded-xl p-4 bg-[#FAF7EE] border border-[#20251E]/10 flex items-start gap-3 text-xs text-[#4A5245]">
    <svg class="w-5 h-5 text-[#6E3511] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
        <span class="font-bold text-[#20251E]">{isFil ? 'Paalala:' : 'Notice:'}</span> {t('afterTransportNote', lang)}
      <span class="block mt-0.5 text-[#6B7265]">
        {isFil
          ? 'Maaari mong baguhin ang halaga ng biyahe sa bawat kahon upang makita ang muling pagkalkula.'
          : 'You can edit the hauling expense on each card below to recalculate based on your actual travel setup.'}
      </span>
    </div>
  </div>

  <!-- Comparison Columns State -->
  {#if comparedOutlets.length === 0}
    <!-- Empty State -->
    <div class="bg-white rounded-2xl border border-[#20251E]/12 p-10 sm:p-16 text-center space-y-5 shadow-sm max-w-2xl mx-auto">
      <div class="w-16 h-16 rounded-full bg-[#6E3511]/10 text-[#6E3511] mx-auto flex items-center justify-center">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>

      <div class="space-y-2">
        <h2 class="text-2xl font-serif font-bold text-[#20251E]">
          {isFil ? 'Walang napiling pamilihan' : 'No outlets selected for comparison'}
        </h2>
        <p class="text-sm text-[#4A5245] max-w-md mx-auto leading-relaxed">
          {isFil
            ? 'Pumili ng isa hanggang tatlong lugar sa paghahanap upang makita ang magkatabing pagsusuri ng presyo at gastos.'
            : 'Select 1 to 3 outlets from discovery to compare accepted quantities, available price evidence, and transport costs.'}
        </p>
      </div>

      <div class="pt-2">
        <a
          href={queryIssues.length ? '/' : `/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}&places=${encodeURIComponent(selectedIds.join(','))}`}
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#597928] text-white font-semibold text-sm hover:bg-[#435c1d] transition-all shadow-sm min-h-[44px]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>{isFil ? 'Maghanap ng Pamilihan' : 'Find selling options'}</span>
        </a>
      </div>
    </div>
  {:else}
    <section class="md:hidden rounded-2xl border border-[#20251E]/15 bg-white p-4 space-y-4" aria-label={isFil ? 'Mabilis na paghahambing' : 'Quick comparison'}>
      <h2 class="font-serif text-xl font-bold text-[#20251E]">{isFil ? 'Mabilis na paghahambing' : 'Quick comparison'}</h2>
      <p class="text-sm text-[#4A5245]">{isFil ? 'Magkatabing halaga ayon sa sukatan. Baguhin ang gastos sa biyahe sa bawat lugar sa ibaba.' : 'Values grouped by metric. Edit transport cost in each outlet card below.'}</p>
      <div class="border-t border-[#20251E]/10 pt-3">
        <h3 class="text-sm font-bold text-[#20251E] mb-2">{isFil ? 'Maaaring tanggapin' : 'May accept'}</h3>
        {#each mobileOptions as option}
          <div class="flex justify-between gap-3 py-1 text-sm"><span>{option.outlet.name}</span><strong>{option.fit.acceptedKg === null ? (isFil ? 'Kumpirmahin' : 'Confirm') : `${option.fit.acceptedKg} kg`}</strong></div>
        {/each}
      </div>
      <div class="border-t border-[#20251E]/10 pt-3">
        <h3 class="text-sm font-bold text-[#20251E] mb-2">{isFil ? 'Matitirang ani' : 'Harvest remaining'}</h3>
        {#each mobileOptions as option}
          <div class="flex justify-between gap-3 py-1 text-sm"><span>{option.outlet.name}</span><strong>{option.fit.remainingKg === null ? (isFil ? 'Kumpirmahin' : 'Confirm') : `${option.fit.remainingKg} kg`}</strong></div>
        {/each}
      </div>
      <div class="border-t border-[#20251E]/10 pt-3">
        <h3 class="text-sm font-bold text-[#20251E] mb-2">{isFil ? 'Halimbawang presyo/kg' : 'Sample price/kg'}</h3>
        {#each mobileOptions as option}
          <div class="flex justify-between gap-3 py-1 text-sm"><span>{option.outlet.name}{option.fit.dataValidUntil && option.fit.dataValidUntil < todayInManila() ? (isFil ? ' · luma' : ' · expired') : ''}</span><strong>{option.fit.samplePricePerKg === null ? (isFil ? 'Walang tala' : 'Not posted') : `₱${option.fit.samplePricePerKg}`}</strong></div>
        {/each}
      </div>
      <div class="border-t border-[#20251E]/10 pt-3">
        <h3 class="text-sm font-bold text-[#20251E] mb-2">{isFil ? 'Matapos ang biyahe, bago gastos sa bukid' : 'After transport, before farm costs'}</h3>
        {#each mobileOptions as option}
          <div class="flex justify-between gap-3 py-1 text-sm"><span>{option.outlet.name}</span><strong>{option.fit.afterTransportPay === null ? (isFil ? 'Hindi pa alam' : 'Unknown') : `₱${option.fit.afterTransportPay.toLocaleString()}`}</strong></div>
        {/each}
      </div>
    </section>
    <!-- Side-by-Side Comparison Grid (Equal Visual Footing, 1 to 3 Cards) -->
    <div
      class={`grid gap-6 ${
        comparedOutlets.length === 1
          ? 'grid-cols-1 max-w-xl mx-auto'
          : comparedOutlets.length === 2
          ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}
    >
      {#each comparedOutlets as outlet (outlet.id)}
        {@const defaultTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}
        {@const activeTransport = getTransportCost(outlet, defaultTransport)}
        {@const fit = evaluateFit(outlet, harvest, activeTransport)}
        {@const dist = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}
        {@const detailUrl = `/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}&places=${encodeURIComponent(selectedIds.join(','))}`}

        <article class="bg-white rounded-2xl border border-[#20251E]/12 p-6 shadow-sm flex flex-col justify-between gap-6 hover:border-[#597928]/40 transition-all">
          <div class="space-y-5">
            <!-- Header: Title, Category & Remove Control -->
            <div class="flex items-start justify-between gap-3 border-b border-[#20251E]/8 pb-4">
              <div>
                <span class="inline-block text-[11px] uppercase font-bold text-[#6E3511] tracking-wider mb-1">
                  {outletCategoryLabel(outlet.category, lang)}
                </span>
                <h2 class="text-xl font-serif font-bold text-[#20251E] leading-snug">
                  {outlet.name}
                </h2>
                <div class="flex items-center gap-1.5 text-xs text-[#4A5245] mt-1">
                  <span>{outlet.municipality}, Laguna</span>
                  <span>&bull;</span>
                  <span>{dist} km {isFil ? 'tuwirang layo' : 'straight-line'}</span>
                </div>
              </div>

              <!-- Accessible Remove Action -->
              <button
                type="button"
                onclick={() => handleRemove(outlet.id)}
                class="w-10 h-10 -mr-2 -mt-2 rounded-full flex items-center justify-center text-[#6B7265] hover:text-[#20251E] hover:bg-[#20251E]/8 transition-colors min-h-[44px]"
                aria-label={isFil ? `Alisin ang ${outlet.name} sa paghahambing` : `Remove ${outlet.name} from comparison`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Fit Status Banner -->
            <div
              class={`rounded-xl p-3 text-xs leading-relaxed ${
                fit.status === 'match'
                  ? 'bg-[#597928]/10 text-[#20251E] border border-[#597928]/25'
                  : fit.status === 'partial'
                  ? 'bg-[#FCECD8] text-[#6E3511] border border-[#6E3511]/25'
                  : fit.status === 'confirm'
                  ? 'bg-[#4E7380]/10 text-[#20251E] border border-[#4E7380]/25'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              <div class="font-bold">
                {isFil ? fit.statusLabelFil : fit.statusLabel}
              </div>
              <p class="text-[11px] mt-0.5 opacity-90">
                {isFil ? fit.reasonFil : fit.reason}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#FAF7EE] border border-[#20251E]/8 px-3 py-2 text-[10px] text-[#4A5245]">
              <span class="font-bold text-[#20251E]">{evidenceLabel(fit, lang)}</span>
              {#if fit.dataUpdatedAt}<span>{isFil ? 'Na-update' : 'Updated'} {formatEvidenceDate(fit.dataUpdatedAt)}</span>{/if}
              {#if fit.dataValidUntil}<span>{isFil ? 'May bisa hanggang' : 'Valid until'} {formatEvidenceDate(fit.dataValidUntil)}</span>{/if}
              {#if fit.unknowns.length > 0}<span class="text-[#4E7380] font-semibold">{isFil ? 'Kailangang kumpirmahin:' : 'Unknown:'} {(isFil ? fit.unknownsFil : fit.unknowns).join(', ')}</span>{/if}
            </div>

            <!-- Quantitative Arithmetic Ledger -->
            <div class="space-y-2.5 text-xs">
              <!-- Accepted kg -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{isFil ? 'Kayang Tanggapin:' : 'Accepted Quantity:'}</span>
                <span class="font-bold text-sm text-[#597928]">
                  {fit.acceptedKg !== null ? `${fit.acceptedKg} kg` : (isFil ? 'Kumpirmahin' : 'Confirm')}
                </span>
              </div>

              <!-- Remaining kg -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{isFil ? 'Matitira:' : 'Remaining Unsold:'}</span>
                <span class={`font-bold text-sm ${fit.remainingKg && fit.remainingKg > 0 ? 'text-[#6E3511]' : 'text-[#20251E]'}`}>
                  {fit.remainingKg !== null ? `${fit.remainingKg} kg` : (isFil ? 'Kumpirmahin' : 'Confirm')}
                </span>
              </div>

              <!-- Price per kg -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{fit.dataValidUntil && fit.dataValidUntil < todayInManila() ? (isFil ? 'Lumang halimbawang presyo/kg:' : 'Expired sample price/kg:') : fit.evidenceKind === 'demo' ? (isFil ? 'Halimbawang presyo/kg:' : 'Sample price/kg:') : fit.evidenceKind === 'buyer_offer' ? (isFil ? 'Presyong inilagay ng mamimili/kg:' : 'Buyer-posted price/kg:') : (isFil ? 'Presyo bawat kilo:' : 'Price per kg:')}</span>
                <span class="font-bold text-sm text-[#20251E]">
                  {fit.samplePricePerKg !== null ? `₱${fit.samplePricePerKg.toFixed(2)}` : (isFil ? 'Walang tala' : 'Not posted')}
                </span>
              </div>

              <!-- Gross Subtotal -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{isFil ? 'Kabuuang Halaga:' : 'Gross Amount:'}</span>
                <span class="font-bold text-sm text-[#20251E]">
                  {fit.grossPay !== null ? `₱${fit.grossPay.toLocaleString()}` : '---'}
                </span>
              </div>

              <!-- Editable Transport Expense -->
              <div class="p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/10 space-y-1.5">
                <div class="flex items-center justify-between">
                  <label for={`transport-${outlet.id}`} class="text-[#4A5245] font-medium">
                    {isFil ? 'Gastos sa biyahe (₱):' : 'Entered transport (₱):'}
                  </label>
                  <span class="text-sm text-[#6B7265] italic">{isFil ? 'maaaring baguhin' : 'editable'}</span>
                </div>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7265] font-semibold">₱</span>
                  <input
                    id={`transport-${outlet.id}`}
                    type="number"
                    min="0"
                    step="50"
                    value={activeTransport ?? ''}
                    placeholder={isFil ? 'Ilagay ang gastos' : 'Enter your cost'}
                    oninput={(e) => handleTransportChange(outlet.id, (e.target as HTMLInputElement).value)}
                    class="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#20251E]/20 text-sm font-bold text-[#6E3511] focus:outline-none focus:ring-2 focus:ring-[#597928] bg-white min-h-[44px]"
                    aria-label={isFil ? `Gastos sa biyahe papuntang ${outlet.name}` : `Hauling cost for ${outlet.name}`}
                  />
                </div>
                <div class="text-[10px] text-[#6B7265]">
                  {activeTransport === null ? (isFil ? 'Walang hauling estimate na nakaimbak' : 'No hauling estimate stored') : (isFil ? 'Halagang inilagay o demo default' : 'Entered amount or demo default')}
                </div>
              </div>

              <!-- Net Payout After Transport -->
              <div class="flex items-center justify-between p-3 rounded-xl bg-[#597928]/10 border border-[#597928]/35">
                <div>
                  <div class="text-[11px] font-bold text-[#597928] uppercase tracking-wider">
                    {isFil ? 'Matapos ang Biyahe' : 'After Transport'}
                  </div>
                  <div class="text-sm text-[#4A5245]">{isFil ? 'bago gastos sa bukid' : 'before farm costs'}</div>
                </div>
                <span class="text-lg font-bold text-[#597928]">
                  {fit.afterTransportPay !== null ? `₱${fit.afterTransportPay.toLocaleString()}` : '---'}
                </span>
              </div>
            </div>

            <!-- Conditions to Confirm Preview -->
            <details class="rounded-xl p-3 bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
              <summary class="text-sm font-bold text-[#20251E] cursor-pointer min-h-[44px] flex items-center">{isFil ? 'Mga dapat kumpirmahin' : 'What to confirm'}</summary>
              <ul class="text-sm text-[#4A5245] space-y-1 list-disc list-inside">
                {#each isFil ? fit.conditionsToConfirmFil : fit.conditionsToConfirm as condition}
                  <li>{condition}</li>
                {/each}
              </ul>
            </details>
          </div>

          <!-- Card Action Button: Apple HIG min-h-[48px] -->
          <div class="pt-2 border-t border-[#20251E]/8">
            <a
              href={detailUrl}
              class="w-full min-h-[48px] px-5 py-3 rounded-full bg-[#597928] text-white font-semibold text-xs hover:bg-[#435c1d] transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{isFil ? 'Buksan ang detalye' : 'Review this option'}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </article>
      {/each}
    </div>

    <!-- Additional Action / Return to Discovery -->
    <div class="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#20251E]/10">
      <a
        href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}&places=${encodeURIComponent(selectedIds.join(','))}`}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#20251E]/20 text-[#20251E] text-xs font-semibold hover:border-[#597928] transition-all min-h-[44px]"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{isFil ? 'Bumalik sa Resulta ng Pamilihan' : 'Back to discovery results'}</span>
      </a>

      {#if comparedOutlets.length < 3}
        <a
          href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}&places=${encodeURIComponent(selectedIds.join(','))}`}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#597928] text-white text-xs font-bold hover:bg-[#435c1d] transition-all shadow-sm min-h-[44px]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{isFil ? 'Magdagdag ng Ibang Pamilihan' : 'Add another outlet to compare'}</span>
        </a>
      {/if}
    </div>
  {/if}
  {/if}
</div>
