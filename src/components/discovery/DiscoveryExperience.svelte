<script lang="ts">
  import { onMount } from 'svelte';
  import type { Outlet, HarvestQuery, FitResult } from '../../lib/domain/types';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { validateHarvestInput } from '../../lib/domain/validation';
  import { SUPPORTED_CROPS, getCropLabel } from '../../lib/domain/crops';
  import { serializeDiscoverQuery, parseDiscoverQuery, todayInManila, type ParsedDiscoverQuery } from '../../lib/state/url-state';
  import { isOutletSaved, toggleSavedOutlet, getSavedOutletIds } from '../../lib/state/saved-outlets';
  import { t } from '../../content/translations';
  import LiveLagunaMap from '../map/LiveLagunaMap.svelte';
  import {
    distanceForBasis,
    getOutletRouteEstimate,
    sharedDistanceBasis,
    type OutletRouteEstimate,
  } from '../../lib/routing/routing-matrix';
  import { publishHarvestContext, subscribeHarvestContext } from '../../lib/ani/harvest-sync';

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
  let sortBy = $state<'fit' | 'distance'>('fit');

  // Local state
  let savedIds = $state<string[]>([]);
  let comparedIds = $state<string[]>([]);
  let isEditingHarvest = $state(false);
  let compareNotice = $state('');

  // Editable harvest draft
  let editCrop = $state(initialQuery.harvest.crop);
  let editKg = $state(initialQuery.harvest.quantityKg);
  let editOrigin = $state(initialQuery.harvest.originMunicipality);
  let editReadyDate = $state(initialQuery.harvest.readyDate || '');
  let editVariety = $state(initialQuery.harvest.details?.variety || '');
  let editGrade = $state(initialQuery.harvest.details?.grade || '');
  let editPackaging = $state(initialQuery.harvest.details?.packaging || '');
  let editErrors = $state<Record<string, string>>({});

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
    route: OutletRouteEstimate;
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
      const route = getOutletRouteEstimate(harvest.originMunicipality, outlet.id, distanceKm);
      return {
        outlet,
        fit,
        distanceKm,
        route,
        isSaved: savedIds.includes(outlet.id),
        isCompared: comparedIds.includes(outlet.id),
      };
    })
  );

  const statusCounts = $derived({
    all: processedOutlets.length,
    match: processedOutlets.filter((item) => item.fit.status === 'match').length,
    partial: processedOutlets.filter((item) => item.fit.status === 'partial').length,
    confirm: processedOutlets.filter((item) => item.fit.status === 'confirm').length,
    no_match: processedOutlets.filter((item) => item.fit.status === 'no_match').length,
  });

  const distanceBasis = $derived(sharedDistanceBasis(processedOutlets.map((item) => item.route)));

  // Filter & Sort
  const filteredOutlets = $derived<ProcessedOutlet[]>(
    processedOutlets
      .filter((item) => {
        // Status filter
        if (statusFilter !== 'all' && item.fit.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return distanceForBasis(a.route, distanceBasis) - distanceForBasis(b.route, distanceBasis);
        }
        // Default: 'fit'
        const rank = { match: 1, partial: 2, confirm: 3, no_match: 4 };
        const diff = rank[a.fit.status] - rank[b.fit.status];
        if (diff !== 0) return diff;
        return distanceForBasis(a.route, distanceBasis) - distanceForBasis(b.route, distanceBasis);
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
    compareNotice = '';

    if (comparedIds.includes(id)) {
      comparedIds = comparedIds.filter((item) => item !== id);
      return;
    }

    if (comparedIds.length >= 3) {
      compareNotice = lang === 'fil'
        ? 'Hanggang tatlong lugar lang ang maaaring paghambingin. Alisin muna ang isa.'
        : 'You can compare up to three places. Remove one first.';
      return;
    }

    comparedIds = [...comparedIds, id];
  }

  function handleOutletCardPointer(event: PointerEvent, id: string) {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, select, textarea, summary, [role="button"]')) return;
    handleToggleCompare(id);
  }

  function resetHarvestEditDraft() {
    editCrop = harvest.crop;
    editKg = harvest.quantityKg;
    editOrigin = harvest.originMunicipality;
    editReadyDate = harvest.readyDate || '';
    editVariety = harvest.details?.variety || '';
    editGrade = harvest.details?.grade || '';
    editPackaging = harvest.details?.packaging || '';
    editErrors = {};
  }

  function toggleHarvestEditor() {
    if (!isEditingHarvest) {
      resetHarvestEditDraft();
      isEditingHarvest = true;
      return;
    }

    resetHarvestEditDraft();
    isEditingHarvest = false;
  }

  function handleApplyHarvestEdit(e: SubmitEvent) {
    e.preventDefault();

    const validation = validateHarvestInput({
      crop: editCrop,
      quantityKg: Number(editKg),
      originMunicipality: editOrigin,
      readyDate: editReadyDate || undefined,
    });

    if (!validation.isValid) {
      editErrors = lang === 'fil' ? validation.errorsFil : validation.errors;
      return;
    }

    editErrors = {};
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

    // Changing the harvest invalidates a selected result until the farmer chooses again.
    selectedOutletId = undefined;
    statusFilter = 'all';
    publishHarvestContext(harvest);

    const newQuery = serializeDiscoverQuery(harvest, activeMobileView, undefined, lang);
    window.history.replaceState({}, '', `/discover?${newQuery}`);
  }

  function syncDiscoveryUrl() {
    const newQuery = serializeDiscoverQuery(harvest, activeMobileView, selectedOutletId, lang);
    window.history.replaceState({}, '', `/discover?${newQuery}`);
  }

  function setStatusFilter(next: 'all' | 'match' | 'partial' | 'confirm' | 'no_match') {
    statusFilter = next;

    if (selectedOutletId && next !== 'all') {
      const selected = processedOutlets.find((item) => item.outlet.id === selectedOutletId);
      if (!selected || selected.fit.status !== next) {
        selectedOutletId = undefined;
        syncDiscoveryUrl();
      }
    }
  }

  function scrollSelectedIntoView(id: string) {
    requestAnimationFrame(() => {
      const el = document.getElementById(`outlet-card-${id}`);
      el?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  }

  function setView(view: 'list' | 'map') {
    activeMobileView = view;
    syncDiscoveryUrl();
    if (view === 'list' && selectedOutletId) {
      scrollSelectedIntoView(selectedOutletId);
    }
  }

  function handleSelectPin(id: string) {
    selectedOutletId = id || undefined;
    syncDiscoveryUrl();

    if (!id) return;

    // On phones, keep the map visible so the farmer can read the route card.
    // Desktop already shows map and list together, so reveal the selected card there too.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      scrollSelectedIntoView(id);
    }
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

  function fitReasonBorder(status: FitResult['status']): string {
    if (status === 'match') return 'border-[#597928]';
    if (status === 'partial') return 'border-[#B86A2B]';
    if (status === 'confirm') return 'border-[#4E7380]';
    return 'border-[#8C9388]';
  }

  function priceLabelFor(fit: FitResult): string {
    if (fit.evidenceKind === 'demo') {
      return lang === 'fil' ? 'Presyo' : 'Price';
    }
    if (fit.evidenceKind === 'buyer_offer') {
      return lang === 'fil' ? 'Presyong naka-post ng buyer' : 'Buyer-posted price';
    }
    return lang === 'fil' ? 'Presyo' : 'Price';
  }
</script>

<div class="almanac-plane discovery-page relative w-full max-w-none px-3 py-3 sm:px-5 sm:py-4">
  
  <!-- 1. Harvest Context Header & Quick Editor Bar (Compact & Ergonomic) -->
  <div class="discovery-docket border border-[#20251E]/25 bg-[#FFFDF8] p-3.5 sm:p-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="font-serif text-xl sm:text-2xl font-bold text-[#20251E] tracking-tight leading-tight">
          {lang === 'fil' ? 'Ruta ng iyong ani' : 'Your harvest route'}
          <span class="docket-harvest">
            {getCropLabel(harvest.crop, lang)} &bull; {harvest.quantityKg.toLocaleString()} kg &bull; {originCoords.name}
          </span>
        </h1>
      </div>

      <!-- Edit harvest toggle button -->
      <button
        type="button"
        onclick={toggleHarvestEditor}
        aria-label={isEditingHarvest ? (lang === 'fil' ? 'Kanselahin ang pag-edit ng ani' : 'Cancel harvest edit') : t('editHarvest', lang)}
        class="premium-control inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border border-[#20251E]/15 bg-[#FFFDF8] text-[#20251E] hover:bg-[#FCECD8]/50 transition-colors shrink-0 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 text-[#486320]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span>{isEditingHarvest ? (lang === 'fil' ? 'Kanselahin' : 'Cancel') : t('editHarvest', lang)}</span>
      </button>
    </div>
    <div class="docket-summary">
      <h2>{lang === 'fil' ? 'Mga posibleng outlet' : 'Potential outlets'}</h2>
      <div class="docket-key">
        <span><i class="key-match"></i>{lang === 'fil' ? 'Tugma sa ani' : 'Matches your harvest'} ({statusCounts.match})</span>
        <span><i class="key-partial"></i>{lang === 'fil' ? 'Tumatanggap ng bahagi' : 'Accepts part'} ({statusCounts.partial})</span>
        <span><i class="key-confirm"></i>{lang === 'fil' ? 'Kumpirmahin muna' : 'Contact to confirm'} ({statusCounts.confirm})</span>
      </div>
      <div class="docket-route">
        <h2>{lang === 'fil' ? 'Ruta mula sa' : 'Route from'} {originCoords.name.split(',')[0]}</h2>
        <p>1 {lang === 'fil' ? 'pinagmulan' : 'origin'} &middot; {processedOutlets.length} {lang === 'fil' ? 'posibleng outlet' : 'potential outlets'}</p>
        <p>{lang === 'fil' ? 'Pumili ng outlet upang makita ang ruta at ebidensya sa ibaba.' : 'Select an outlet to explore route details and view evidence below.'}</p>
      </div>
      <a class="docket-compare" href={`/compare?places=${comparedIds.join(',')}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}>
        {lang === 'fil' ? 'Ihambing' : 'Compare'} {comparedIds.length || ''}
      </a>
    </div>

    <!-- Collapsible Quick Harvest Editor -->
    {#if isEditingHarvest}
      <form onsubmit={handleApplyHarvestEdit} novalidate class="mt-3.5 pt-3.5 border-t border-[#20251E]/10 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        {#if Object.keys(editErrors).length > 0}
          <div role="alert" class="sm:col-span-5 rounded-xl border border-[#6E3511]/30 bg-[#FCECD8]/60 px-3 py-2 text-xs text-[#6E3511]">
            <strong>{lang === 'fil' ? 'Suriin muna ang ani.' : 'Check the harvest details first.'}</strong>
            <ul class="mt-1 list-inside list-disc">
              {#each Object.values(editErrors) as message}
                <li>{message}</li>
              {/each}
            </ul>
          </div>
        {/if}
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
          <input id="edit-kg-input" type="number" bind:value={editKg} min="1" max="100000" inputmode="numeric" aria-invalid={Boolean(editErrors.quantityKg)} aria-describedby={editErrors.quantityKg ? 'edit-kg-error' : undefined} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          {#if editErrors.quantityKg}<p id="edit-kg-error" class="mt-1 text-xs font-semibold text-[#6E3511]">{editErrors.quantityKg}</p>{/if}
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
          <input id="edit-ready-input" type="date" bind:value={editReadyDate} min={todayInManila()} aria-invalid={Boolean(editErrors.readyDate)} aria-describedby={editErrors.readyDate ? 'edit-ready-error' : undefined} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          {#if editErrors.readyDate}<p id="edit-ready-error" class="mt-1 text-xs font-semibold text-[#6E3511]">{editErrors.readyDate}</p>{/if}
        </div>

        <button
          type="submit"
          class="w-full bg-[#486320] hover:bg-[#3A5219] text-[#FFFDF8] font-bold text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          {lang === 'fil' ? 'I-update' : 'Update results'}
        </button>

        <div class="sm:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#20251E]/8">
          <div>
            <label for="edit-variety-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('varietyLabel', lang)} <span class="font-normal text-[#596052]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></label>
            <input id="edit-variety-input" type="text" maxlength="80" bind:value={editVariety} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          </div>
          <div>
            <label for="edit-grade-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('gradeLabel', lang)} <span class="font-normal text-[#596052]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></label>
            <input id="edit-grade-input" type="text" maxlength="80" bind:value={editGrade} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          </div>
          <div>
            <label for="edit-packaging-input" class="block text-xs font-bold text-[#20251E] mb-1">{t('packagingLabel', lang)} <span class="font-normal text-[#596052]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></label>
            <input id="edit-packaging-input" type="text" maxlength="80" bind:value={editPackaging} class="w-full bg-[#FFFDF8] border border-[#20251E]/20 rounded-xl px-3 py-1.5 text-sm font-semibold" />
          </div>
        </div>
      </form>
    {/if}
  </div>

  <div id="discovery-filters" class="discovery-filters flex flex-col justify-between gap-3 border-y border-[#20251E]/20 bg-[#FFFDF8] py-3 sm:flex-row sm:items-center">
    
    <!-- Left: Mobile View Switcher (List vs Map on mobile) + Filters -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 lg:overflow-visible">
      <!-- Keep the map/list switch in the page flow so it cannot cover map controls. -->
      <div
        class="map-view-switch inline-flex bg-[#FFFDF8] border border-[#20251E]/15 rounded-full p-0.5 shrink-0 shadow-xs"
        role="group"
        aria-label={lang === 'fil' ? 'Piliin ang listahan o mapa' : 'Choose list or map view'}
      >
        <button
          type="button"
          onclick={() => setView('list')}
          aria-pressed={activeMobileView === 'list'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeMobileView === 'list'
              ? 'bg-[#486320] text-[#FFFDF8] shadow-xs'
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
          onclick={() => setView('map')}
          aria-pressed={activeMobileView === 'map'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            activeMobileView === 'map'
              ? 'bg-[#486320] text-[#FFFDF8] shadow-xs'
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
      <div
        class="flex items-center gap-1.5 shrink-0"
        role="group"
        aria-label={lang === 'fil' ? 'I-filter ayon sa pagkakatugma' : 'Filter by fit status'}
      >
        <button
          type="button"
          onclick={() => setStatusFilter('all')}
          aria-pressed={statusFilter === 'all'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'border-[#597928] bg-[#486320] text-[#FFFDF8]'
              : 'border-[#20251E]/15 bg-[#FFFDF8] text-[#4A5245] hover:border-[#597928]/40'
          }`}
        >
          {lang === 'fil' ? 'Lahat' : 'All'} ({statusCounts.all})
        </button>

        <button
          type="button"
          onclick={() => setStatusFilter('match')}
          aria-pressed={statusFilter === 'match'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'match'
              ? 'border-[#597928] bg-[#486320] text-[#FFFDF8]'
              : 'border-[#91AC67]/40 bg-[#EAF3DE]/60 text-[#3B5B16] hover:border-[#597928]'
          }`}
        >
          {lang === 'fil' ? 'Tugma sa ani' : 'Matches harvest'} ({statusCounts.match})
        </button>

        <button
          type="button"
          onclick={() => setStatusFilter('partial')}
          aria-pressed={statusFilter === 'partial'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'partial'
              ? 'border-[#6E3511] bg-[#6E3511] text-[#FFFDF8]'
              : 'border-[#E0A96D]/40 bg-[#FCECD8]/60 text-[#6E3511] hover:border-[#6E3511]'
          }`}
        >
          {lang === 'fil' ? 'Tumatanggap ng bahagi' : 'Accepts part'} ({statusCounts.partial})
        </button>

        <button
          type="button"
          onclick={() => setStatusFilter('confirm')}
          aria-pressed={statusFilter === 'confirm'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            statusFilter === 'confirm'
              ? 'border-[#4E7380] bg-[#4E7380] text-[#FFFDF8]'
              : 'border-[#4E7380]/40 bg-[#EBF2F5]/60 text-[#2A4B56] hover:border-[#4E7380]'
          }`}
        >
          {lang === 'fil' ? 'Kumpirmahin muna' : 'Confirm first'} ({statusCounts.confirm})
        </button>

        <button
          type="button"
          onclick={() => setStatusFilter('no_match')}
          aria-pressed={statusFilter === 'no_match'}
          class={`premium-control min-h-11 px-3 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${statusFilter === 'no_match'
            ? 'border-[#20251E] bg-[#20251E] text-[#FFFDF8]'
            : 'border-[#20251E]/20 bg-[#FFFDF8] text-[#4A5245] hover:border-[#20251E]/45'}`}
        >
          {lang === 'fil' ? 'Hindi tugma' : "Doesn't match"} ({statusCounts.no_match})
        </button>
      </div>
    </div>

    <!-- Right: Sort By Dropdown -->
    <div class="flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-1.5 text-xs text-[#4A5245]">
        <label for="sort-by-select" class="font-semibold">{lang === 'fil' ? 'Ayusin:' : 'Sort:'}</label>
        <select
          id="sort-by-select"
          bind:value={sortBy}
          class="min-h-11 bg-[#FFFDF8] border border-[#20251E]/15 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#20251E] outline-none cursor-pointer"
        >
          <option value="fit">{lang === 'fil' ? 'Tugma muna' : 'Match first'}</option>
          <option value="distance">
            {distanceBasis === 'road'
              ? (lang === 'fil' ? 'Pinakamalapit sa kalsada' : 'Nearest by road')
              : (lang === 'fil' ? 'Pinakamalapit (tuwid na layo)' : 'Nearest (straight-line)')}
          </option>
        </select>
      </div>

      {#if statusFilter !== 'all'}
        <button
          type="button"
          onclick={() => setStatusFilter('all')}
          class="min-h-11 px-2 text-xs text-[#6E3511] font-bold hover:underline cursor-pointer"
        >
          {t('clearFilters', lang)}
        </button>
      {/if}
    </div>
  </div>

  {#if sortBy === 'distance'}
    <p class="text-[11px] leading-relaxed text-[#596052]">
      {distanceBasis === 'road'
        ? (lang === 'fil'
            ? 'Pare-parehong distansya sa kalsada ang gamit sa pag-aayos ng lahat ng lugar.'
            : 'Every place is ranked using road distance on the same basis.')
        : (lang === 'fil'
            ? 'Tuwid na layo ang ginagamit para sa lahat ng lugar upang patas ang paghahambing. Hindi ito eksaktong haba ng biyahe.'
            : 'Straight-line distance is used for every place so the comparison stays consistent. It is not the exact travel distance.')}
    </p>
  {/if}

  <!-- 3. Map-first Field Almanac workspace -->
  <div class="discovery-workspace grid grid-cols-1 items-start">
    
    <!-- Ruled outlet evidence index -->
    <div class={`discovery-outlets ${activeMobileView === 'map' ? 'hidden' : 'block'}`}>
      <header class="ledger-heading">
        <h2>{lang === 'fil' ? 'Mga posibleng outlet' : 'Potential outlets'} ({filteredOutlets.length})</h2>
        <p class="text-xs text-[#4A5245]">{lang === 'fil' ? 'Piliin ang lugar para paghambingin (hanggang 3).' : 'Select a place to compare (up to 3).'}</p>
      </header>
      
      {#if filteredOutlets.length === 0}
        <!-- Empty State -->
        <div class="almanac-entry p-8 text-center space-y-3">
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
            onclick={() => setStatusFilter('all')}
            class="min-h-11 px-4 py-2 bg-[#486320] text-[#FFFDF8] rounded-xl text-xs font-bold hover:bg-[#3A5219] transition-colors cursor-pointer"
          >
            {t('clearFilters', lang)}
          </button>
        </div>
      {:else}
        <!-- Outlets List -->
        {#each filteredOutlets as item, index (item.outlet.id)}
            <article
              id={`outlet-card-${item.outlet.id}`}
              aria-current={selectedOutletId === item.outlet.id ? 'true' : undefined}
              class={`almanac-entry ledger-entry status-${item.fit.status} ${selectedOutletId === item.outlet.id ? 'is-selected' : ''} ${item.isCompared ? 'is-compared' : ''}`}
              onpointerup={(event) => handleOutletCardPointer(event, item.outlet.id)}
            >
              <button type="button" class="ledger-number" onclick={() => handleSelectPin(item.outlet.id)} aria-label={`${lang === 'fil' ? 'Piliin' : 'Select'} ${item.outlet.name} ${lang === 'fil' ? 'sa mapa' : 'on map'}`}>{index + 1}</button>
            <!-- Card Header: Fit Badge + Category + Distance -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <!-- Fit Status Badge -->
              {#if item.fit.status === 'match'}
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EAF3DE] text-[#3B5B16] border border-[#91AC67]/40">
                  <svg class="w-3.5 h-3.5 text-[#486320]" viewBox="0 0 20 20" fill="currentColor">
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
                  <svg class="w-3.5 h-3.5 text-[#3D606C]" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                  </svg>
                  <span>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</span>
                </div>
              {:else}
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0F2EE] text-[#555D50] border border-[#D4D8D0]">
                  <svg class="w-3.5 h-3.5 text-[#596052]" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                  <span>{lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}</span>
                </div>
              {/if}

              <!-- Distance Pill -->
              <span class="text-xs font-medium text-[#4A5245] flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-[#486320]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span>
                  {distanceBasis === 'road'
                    ? `${distanceForBasis(item.route, distanceBasis).toFixed(1)} km ${lang === 'fil' ? 'sa kalsada' : 'by road'}`
                    : `${distanceForBasis(item.route, distanceBasis).toFixed(1)} km ${lang === 'fil' ? 'tuwid na layo' : 'straight-line'}`}
                </span>
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
                  class={`premium-control grid min-h-11 min-w-11 place-items-center rounded-lg transition-colors cursor-pointer ${
                    item.isSaved
                      ? 'text-[#486320] bg-[#EAF3DE]'
                      : 'text-[#596052] hover:text-[#20251E] hover:bg-[#FCECD8]/50'
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
              <dl class="grid grid-cols-2 overflow-hidden border-y border-[#20251E]/15 bg-[#FCECD8]/25">
                <div class="p-3 sm:p-3.5">
                  <dt class="text-[11px] font-semibold text-[#596052]">{lang === 'fil' ? 'Kayang tanggapin' : 'Can accept'}</dt>
                  <dd class="mt-0.5 font-tabular text-xl font-bold tracking-tight text-[#20251E]">{item.fit.acceptedKg?.toLocaleString() ?? '—'} <span class="text-xs font-semibold text-[#596052]">kg</span></dd>
                </div>
                <div class="border-l border-[#20251E]/10 p-3 sm:p-3.5">
                  <dt class="text-[11px] font-semibold text-[#596052]">{lang === 'fil' ? 'Matitirang ani' : 'Harvest remaining'}</dt>
                  <dd class={`mt-0.5 font-tabular text-xl font-bold tracking-tight ${item.fit.remainingKg && item.fit.remainingKg > 0 ? 'text-[#6E3511]' : 'text-[#486320]'}`}>{item.fit.remainingKg?.toLocaleString() ?? '—'} <span class="text-xs font-semibold text-[#596052]">kg</span></dd>
                </div>
              </dl>
            {:else if item.fit.status === 'confirm'}
              <div class="border-y border-[#4E7380]/25 bg-[#EBF2F5]/55 px-3 py-2.5">
                <p class="text-xs font-bold text-[#2A4B56]">{lang === 'fil' ? 'Hindi pa alam ang kayang tanggapin' : 'Accepted quantity is still unknown'}</p>
                <p class="mt-1 text-[11px] leading-relaxed text-[#4A5245]">{lang === 'fil' ? 'Kumpirmahin muna ang kapasidad bago magplano ng biyahe.' : 'Confirm capacity before planning a trip.'}</p>
              </div>
            {/if}

            <!-- Fit Reason Explanation -->
            <p class={`text-xs text-[#20251E] bg-[#FFFDF8] border-l-2 ${fitReasonBorder(item.fit.status)} pl-2.5 py-1`}>
              {lang === 'fil' ? item.fit.reasonFil : item.fit.reason}
            </p>

            <!-- Evidence / freshness: source types must stay visibly distinct. -->
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[#20251E]/12 bg-[#FCECD8]/35 px-3 py-2 text-[10px] text-[#4A5245]">
              <span class="font-bold text-[#20251E]">{item.fit.sourceLabel || (lang === 'fil' ? 'Pinagmulan hindi alam' : 'Source unknown')}</span>
              {#if item.fit.dataUpdatedAt}
                <span>{lang === 'fil' ? 'Na-update' : 'Updated'} {formatEvidenceDate(item.fit.dataUpdatedAt)}</span>
              {/if}
              {#if item.fit.dataValidUntil}
                <span>{lang === 'fil' ? 'May bisa hanggang' : 'Valid until'} {formatEvidenceDate(item.fit.dataValidUntil)}</span>
              {/if}
              {#if item.fit.unknowns.length > 0}
                <span class="text-[#3D606C] font-semibold">{lang === 'fil' ? 'Kailangang kumpirmahin:' : 'Unknown:'} {(lang === 'fil' ? item.fit.unknownsFil : item.fit.unknowns).join(', ')}</span>
              {/if}
            </div>

            <!-- Price evidence stays visible; arithmetic is progressively disclosed. -->
            {#if item.fit.samplePricePerKg !== null}
              <details class="group border-y border-[#20251E]/15 bg-[#FFFDF8]">
                <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 sm:px-3.5">
                  <span>
                    <span class="block text-[11px] text-[#596052]">{priceLabelFor(item.fit)}</span>
                    <span class="font-tabular text-sm font-bold text-[#20251E]">₱{item.fit.samplePricePerKg} / kg</span>
                  </span>
                  <span class="flex items-center gap-1.5 text-[11px] font-bold text-[#486320]">
                    {lang === 'fil' ? 'Tingnan ang kalkulasyon' : 'See calculation'}
                    <svg class="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </span>
                </summary>

                <div class="border-t border-[#20251E]/8 px-3 py-3 sm:px-3.5">
                  <div class="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <span class="block text-[11px] text-[#596052]">{lang === 'fil' ? 'Kabuuang halaga' : 'Gross amount'}</span>
                      <span class="font-bold text-[#20251E] font-tabular">{formatCurrency(item.fit.grossPay)}</span>
                      <span class="block text-[10px] text-[#596052]">{item.fit.acceptedKg?.toLocaleString() ?? '—'} kg &times; ₱{item.fit.samplePricePerKg}</span>
                    </div>
                    <div>
                      <span class="block text-[11px] text-[#596052]">{t('enteredTransport', lang)}</span>
                      <span class="font-bold text-[#6E3511] font-tabular">
                        {item.fit.enteredTransport !== null ? `-${formatCurrency(item.fit.enteredTransport)}` : (lang === 'fil' ? 'Hindi inilagay' : 'Not entered')}
                      </span>
                    </div>
                    <div>
                      <span class="block text-[11px] text-[#486320] font-bold">{t('afterTransport', lang)}</span>
                      <span class="font-bold text-base text-[#486320] font-tabular">
                        {item.fit.afterTransportPay !== null ? formatCurrency(item.fit.afterTransportPay) : (lang === 'fil' ? 'Hindi makalkula' : 'Not calculated')}
                      </span>
                    </div>
                  </div>

                  <p class="mt-2 border-t border-[#20251E]/8 pt-2 text-[10px] leading-relaxed text-[#596052]">
                    {t('afterTransportNote', lang)}
                  </p>
                </div>
              </details>
            {/if}

            <!-- Card Actions Footer -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#20251E]/8">
              <button
                type="button"
                onclick={() => handleToggleCompare(item.outlet.id)}
                aria-pressed={item.isCompared}
                aria-label={item.isCompared
                  ? `${lang === 'fil' ? 'Alisin sa paghahambing' : 'Remove'} ${item.outlet.name} ${lang === 'fil' ? 'sa listahan ng paghahambing' : 'from compare'}`
                  : `${lang === 'fil' ? 'Idagdag sa paghahambing' : 'Add'} ${item.outlet.name} ${lang === 'fil' ? 'sa paghahambing' : 'to compare'}`}
                class={`ledger-select-action inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${item.isCompared ? 'border-[#597928] bg-[#EAF3DE] text-[#3B5B16]' : 'border-[#20251E]/20 bg-[#FFFDF8] text-[#4A5245] hover:border-[#597928]'}`}
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  {#if item.isCompared}<path d="m4 10 4 4 8-8" />{:else}<path d="M10 4v12M4 10h12" />{/if}
                </svg>
                <span>{item.isCompared ? (lang === 'fil' ? 'Nasa paghahambing' : 'Selected') : t('addToCompare', lang)}</span>
              </button>

              <!-- View Details Link -->
              <a
                href={`/places/${item.outlet.slug}?${serializeDiscoverQuery(harvest, 'list', item.outlet.id, lang)}`}
                class="almanac-button premium-control inline-flex min-h-11 items-center gap-1 bg-[#486320] px-4 py-2 text-xs text-[#FFFDF8] transition-colors hover:bg-[#3A5219]"
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

    <!-- Dominant synchronized map plate -->
    <div class={`almanac-map discovery-map ${activeMobileView === 'list' ? 'hidden' : 'block'}`}>
      <LiveLagunaMap
        items={filteredOutlets}
        {harvest}
        selectedId={selectedOutletId}
        {lang}
        onSelect={handleSelectPin}
      />
      <aside class="map-legend" aria-label={lang === 'fil' ? 'Paliwanag ng mapa' : 'Map legend'}>
        <h3>{lang === 'fil' ? 'Paliwanag' : 'Legend'}</h3>
        <div class="map-legend__rows">
          <span><i class="legend-road-route"></i>{lang === 'fil' ? 'Ruta sa kalsada' : 'Road route'}</span>
          <span><i class="legend-straight-route"></i>{lang === 'fil' ? 'Tuwid na layo' : 'Straight-line link'}</span>
          <span><i class="legend-origin"></i>{lang === 'fil' ? 'Pinagmulan' : 'Origin'}</span>
          <span><i class="legend-outlet"></i>{lang === 'fil' ? 'Posibleng outlet' : 'Potential outlet'}</span>
          <span><i class="legend-water"></i>{lang === 'fil' ? 'Tubig' : 'Water'}</span>
          <span><i class="legend-land"></i>{lang === 'fil' ? 'Lupa' : 'Land'}</span>
        </div>
      </aside>

      <!-- Map Guidance Card -->
      <div class="border-t border-[#20251E]/20 bg-[#FFFDF8]/95 p-4 text-xs text-[#4A5245] space-y-1.5">
        <h4 class="font-bold text-[#20251E] flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-[#486320]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{lang === 'fil' ? 'Paalala sa Paglalakbay' : 'Travel & Verification Note'}</span>
        </h4>
        <p class="leading-relaxed">
          {lang === 'fil'
            ? 'Pumili ng pin upang makita ang layo at ruta mula sa batayang lokasyon ng munisipyo. Kumpirmahin muna ang pagtanggap bago bumiyahe.'
            : 'Select a pin to see distance and route context from the municipality reference point. Confirm receiving terms before travel.'}
        </p>
        {#if selectedOutletId}
          <button
            type="button"
            onclick={() => setView('list')}
            class="premium-control mt-2 inline-flex min-h-11 items-center rounded-xl border border-[#597928]/30 px-3 py-2 font-bold text-[#486320] hover:bg-[#FCECD8]/45 lg:hidden"
          >
            {lang === 'fil' ? 'Tingnan ang napiling lugar sa listahan' : 'View selected place in the list'}
          </button>
        {/if}
      </div>
    </div>

  </div>

  <!-- 4. Floating Bottom Compare Bar (Appears when >= 1 outlet is selected) -->
  <p class="sr-only" aria-live="polite">{compareNotice}</p>

  {#if comparedIds.length > 0}
    <aside
      class="fixed bottom-14 md:bottom-6 left-4 right-4 max-w-lg mx-auto z-40 bg-[#20251E] text-[#FFFDF8] rounded-2xl p-3.5 px-4 shadow-xl border border-[#FFFDF8]/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
      aria-label="Comparison dock"
    >
      <div class="min-w-0 flex items-start gap-2 text-xs">
        <span class="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-[#486320] font-bold flex items-center justify-center text-xs font-tabular">
          {comparedIds.length}
        </span>
        <span class="min-w-0">
          <span class="block font-medium">
            {lang === 'fil' ? `${comparedIds.length} ng 3 lugar ang napili` : `${comparedIds.length} of 3 places selected`}
          </span>
          {#if comparedIds.length >= 3}
            <span class="mt-0.5 block text-[10px] leading-4 text-[#FFFDF8]/70">
              {lang === 'fil' ? 'Hanggang 3 lang. Alisin muna ang isa para pumili ng iba.' : 'Maximum of 3. Remove one before choosing another.'}
            </span>
          {/if}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => comparedIds = []}
          class="min-h-11 px-3 py-2 rounded-lg text-xs font-semibold text-[#FFFDF8]/80 hover:text-[#FFFDF8] hover:bg-white/8 cursor-pointer"
        >
          {lang === 'fil' ? 'Alisin' : 'Clear'}
        </button>

        <a
          href={`/compare?places=${comparedIds.join(',')}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}
          class="min-h-11 px-4 py-2 rounded-xl bg-[#486320] hover:bg-[#3A5219] text-[#FFFDF8] font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
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

<style>
  .map-legend { position: absolute; z-index: 10; right: 26px; top: 110px; width: 170px; padding: 12px; border: 1px solid #747965; border-radius: 5px; background: #fffdf8; box-shadow: 0 12px 22px -16px #20251e; color: #20251e; font-size: 12px; }
  .map-legend h3 { display: flex; justify-content: space-between; margin-bottom: 9px; padding-bottom: 6px; border-bottom: 1px solid #aab19c; font-weight: 700; }
  .map-legend small { font-size: 10px; font-weight: 500; }
  .map-legend__rows { display: grid; gap: 10px; }
  .map-legend__rows span { display: flex; align-items: center; gap: 10px; }
  .map-legend i { display: inline-block; width: 24px; flex: none; }
  .legend-road-route { border-top: 3px solid #486320; }
  .legend-straight-route { border-top: 3px dashed #486320; }
  .legend-origin { width: 15px !important; height: 15px; margin-inline: 4px 5px; border: 2px solid #20251e; border-radius: 50%; background: #fffdf8; }
  .legend-outlet { width: 15px !important; height: 15px; margin-inline: 4px 5px; border-radius: 50%; background: #597928; }
  .legend-water { height: 12px; background: #698f9c; }
  .legend-land { height: 12px; background: #b3c494; }
  @media (max-width: 1199px) { .map-legend { right: 12px; top: 100px; } }
  @media (max-width: 767px) { .map-legend { width: 155px; padding: 9px; font-size: 11px; } .map-legend__rows { gap: 6px; } }
</style>
