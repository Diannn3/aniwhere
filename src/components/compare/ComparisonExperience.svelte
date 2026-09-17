<script lang="ts">
  import { onMount } from 'svelte';
  import { DEMO_OUTLETS } from '../../content/demo-outlets';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { parseDiscoverQuery } from '../../lib/state/url-state';
  import { safeStorage } from '../../lib/state/storage';
  import type { Outlet, HarvestQuery } from '../../lib/domain/types';
  import { t } from '../../content/translations';

  interface Props {
    initialLang?: 'en' | 'fil';
  }

  const { initialLang = 'en' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let selectedIds = $state<string[]>([]);
  let harvest = $state<HarvestQuery>({
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: '2026-09-17',
  });

  // Local editable transport expense overrides per outlet
  let customTransports = $state<Record<string, number>>({});

  onMount(() => {
    const parsed = parseDiscoverQuery(window.location.search);
    harvest = parsed.harvest;
    if (parsed.lang) {
      lang = parsed.lang;
    }

    // Read places from URL search params first
    const searchParams = new URLSearchParams(window.location.search);
    const placesParam = searchParams.get('places');

    if (placesParam) {
      const ids = placesParam.split(',').map((s) => s.trim()).filter(Boolean);
      selectedIds = ids.slice(0, 3);
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
  });

  const isFil = $derived(lang === 'fil');

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]
  );

  const comparedOutlets = $derived(
    selectedIds
      .map((id) => DEMO_OUTLETS.find((o) => o.id === id || o.slug === id))
      .filter((o): o is Outlet => Boolean(o))
      .slice(0, 3)
  );

  function handleRemove(id: string) {
    selectedIds = selectedIds.filter((item) => item !== id);
    safeStorage.setItem('aniwhere_compare_ids', selectedIds);
  }

  function handleTransportChange(outletId: string, value: string) {
    const num = Number(value);
    if (!isNaN(num) && num >= 0) {
      customTransports[outletId] = num;
    }
  }

  function getTransportCost(outlet: Outlet, defaultCost: number | null): number {
    if (customTransports[outlet.id] !== undefined) {
      return customTransports[outlet.id];
    }
    return defaultCost ?? 300;
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
  <!-- Page Header (Anti-Vibecode: Direct H1, No Kicker) -->
  <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#20251E]/10 pb-6">
    <div class="space-y-2 max-w-2xl">
      <h1 class="text-3xl sm:text-4xl font-serif font-bold text-[#20251E] tracking-tight">
        {isFil ? 'Paghambingin ang mga Pamilihan' : 'Compare Options for Your Harvest'}
      </h1>
      <p class="text-sm sm:text-base text-[#4A5245]">
        {isFil
          ? `Suriin at paghambingin ang mga potensyal na mapagbebentahan sa Laguna para sa iyong ${harvest.quantityKg} kg na ${harvest.crop}.`
          : `Review and compare potential selling outlets in Laguna side-by-side for your ${harvest.quantityKg} kg of ${harvest.crop}.`}
      </p>
    </div>

    <!-- Active Harvest Badge / Edit Shortcut -->
    <div class="bg-white rounded-2xl border border-[#20251E]/12 p-4 shadow-sm flex items-center gap-4">
      <div class="space-y-0.5 text-xs">
        <div class="font-bold text-[#20251E] text-sm capitalize">{harvest.quantityKg} kg {harvest.crop}</div>
        <div class="text-[#6B7265]">{originMun.name} &bull; Ready {harvest.readyDate}</div>
      </div>

      <a
        href={`/discover?crop=${encodeURIComponent(harvest.crop)}&kg=${harvest.quantityKg}&origin=${encodeURIComponent(harvest.originMunicipality)}&ready=${encodeURIComponent(harvest.readyDate)}&lang=${lang}`}
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
      <span class="font-bold text-[#20251E]">Notice:</span> {t('afterTransportNote', lang)}
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
            : 'Select 1 to 3 outlets from discovery to compare accepted quantities, sample prices, and transport costs.'}
        </p>
      </div>

      <div class="pt-2">
        <a
          href="/discover"
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
        {@const defaultTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? 300}
        {@const activeTransport = getTransportCost(outlet, defaultTransport)}
        {@const fit = evaluateFit(outlet, harvest, activeTransport)}
        {@const dist = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}
        {@const detailUrl = `/places/${outlet.slug}?crop=${encodeURIComponent(harvest.crop)}&kg=${harvest.quantityKg}&origin=${encodeURIComponent(harvest.originMunicipality)}&ready=${encodeURIComponent(harvest.readyDate)}&lang=${lang}`}

        <article class="bg-white rounded-2xl border border-[#20251E]/12 p-6 shadow-sm flex flex-col justify-between gap-6 hover:border-[#597928]/40 transition-all">
          <div class="space-y-5">
            <!-- Header: Title, Category & Remove Control -->
            <div class="flex items-start justify-between gap-3 border-b border-[#20251E]/8 pb-4">
              <div>
                <span class="inline-block text-[11px] uppercase font-bold text-[#6E3511] tracking-wider mb-1">
                  {outlet.category}
                </span>
                <h2 class="text-xl font-serif font-bold text-[#20251E] leading-snug">
                  {outlet.name}
                </h2>
                <div class="flex items-center gap-1.5 text-xs text-[#4A5245] mt-1">
                  <span>{outlet.municipality}, Laguna</span>
                  <span>&bull;</span>
                  <span>{dist} km away</span>
                </div>
              </div>

              <!-- Accessible Remove Action -->
              <button
                type="button"
                onclick={() => handleRemove(outlet.id)}
                class="w-10 h-10 -mr-2 -mt-2 rounded-full flex items-center justify-center text-[#6B7265] hover:text-[#20251E] hover:bg-[#20251E]/8 transition-colors min-h-[44px]"
                aria-label={`Remove ${outlet.name} from comparison`}
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

            <!-- Quantitative Arithmetic Ledger -->
            <div class="space-y-2.5 text-xs">
              <!-- Accepted kg -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{isFil ? 'Kayang Tanggapin:' : 'Accepted Quantity:'}</span>
                <span class="font-bold text-sm text-[#597928]">
                  {fit.acceptedKg !== null ? `${fit.acceptedKg} kg` : 'Confirm'}
                </span>
              </div>

              <!-- Remaining kg -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{isFil ? 'Matitira:' : 'Remaining Unsold:'}</span>
                <span class={`font-bold text-sm ${fit.remainingKg && fit.remainingKg > 0 ? 'text-[#6E3511]' : 'text-[#20251E]'}`}>
                  {fit.remainingKg !== null ? `${fit.remainingKg} kg` : '0 kg'}
                </span>
              </div>

              <!-- Price per kg -->
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
                <span class="text-[#4A5245]">{isFil ? 'Presyo bawat kilo:' : 'Price per kg:'}</span>
                <span class="font-bold text-sm text-[#20251E]">
                  {fit.samplePricePerKg !== null ? `₱${fit.samplePricePerKg.toFixed(2)}` : 'Not posted'}
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
                  <span class="text-[10px] text-[#6B7265] italic">editable</span>
                </div>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7265] font-semibold">₱</span>
                  <input
                    id={`transport-${outlet.id}`}
                    type="number"
                    min="0"
                    step="50"
                    value={activeTransport}
                    oninput={(e) => handleTransportChange(outlet.id, (e.target as HTMLInputElement).value)}
                    class="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#20251E]/20 text-sm font-bold text-[#6E3511] focus:outline-none focus:ring-2 focus:ring-[#597928] bg-white min-h-[44px]"
                    aria-label={`Hauling cost for ${outlet.name}`}
                  />
                </div>
                <div class="text-[10px] text-[#6B7265]">
                  Entered by farmer &bull; Not a price quote
                </div>
              </div>

              <!-- Net Payout After Transport -->
              <div class="flex items-center justify-between p-3 rounded-xl bg-[#597928]/10 border border-[#597928]/35">
                <div>
                  <div class="text-[11px] font-bold text-[#597928] uppercase tracking-wider">
                    {isFil ? 'Matapos ang Biyahe' : 'After Transport'}
                  </div>
                  <div class="text-[10px] text-[#4A5245]">before farm costs</div>
                </div>
                <span class="text-lg font-bold text-[#597928]">
                  {fit.afterTransportPay !== null ? `₱${fit.afterTransportPay.toLocaleString()}` : '---'}
                </span>
              </div>
            </div>

            <!-- Conditions to Confirm Preview -->
            <div class="rounded-xl p-3 bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
              <div class="text-[11px] font-bold text-[#20251E]">Requirements to Confirm:</div>
              <ul class="text-[11px] text-[#4A5245] space-y-1 list-disc list-inside">
                <li>What grade is accepted for {harvest.crop}?</li>
                <li>What packaging is required?</li>
                {#if fit.conditionsToConfirm && fit.conditionsToConfirm[0]}
                  <li>{fit.conditionsToConfirm[0]}</li>
                {/if}
              </ul>
            </div>
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
        href={`/discover?crop=${encodeURIComponent(harvest.crop)}&kg=${harvest.quantityKg}&origin=${encodeURIComponent(harvest.originMunicipality)}&ready=${encodeURIComponent(harvest.readyDate)}&lang=${lang}`}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#20251E]/20 text-[#20251E] text-xs font-semibold hover:border-[#597928] transition-all min-h-[44px]"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{isFil ? 'Bumalik sa Resulta ng Pamilihan' : 'Back to discovery results'}</span>
      </a>

      {#if comparedOutlets.length < 3}
        <a
          href={`/discover?crop=${encodeURIComponent(harvest.crop)}&kg=${harvest.quantityKg}&origin=${encodeURIComponent(harvest.originMunicipality)}&ready=${encodeURIComponent(harvest.readyDate)}&lang=${lang}`}
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
</div>
