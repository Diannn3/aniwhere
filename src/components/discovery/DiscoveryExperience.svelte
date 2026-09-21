<script lang="ts">
  import { onMount } from 'svelte';
  import type { Outlet, HarvestQuery, FitResult } from '../../lib/domain/types';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { SUPPORTED_CROPS, getCropLabel } from '../../lib/domain/crops';
  import { serializeDiscoverQuery, parseDiscoverQuery, type ParsedDiscoverQuery } from '../../lib/state/url-state';
  import { isOutletSaved, toggleSavedOutlet, getSavedOutletIds } from '../../lib/state/saved-outlets';
  import { t } from '../../content/translations';
  import ResilientLagunaMap from '../map/ResilientLagunaMap.svelte';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';

  let {
    initialQuery,
  }: {
    initialQuery: ParsedDiscoverQuery;
  } = $props();

  let harvest = $state<HarvestQuery>(initialQuery.harvest);
  let lang = $state<'en' | 'fil'>(initialQuery.lang);
  let activeMobileView = $state<'list' | 'map'>(initialQuery.view);
  let selectedOutletId = $state<string | undefined>(initialQuery.selectedPlaceId);

  // Filters
  let statusFilter = $state<'all' | 'match' | 'partial' | 'confirm' | 'no_match'>('all');
  let categoryFilter = $state<string>('all');
  let sortBy = $state<'fit' | 'distance' | 'payout' | 'price' | 'transport'>('fit');
  let searchQuery = $state<string>('');

  // Local state
  let savedIds = $state<string[]>([]);
  let comparedIds = $state<string[]>([]);
  let isEditingHarvest = $state(false);

  // Editable harvest draft
  let editCrop = $state(initialQuery.harvest.crop);
  let editKg = $state(initialQuery.harvest.quantityKg);
  let editOrigin = $state(initialQuery.harvest.originMunicipality);
  let editReadyDate = $state(initialQuery.harvest.readyDate || '');
  let editVariety = $state(initialQuery.harvest.details?.variety || '');
  let editGrade = $state(initialQuery.harvest.details?.grade || '');
  let editPackaging = $state(initialQuery.harvest.details?.packaging || '');

  onMount(() => {
    savedIds = getSavedOutletIds();

    // Hydrate client-side query parameters if present in browser
    if (typeof window !== 'undefined' && window.location.search) {
      const clientQuery = parseDiscoverQuery(window.location.search);
      harvest = clientQuery.harvest;
      lang = clientQuery.lang;
      activeMobileView = clientQuery.view;
      if (clientQuery.selectedPlaceId) {
        selectedOutletId = clientQuery.selectedPlaceId;
      }
      editCrop = clientQuery.harvest.crop;
      editKg = clientQuery.harvest.quantityKg;
      editOrigin = clientQuery.harvest.originMunicipality;
      editReadyDate = clientQuery.harvest.readyDate || '';
      editVariety = clientQuery.harvest.details?.variety || '';
      editGrade = clientQuery.harvest.details?.grade || '';
      editPackaging = clientQuery.harvest.details?.packaging || '';
    }
  });

  onMount(() => subscribeHarvestContext((next) => {
    harvest = next;
    editCrop = next.crop;
    editKg = next.quantityKg;
    editOrigin = next.originMunicipality;
    editReadyDate = next.readyDate || '';
    editVariety = next.details?.variety || '';
    editGrade = next.details?.grade || '';
    editPackaging = next.details?.packaging || '';
    const newQuery = serializeDiscoverQuery(next, activeMobileView, selectedOutletId, lang);
    window.history.replaceState({}, '', `/discover?${newQuery}`);
  }));

  const originCoords = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) ||
    LAGUNA_MUNICIPALITIES[0]
  );

  interface ProcessedOutlet {
    outlet: Outlet;
    fit: FitResult;
    distanceKm: number;
    isSaved: boolean;
    isCompared: boolean;
  }

  // Evaluate all outlets against current harvest query
  const processedOutlets = $derived<ProcessedOutlet[]>(
    CURRENT_OUTLETS.map((outlet) => {
      const fit = evaluateFit(outlet, harvest);
      const distanceKm = calculateStraightLineDistanceKm(
        originCoords.lat,
        originCoords.lng,
        outlet.lat,
        outlet.lng
      );
      return {
        outlet,
        fit,
        distanceKm,
        isSaved: savedIds.includes(outlet.id),
        isCompared: comparedIds.includes(outlet.id),
      };
    })
  );

  // Filter & Sort
  const filteredOutlets = $derived<ProcessedOutlet[]>(
    processedOutlets
      .filter((item) => {
        // Status filter
        if (statusFilter !== 'all' && item.fit.status !== statusFilter) {
          return false;
        }
        // Category filter
        if (categoryFilter !== 'all' && item.outlet.category !== categoryFilter) {
          return false;
        }
        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.outlet.name.toLowerCase().includes(q);
          const matchMun = item.outlet.municipality.toLowerCase().includes(q);
          if (!matchName && !matchMun) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return a.distanceKm - b.distanceKm;
        }
        if (sortBy === 'price') {
          return (b.fit.samplePricePerKg ?? Number.NEGATIVE_INFINITY) - (a.fit.samplePricePerKg ?? Number.NEGATIVE_INFINITY);
        }
        if (sortBy === 'payout') {
          return (b.fit.afterTransportPay ?? Number.NEGATIVE_INFINITY) - (a.fit.afterTransportPay ?? Number.NEGATIVE_INFINITY);
        }
        if (sortBy === 'transport') {
          return (a.fit.enteredTransport ?? Number.POSITIVE_INFINITY) - (b.fit.enteredTransport ?? Number.POSITIVE_INFINITY);
        }
        // Default: 'fit'
        const rank = { match: 1, partial: 2, confirm: 3, no_match: 4 };
        const diff = rank[a.fit.status] - rank[b.fit.status];
        if (diff !== 0) return diff;
        return a.distanceKm - b.distanceKm;
      })
  );

  function handleToggleSave(id: string) {
    const isNowSaved = toggleSavedOutlet(id);
    if (isNowSaved) {
      savedIds = [...savedIds, id];
    } else {
      savedIds = savedIds.filter((item) => item !== id);
    }
  }

  function handleToggleCompare(id: string) {
    if (comparedIds.includes(id)) {
      comparedIds = comparedIds.filter((item) => item !== id);
    } else {
      if (comparedIds.length >= 3) return; // Cap at 3 per contract
      comparedIds = [...comparedIds, id];
    }
  }

  function handleApplyHarvestEdit(e: SubmitEvent) {
    e.preventDefault();
    harvest = {
      ...harvest,
      crop: editCrop,
      quantityKg: Number(editKg),
      originMunicipality: editOrigin,
      readyDate: editReadyDate || undefined,
      details:
        editVariety.trim() || editGrade.trim() || editPackaging.trim()
          ? {
              ...(editVariety.trim() ? { variety: editVariety.trim() } : {}),
              ...(editGrade.trim() ? { grade: editGrade.trim() } : {}),
              ...(editPackaging.trim() ? { packaging: editPackaging.trim() } : {}),
            }
          : undefined,
    };
    isEditingHarvest = false;

    // Sync URL without reload
    const newQuery = serializeDiscoverQuery(harvest, activeMobileView, selectedOutletId, lang);
    window.history.replaceState({}, '', `/discover?${newQuery}`);
  }

  function handleSelectPin(id: string) {
    selectedOutletId = id;
    if (activeMobileView === 'map') {
      activeMobileView = 'list';
    }
    setTimeout(() => {
      const el = document.getElementById(`outlet-card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  function formatCurrency(val: number | null | undefined): string {
    if (val === null || val === undefined) return '—';
    return `₱${val.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
  }

  function formatEvidenceDate(value: string | null | undefined): string {
    if (!value) return lang === 'fil' ? 'Hindi alam' : 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function priceLabelFor(fit: FitResult): string {
    if (fit.evidenceKind === 'demo') {
      return lang === 'fil' ? 'Halimbawang presyo' : 'Sample price';
    }
    if (fit.evidenceKind === 'buyer_offer') {
      return lang === 'fil' ? 'Presyong naka-post ng buyer' : 'Buyer-posted price';
    }
    return lang === 'fil' ? 'Presyo' : 'Price';
  }
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-6">
  
  <!-- 1. Harvest Context Header & Quick Editor Bar (Compact & Ergonomic) -->
  <div class="bg-[#FFFDF8] border border-[#20251E]/12 rounded-2xl p-3.5 sm:p-5 shadow-xs">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="font-serif text-xl sm:text-2xl font-bold text-[#20251E] tracking-tight leading-tight">
          {harvest.quantityKg.toLocaleString()} kg {getCropLabel(harvest.crop, lang)}
          <span class="text-[#4A5245] font-normal text-xs sm:text-sm block sm:inline sm:ml-2">
            {lang === 'fil' ? 'mula' : 'from'} {originCoords.name} &bull; {filteredOutlets.length} {lang === 'fil' ? 'lugar na natagpuan' : 'places found'}
          </span>
        </h1>
      </div>

      <!-- Edit harvest toggle button -->
      <button
        type="button"
        onclick={() => isEditingHarvest = !isEditingHarvest}
        class="premium-control inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border border-[#20251E]/15 bg-[#FFFDF8] text-[#20251E] hover:bg-[#FCECD8]/50 transition-colors shrink-0 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-[#597928]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span class="hidden xs:inline">{isEditingHarvest ? (lang === 'fil' ? 'Isara' : 'Close') : t('editHarvest', lang)}</span>
      </button>
    </div>

    <!-- Collapsible Quick Harvest Editor -->
    {#if isEditingHarvest}
      <form onsubmit={handleApplyHarvestEdit} class="mt-3.5 pt-3.5 border-t border-[#20251E]/10 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label for="edit-crop-select" class="block text-xs font-bold text-[#20251E] mb-1">{t('cropLabel', lang)}</label>
          <select id="edit-crop-select" bind:value={editCrop} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold">
            {#each SUPPORTED_CROPS as item}
              <option value={item.key}>{lang === 'fil' ? item.labelFil : item.labelEn}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="edit-kg-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('quantityLabel', lang)} (kg)</label>
          <input id="edit-kg-input" type="number" bind:value={editKg} min="1" max="100000" class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
        </div>

        <div>
          <label for="edit-origin-select" class="block text-xs font-bold text-[#20251E] mb-1">{t('locationLabel', lang)}</label>
          <select id="edit-origin-select" bind:value={editOrigin} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold truncate">
            {#each LAGUNA_MUNICIPALITIES as mun}
              <option value={mun.id}>{mun.name}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="edit-ready-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('readyDateLabel', lang)}</label>
          <input id="edit-ready-input" type="date" bind:value={editReadyDate} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
        </div>

        <button
          type="submit"
          class="w-full bg-[#597928] hover:bg-[#486320] text-[#FFFDF8] font-bold text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          {lang === 'fil' ? 'I-update' : 'Update results'}
        </button>

        <div class="sm:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#20251E]/8">
          <div>
            <label for="edit-variety-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('varietyLabel', lang)} <span class="font-normal text-[#6B7265]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></label>
            <input id="edit-variety-input" type="text" bind:value={editVariety} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          </div>
          <div>
            <label for="edit-grade-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('gradeLabel', lang)} <span class="font-normal text-[#6B7265]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></label>
            <input id="edit-grade-input" type="text" bind:value={editGrade} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          </div>
          <div>
            <label for="edit-packaging-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('packagingLabel', lang)} <span class="font-normal text-[#6B7265]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></label>
            <input id="edit-packaging-input" type="text" bind:value={editPackaging} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          </div>
        </div>
      </form>
    {/if}
  </div>

  <!-- 2. Controls Row: Mobile View Switcher + Filter Pills + Sort -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    
    <!-- Left: Mobile View Switcher (List vs Map on mobile) + Filters -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
      <!-- Mobile Segmented Toggle -->
      <div class="lg:hidden inline-flex bg-[#FFFDF8] border border-[#20251E]/15 rounded-full p-0.5 shrink-0 shadow-xs" role="group" aria-label="View toggle">
        <button
          type="button"
          onclick={() => activeMobileView = 'list'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeMobileView === 'list'
              ? 'bg-[#597928] text-[#FFFDF8] shadow-xs'
              : 'text-[#4A5245] hover:text-[#20251E]'
          }`}
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
          </svg>
          <span>{lang === 'fil' ? 'Listahan' : 'List'}</span>
        </button>

        <button
          type="button"
          onclick={() => activeMobileView = 'map'}
          class={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeMobileView === 'map'
              ? 'bg-[#597928] text-[#FFFDF8] shadow-xs'
              : 'text-[#4A5245] hover:text-[#20251E]'
          }`}
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          </svg>
          <span>{lang === 'fil' ? 'Mapa' : 'Map'}</span>
        </button>
      </div>

      <div class="h-4 w-px bg-[#20251E]/15 hidden sm:block shrink-0"></div>

      <!-- Filter Pills (Horizontally scrollable on mobile) -->
      <div class="flex items-center gap-1.5 shrink-0" role="group" aria-label="Status filter">
        <button
          type="button"
          onclick={() => statusFilter = 'all'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'border-[#597928] bg-[#597928] text-[#FFFDF8]'
              : 'border-[#20251E]/15 bg-[#FFFDF8] text-[#4A5245] hover:border-[#597928]/40'
          }`}
        >
          {lang === 'fil' ? 'Lahat' : 'All'} ({processedOutlets.length})
        </button>

        <button
          type="button"
          onclick={() => statusFilter = 'match'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'match'
              ? 'border-[#597928] bg-[#597928] text-[#FFFDF8]'
              : 'border-[#91AC67]/40 bg-[#EAF3DE]/60 text-[#3B5B16] hover:border-[#597928]'
          }`}
        >
          {lang === 'fil' ? 'Tugma' : 'Full match'}
        </button>

        <button
          type="button"
          onclick={() => statusFilter = 'partial'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'partial'
              ? 'border-[#6E3511] bg-[#6E3511] text-[#FFFDF8]'
              : 'border-[#E0A96D]/40 bg-[#FCECD8]/60 text-[#6E3511] hover:border-[#6E3511]'
          }`}
        >
          {lang === 'fil' ? 'Bahagya' : 'Partial'}
        </button>

        <button
          type="button"
          onclick={() => statusFilter = 'confirm'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'confirm'
              ? 'border-[#4E7380] bg-[#4E7380] text-[#FFFDF8]'
              : 'border-[#4E7380]/40 bg-[#EBF2F5]/60 text-[#2A4B56] hover:border-[#4E7380]'
          }`}
        >
          {lang === 'fil' ? 'Kumpirmahin' : 'Confirm'}
        </button>
      </div>
    </div>

    <!-- Right: Sort By Dropdown -->
    <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0">
      <div class="flex items-center gap-1.5 text-xs text-[#4A5245]">
        <label for="sort-by-select" class="font-semibold">{lang === 'fil' ? 'Ayusin:' : 'Sort:'}</label>
        <select
          id="sort-by-select"
          bind:value={sortBy}
          class="min-h-11 bg-[#FFFDF8] border border-[#20251E]/15 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#20251E] outline-none cursor-pointer"
        >
          <option value="fit">{lang === 'fil' ? 'Status ng Pagkakatugma' : 'Fit status'}</option>
          <option value="distance">{lang === 'fil' ? 'Pinakamalapit' : 'Nearest'}</option>
          <option value="payout">{lang === 'fil' ? 'Halaga Matapos ang Biyahe' : 'Amount after transport'}</option>
          <option value="price">{lang === 'fil' ? 'Presyo / kg' : 'Price / kg'}</option>
          <option value="transport">{lang === 'fil' ? 'Mababang Biyahe' : 'Lowest Transport'}</option>
        </select>
      </div>

      {#if statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery}
        <button
          type="button"
          onclick={() => {
            statusFilter = 'all';
            categoryFilter = 'all';
            searchQuery = '';
          }}
          class="text-xs text-[#6E3511] font-bold hover:underline cursor-pointer"
        >
          {t('clearFilters', lang)}
        </button>
      {/if}
    </div>
  </div>

  <!-- 3. Main Responsive 2-Column Split -->
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
    
    <!-- Left Column: Outlet Cards List (7 cols on desktop) -->
    <div class={`lg:col-span-7 space-y-4 ${activeMobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
      
      {#if filteredOutlets.length === 0}
        <!-- Empty State -->
        <div class="bg-[#FFFDF8] border border-[#20251E]/10 rounded-2xl p-8 text-center space-y-3">
          <div class="w-12 h-12 rounded-full bg-[#FCECD8] text-[#6E3511] flex items-center justify-center mx-auto">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <h3 class="font-serif text-lg font-bold text-[#20251E]">
            {t('noMatches', lang)}
          </h3>
          <p class="text-xs text-[#4A5245] max-w-sm mx-auto">
            {lang === 'fil'
              ? 'Subukang palitan ang napiling status filter o baguhin ang dami ng ani upang makakita ng mas maraming opsyon.'
              : 'Try clearing the active status filter or adjusting your harvest volume to explore more options.'}
          </p>
          <button
            type="button"
            onclick={() => {
              statusFilter = 'all';
              categoryFilter = 'all';
              searchQuery = '';
            }}
            class="px-4 py-2 bg-[#597928] text-[#FFFDF8] rounded-xl text-xs font-bold hover:bg-[#486320] transition-colors cursor-pointer"
          >
            {t('clearFilters', lang)}
          </button>
        </div>
      {:else}
        <!-- Outlets List -->
        {#each filteredOutlets as item (item.outlet.id)}
          <article
            id={`outlet-card-${item.outlet.id}`}
            class={`bg-[#FFFDF8] border rounded-2xl p-4 sm:p-5 transition-all shadow-xs space-y-3 sm:space-y-4 ${
              selectedOutletId === item.outlet.id
                ? 'border-[#597928] ring-2 ring-[#597928]/30'
                : 'border-[#20251E]/12 hover:border-[#597928]/50'
            }`}
          >
            <!-- Card Header: Fit Badge + Category + Distance -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <!-- Fit Status Badge -->
              {#if item.fit.status === 'match'}
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF3DE] text-[#3B5B16] border border-[#91AC67]/40">
                  <svg class="w-3.5 h-3.5 text-[#597928]" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</span>
                </div>
              {:else if item.fit.status === 'partial'}
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FCECD8] text-[#6E3511] border border-[#E0A96D]/50">
                  <svg class="w-3.5 h-3.5 text-[#6E3511]" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                  </svg>
                  <span>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</span>
                </div>
              {:else if item.fit.status === 'confirm'}
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF2F5] text-[#2A4B56] border border-[#4E7380]/40">
                  <svg class="w-3.5 h-3.5 text-[#4E7380]" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                  </svg>
                  <span>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</span>
                </div>
              {:else}
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0F2EE] text-[#6B7265] border border-[#D4D8D0]">
                  <svg class="w-3.5 h-3.5 text-[#6B7265]" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  <span>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</span>
                </div>
              {/if}

              <!-- Distance Pill -->
              <span class="text-xs font-medium text-[#4A5245] flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#597928]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span>{item.distanceKm} km {lang === 'fil' ? 'mula rito' : 'away'}</span>
              </span>
            </div>

            <!-- Outlet Title & Location -->
            <div>
              <div class="flex items-center justify-between">
                <h2 class="font-serif text-lg sm:text-xl font-bold text-[#20251E]">
                  {item.outlet.name}
                </h2>
                <!-- Save bookmark icon button -->
                <button
                  type="button"
                  onclick={() => handleToggleSave(item.outlet.id)}
                  aria-label={item.isSaved ? t('removeFromSaved', lang) : t('saveOutlet', lang)}
                  class={`premium-control grid min-h-11 min-w-11 place-items-center rounded-full transition-colors cursor-pointer ${
                    item.isSaved
                      ? 'text-[#597928] bg-[#EAF3DE]'
                      : 'text-[#6B7265] hover:text-[#20251E] hover:bg-[#FCECD8]/50'
                  }`}
                >
                  <svg class="w-4 h-4" fill={item.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
              <p class="text-xs text-[#4A5245] font-medium mt-0.5">
                {item.outlet.municipality}, Laguna &bull; <span class="capitalize">{item.outlet.category}</span>
              </p>
            </div>

            <!-- Decision quantities stay visible even when no price exists. -->
            {#if item.fit.status === 'match' || item.fit.status === 'partial'}
              <dl class="grid grid-cols-2 overflow-hidden rounded-xl border border-[#20251E]/10 bg-[#F9FBF7]">
                <div class="p-3 sm:p-3.5">
                  <dt class="text-[11px] font-semibold text-[#687064]">{lang === 'fil' ? 'Kayang tanggapin' : 'Can accept'}</dt>
                  <dd class="mt-0.5 font-tabular text-xl font-bold tracking-tight text-[#20251E]">{item.fit.acceptedKg?.toLocaleString() ?? '—'} <span class="text-xs font-semibold text-[#687064]">kg</span></dd>
                </div>
                <div class="border-l border-[#20251E]/10 p-3 sm:p-3.5">
                  <dt class="text-[11px] font-semibold text-[#687064]">{lang === 'fil' ? 'Matitirang ani' : 'Harvest remaining'}</dt>
                  <dd class={`mt-0.5 font-tabular text-xl font-bold tracking-tight ${item.fit.remainingKg && item.fit.remainingKg > 0 ? 'text-[#6E3511]' : 'text-[#597928]'}`}>{item.fit.remainingKg?.toLocaleString() ?? '—'} <span class="text-xs font-semibold text-[#687064]">kg</span></dd>
                </div>
              </dl>
            {:else if item.fit.status === 'confirm'}
              <div class="rounded-xl border border-[#4E7380]/20 bg-[#EBF2F5]/55 px-3 py-2.5">
                <p class="text-xs font-bold text-[#2A4B56]">{lang === 'fil' ? 'Hindi pa alam ang kayang tanggapin' : 'Accepted quantity is still unknown'}</p>
                <p class="mt-1 text-[11px] leading-relaxed text-[#4A5245]">{lang === 'fil' ? 'Kumpirmahin muna ang kapasidad bago magplano ng biyahe.' : 'Confirm capacity before planning a trip.'}</p>
              </div>
            {/if}

            <!-- Fit Reason Explanation -->
            <p class="text-xs text-[#20251E] bg-[#FFFDF8] border-l-2 border-[#597928] pl-2.5 py-1">
              {lang === 'fil' ? item.fit.reasonFil : item.fit.reason}
            </p>

            <!-- Evidence / freshness: demo, buyer-posted, reviewed, and public-reference data must stay visibly distinct. -->
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#FAF7EE] border border-[#20251E]/8 px-3 py-2 text-[10px] text-[#4A5245]">
              <span class="font-bold text-[#20251E]">{item.fit.sourceLabel || (lang === 'fil' ? 'Pinagmulan hindi alam' : 'Source unknown')}</span>
              {#if item.fit.dataUpdatedAt}
                <span>{lang === 'fil' ? 'Na-update' : 'Updated'} {formatEvidenceDate(item.fit.dataUpdatedAt)}</span>
              {/if}
              {#if item.fit.dataValidUntil}
                <span>{lang === 'fil' ? 'May bisa hanggang' : 'Valid until'} {formatEvidenceDate(item.fit.dataValidUntil)}</span>
              {/if}
              {#if item.fit.unknowns.length > 0}
                <span class="text-[#4E7380] font-semibold">{lang === 'fil' ? 'Kailangang kumpirmahin:' : 'Unknown:'} {(lang === 'fil' ? item.fit.unknownsFil : item.fit.unknowns).join(', ')}</span>
              {/if}
            </div>

            <!-- Honest Math Transparency Box -->
            {#if item.fit.samplePricePerKg !== null}
              <div class="bg-[#F9FBF7] border border-[#20251E]/10 rounded-xl p-3 sm:p-3.5 space-y-2">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <span class="block text-[11px] text-[#6B7265]">{priceLabelFor(item.fit)}</span>
                    <span class="font-bold text-[#20251E] font-tabular">₱{item.fit.samplePricePerKg} / kg</span>
                    <span class="block text-[10px] text-[#6B7265]">({item.fit.acceptedKg?.toLocaleString()} kg)</span>
                  </div>
                  <div>
                    <span class="block text-[11px] text-[#6B7265]">{lang === 'fil' ? 'Kabuuang Halaga' : 'Gross Subtotal'}</span>
                    <span class="font-bold text-[#20251E] font-tabular">{formatCurrency(item.fit.grossPay)}</span>
                    <span class="block text-[10px] text-[#6B7265]">{item.fit.acceptedKg}kg &times; ₱{item.fit.samplePricePerKg}</span>
                  </div>
                  <div>
                    <span class="block text-[11px] text-[#6B7265]">{t('enteredTransport', lang)}</span>
                    <span class="font-bold text-[#6E3511] font-tabular">
                      {item.fit.enteredTransport !== null ? `-${formatCurrency(item.fit.enteredTransport)}` : '—'}
                    </span>
                    <span class="block text-[10px] text-[#6E3511]">{lang === 'fil' ? 'bawas sa biyahe' : 'hauling cost'}</span>
                  </div>
                  <div>
                    <span class="block text-[11px] text-[#597928] font-bold">{t('afterTransport', lang)}</span>
                    <span class="font-bold text-base text-[#597928] font-tabular">
                      {formatCurrency(item.fit.afterTransportPay)}
                    </span>
                    <span class="block text-[10px] text-[#597928] font-medium">{lang === 'fil' ? 'bago gastos sa bukid' : 'before farm costs'}</span>
                  </div>
                </div>

                <!-- Anti-Profit Claim Strict Disclaimer -->
                <p class="text-[10px] text-[#6B7265] border-t border-[#20251E]/8 pt-1.5 leading-tight">
                  {t('afterTransportNote', lang)}
                </p>
              </div>
            {/if}

            <!-- Card Actions Footer -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#20251E]/8">
              <!-- Add to compare checkbox -->
              <label class="flex items-center gap-2 text-xs font-semibold text-[#4A5245] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item.isCompared}
                  disabled={!item.isCompared && comparedIds.length >= 3}
                  onchange={() => handleToggleCompare(item.outlet.id)}
                  class="rounded text-[#597928] focus:ring-[#597928] w-4 h-4 cursor-pointer"
                />
                <span>{item.isCompared ? (lang === 'fil' ? 'Nasa paghahambing' : 'In comparison') : t('addToCompare', lang)}</span>
              </label>

              <!-- View Details Link -->
              <a
                href={`/places/${item.outlet.slug}?${serializeDiscoverQuery(harvest, 'list', item.outlet.id, lang)}`}
                class="premium-control inline-flex min-h-11 items-center gap-1 px-4 py-2 rounded-full text-xs font-bold bg-[#597928] hover:bg-[#486320] text-[#FFFDF8] transition-colors shadow-xs"
              >
                <span>{t('viewDetails', lang)}</span>
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

          </article>
        {/each}
      {/if}

    </div>

    <!-- Right Column: Interactive Resilient Map Panel (5 cols on desktop, sticky) -->
    <div class={`lg:col-span-5 lg:sticky lg:top-24 space-y-4 ${activeMobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
      <ResilientLagunaMap
        items={filteredOutlets}
        {harvest}
        selectedId={selectedOutletId}
        {lang}
        onSelect={handleSelectPin}
      />

      <!-- Map Guidance Card -->
      <div class="bg-[#FFFDF8] border border-[#20251E]/10 rounded-2xl p-4 text-xs text-[#4A5245] space-y-1.5 shadow-xs">
        <h4 class="font-bold text-[#20251E] flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-[#597928]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{lang === 'fil' ? 'Paalala sa Paglalakbay' : 'Travel & Verification Note'}</span>
        </h4>
        <p class="leading-relaxed">
          {lang === 'fil'
            ? 'Pumili ng pin sa mapa upang makita ang ruta mula sa iyong munisipalidad. Palaging tawagan ang mamimili bago umalis upang kumpirmahin ang iskedyul ng pagtanggap.'
            : 'Select any pin to highlight the destination from your municipality. Always contact the receiving facility to confirm operating hours before loading cargo.'}
        </p>
      </div>
    </div>

  </div>

  <!-- 4. Floating Bottom Compare Bar (Appears when >= 1 outlet is selected) -->
  {#if comparedIds.length > 0}
    <aside
      class="fixed bottom-14 md:bottom-6 left-4 right-4 max-w-lg mx-auto z-40 bg-[#20251E] text-[#FFFDF8] rounded-2xl p-3.5 px-4 shadow-xl border border-[#FFFDF8]/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
      aria-label="Comparison dock"
    >
      <div class="flex items-center gap-2 text-xs">
        <span class="w-6 h-6 rounded-full bg-[#597928] font-bold flex items-center justify-center text-xs font-tabular">
          {comparedIds.length}
        </span>
        <span class="font-medium">
          {lang === 'fil' ? `${comparedIds.length} ng 3 lugar ang napili` : `${comparedIds.length} of 3 places selected`}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => comparedIds = []}
          class="text-xs text-[#FFFDF8]/70 hover:text-[#FFFDF8] px-2 py-1 cursor-pointer"
        >
          {lang === 'fil' ? 'Alisin' : 'Clear'}
        </button>

        <a
          href={`/compare?places=${comparedIds.join(',')}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}
          class="px-4 py-1.5 rounded-xl bg-[#597928] hover:bg-[#486320] text-[#FFFDF8] font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
        >
          <span>{lang === 'fil' ? 'Ihambing' : 'Compare'}</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </aside>
  {/if}

</div>
