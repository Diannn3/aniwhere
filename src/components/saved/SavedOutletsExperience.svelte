<script lang="ts">
  import { onMount } from 'svelte';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { getSavedOutletIds, toggleSavedOutlet } from '../../lib/state/saved-outlets';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import type { Outlet, HarvestQuery } from '../../lib/domain/types';
  import { t } from '../../content/translations';

  interface Props {
    initialLang?: 'en' | 'fil';
  }

  const { initialLang = 'en' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let savedIds = $state<string[]>([]);
  let confirmClearAll = $state(false);
  let harvest = $state<HarvestQuery>({
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: todayInManila(),
  });

  onMount(() => {
    savedIds = getSavedOutletIds();
    const parsed = parseDiscoverQuery(window.location.search);
    harvest = parsed.harvest;
    if (parsed.lang) {
      lang = parsed.lang;
    }
  });

  onMount(() => subscribeHarvestContext((next) => {
    harvest = next;
  }));

  const isFil = $derived(lang === 'fil');

  const savedOutlets = $derived(
    CURRENT_OUTLETS.filter((outlet) => savedIds.includes(outlet.id))
  );

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]
  );

  function handleRemove(id: string) {
    toggleSavedOutlet(id);
    savedIds = getSavedOutletIds();
  }

  function handleClearAll() {
    if (!confirmClearAll) {
      confirmClearAll = true;
      return;
    }

    savedIds.forEach((id) => toggleSavedOutlet(id));
    savedIds = [];
    confirmClearAll = false;
  }

  const compareAllUrl = $derived(
    `/compare?places=${savedOutlets.slice(0, 3).map((outlet) => encodeURIComponent(outlet.id)).join(',')}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`
  );
</script>

<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
  <!-- Page Header (Anti-Vibecode: Direct H1, No Kicker) -->
  <header class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#20251E]/10 pb-6">
    <div class="space-y-2">
      <h1 class="text-3xl sm:text-4xl font-serif font-bold text-[#20251E] tracking-tight">
        {t('savedTitle', lang)}
      </h1>
      <p class="text-sm sm:text-base text-[#4A5245]">
        {t('savedSubtitle', lang)}
      </p>
    </div>

    {#if savedOutlets.length > 0}
      <div class="flex flex-wrap items-center justify-end gap-2">
        {#if confirmClearAll}
          <span class="text-xs font-semibold text-[#6E3511]">
            {isFil ? 'Alisin lahat ng naka-save?' : 'Clear every saved place?'}
          </span>
          <button
            type="button"
            onclick={() => (confirmClearAll = false)}
            class="min-h-11 rounded-full border border-[#20251E]/15 px-4 py-2 text-xs font-semibold text-[#4A5245] hover:bg-[#FCECD8]/40"
          >
            {isFil ? 'Kanselahin' : 'Cancel'}
          </button>
          <button
            type="button"
            onclick={handleClearAll}
            class="min-h-11 rounded-full bg-[#6E3511] px-4 py-2 text-xs font-bold text-[#FFFDF8] hover:bg-[#5A2B0E]"
          >
            {isFil ? 'Oo, alisin lahat' : 'Yes, clear all'}
          </button>
        {:else}
          <button
            type="button"
            onclick={handleClearAll}
            class="min-h-11 rounded-full px-4 py-2 text-xs font-semibold text-[#6E3511] hover:bg-[#6E3511]/10 transition-colors"
          >
            {isFil ? 'Alisin lahat' : 'Clear all'}
          </button>
        {/if}

        <a
          href={compareAllUrl}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#486320] text-white text-xs font-bold hover:bg-[#435c1d] transition-all shadow-sm min-h-[44px]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>{isFil ? `Paghambingin ang (${Math.min(savedOutlets.length, 3)})` : `Compare saved (${Math.min(savedOutlets.length, 3)})`}</span>
        </a>
      </div>
    {/if}
  </header>

  <!-- Notice: Device-Only Storage -->
  <div class="rounded-xl p-4 bg-[#FAF7EE] border border-[#20251E]/10 flex items-start gap-3 text-xs text-[#4A5245]">
    <svg class="w-5 h-5 text-[#486320] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <span class="font-bold text-[#20251E]">{isFil ? 'Naka-save sa device na ito:' : 'Saved locally on this device:'}</span>
      {isFil
        ? 'Ang mga lugar na ito ay naka-save lang sa browser ng device na ito. Hindi ito reserbasyon at hindi nito kinokontak ang buyer.'
        : 'Outlets are saved only in this device browser. Saving does not reserve capacity or contact the buyer.'}
    </div>
  </div>

  <!-- Content States -->
  {#if savedOutlets.length === 0}
    <!-- Empty State -->
    <div class="bg-white rounded-2xl border border-[#20251E]/12 p-8 sm:p-12 text-center space-y-5 shadow-sm">
      <div class="w-16 h-16 rounded-full bg-[#486320]/10 text-[#486320] mx-auto flex items-center justify-center">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>

      <div class="space-y-1.5 max-w-md mx-auto">
        <h2 class="text-xl sm:text-2xl font-serif font-bold text-[#20251E]">
          {t('noSavedTitle', lang)}
        </h2>
        <p class="text-xs sm:text-sm text-[#4A5245] leading-relaxed">
          {t('noSavedSubtitle', lang)}
        </p>
      </div>

      <div class="pt-2">
        <a
          href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#486320] text-white font-semibold text-sm hover:bg-[#435c1d] transition-all shadow-sm min-h-[44px]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>{t('exploreOutlets', lang)}</span>
        </a>
      </div>
    </div>
  {:else}
    <!-- Saved Outlets Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each savedOutlets as outlet (outlet.id)}
        {@const fit = evaluateFit(outlet, harvest)}
        {@const dist = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}
        {@const detailHref = `/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}`}
        {@const compareHref = `/compare?places=${encodeURIComponent(outlet.id)}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}

        <article class="bg-white rounded-2xl border border-[#20251E]/12 p-6 shadow-sm hover:border-[#597928]/40 transition-all flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <!-- Card Top Bar: Fit Badge & Remove Button -->
            <div class="flex items-start justify-between gap-3">
              <span
                class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  fit.status === 'match'
                    ? 'bg-[#486320]/10 text-[#486320]'
                    : fit.status === 'partial'
                    ? 'bg-[#FCECD8] text-[#6E3511]'
                    : fit.status === 'confirm'
                    ? 'bg-[#4E7380]/10 text-[#4E7380]'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <span>{isFil ? fit.statusLabelFil : fit.statusLabel}</span>
              </span>

              <button
                type="button"
                onclick={() => handleRemove(outlet.id)}
                class="h-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-[#596052] hover:text-red-700 hover:bg-red-50 transition-colors"
                aria-label={isFil ? 'Alisin sa nai-save' : 'Remove from saved'}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <!-- Title & Municipality -->
            <div>
              <h2 class="text-xl font-serif font-bold text-[#20251E]">
                <a href={detailHref} class="hover:text-[#486320] transition-colors">
                  {outlet.name}
                </a>
              </h2>
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4A5245] mt-1">
                <span class="font-medium text-[#6E3511]">{outlet.municipality}, Laguna</span>
                <span aria-hidden="true">&bull;</span>
                <span class="capitalize">{outlet.category}</span>
              </div>
              <p class="mt-1 text-[11px] text-[#596052]">
                {isFil
                  ? `${dist.toFixed(1)} km tuwid mula sa sentro ng ${originMun.name.split(',')[0]}`
                  : `${dist.toFixed(1)} km straight-line from ${originMun.name.split(',')[0]} municipality center`}
              </p>
            </div>

            <!-- Decision-first shortlist facts -->
            <div class="rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 p-3.5 grid grid-cols-2 gap-3">
              <div>
                <div class="text-[10px] font-semibold text-[#596052]">{isFil ? 'Kayang tanggapin' : 'Can accept'}</div>
                <div class="mt-0.5 text-base font-bold text-[#20251E] font-tabular">
                  {fit.acceptedKg !== null
                    ? `${fit.acceptedKg.toLocaleString('en-PH')} kg`
                    : (isFil ? 'Kumpirmahin' : 'Confirm')}
                </div>
              </div>
              <div>
                <div class="text-[10px] font-semibold text-[#596052]">{isFil ? 'Matitirang ani' : 'Harvest remaining'}</div>
                <div class="mt-0.5 text-base font-bold text-[#20251E] font-tabular">
                  {fit.remainingKg !== null
                    ? `${fit.remainingKg.toLocaleString('en-PH')} kg`
                    : (isFil ? 'Kumpirmahin' : 'Confirm')}
                </div>
              </div>
            </div>

            <div class="rounded-lg bg-[#FAF7EE] px-3 py-2 text-[11px] leading-relaxed text-[#596052]">
              <strong class="text-[#20251E]">{fit.sourceLabel || (isFil ? 'Pinagmulan hindi alam' : 'Source unknown')}</strong>
              {#if fit.unknowns.length > 0}
                <span class="block mt-0.5">
                  {isFil ? 'Kumpirmahin pa:' : 'Still confirm:'}
                  {(isFil ? fit.unknownsFil : fit.unknowns).join(', ')}
                </span>
              {/if}
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="flex items-center gap-3 pt-2 border-t border-[#20251E]/8">
            <a
              href={detailHref}
              class="flex-1 min-h-[44px] px-4 py-2 rounded-full bg-[#486320] text-white font-semibold text-xs text-center flex items-center justify-center gap-1 hover:bg-[#435c1d] transition-all"
            >
              <span>{t('viewDetails', lang)}</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href={compareHref}
              class="min-h-[44px] px-4 py-2 rounded-full border border-[#20251E]/20 text-[#20251E] font-semibold text-xs hover:border-[#597928] hover:text-[#486320] transition-all flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{isFil ? 'Ihambing' : 'Compare'}</span>
            </a>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>
