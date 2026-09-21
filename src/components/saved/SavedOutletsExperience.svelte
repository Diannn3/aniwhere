<script lang="ts">
  import { onMount } from 'svelte';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { getSavedOutletIds, toggleSavedOutlet } from '../../lib/state/saved-outlets';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import type { Outlet, HarvestQuery } from '../../lib/domain/types';
  import { t, outletCategoryLabel } from '../../content/translations';

  interface Props {
    initialLang?: 'en' | 'fil';
  }

  const { initialLang = 'fil' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let savedIds = $state<string[]>([]);
  let saveError = $state(false);
  let comparisonIds = $state<string[]>([]);
  let queryIssues = $state<string[]>([]);
  let harvest = $state<HarvestQuery>({
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: todayInManila(),
  });

  onMount(() => {
    savedIds = getSavedOutletIds();
    comparisonIds = new URLSearchParams(window.location.search).get('places')?.split(',').filter(Boolean) ?? [];
    const parsed = parseDiscoverQuery(window.location.search);
    queryIssues = parsed.issues;
    harvest = parsed.harvest;
    if (parsed.lang) {
      lang = parsed.lang;
    }
  });

  const isFil = $derived(lang === 'fil');

  const savedOutlets = $derived(
    queryIssues.length ? [] : CURRENT_OUTLETS.filter((outlet) => savedIds.includes(outlet.id))
  );

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]
  );

  function handleRemove(id: string) {
    const result = toggleSavedOutlet(id);
    saveError = !result.persisted;
    savedIds = getSavedOutletIds();
  }

  function handleClearAll() {
    saveError = savedIds.map((id) => toggleSavedOutlet(id).persisted).some((persisted) => !persisted);
    savedIds = [];
  }

  const compareAllUrl = $derived(
    `/compare?places=${savedIds.slice(0, 3).map(encodeURIComponent).join(',')}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`
  );
</script>

<div class="farmer-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 space-y-6">
  {#if queryIssues.length > 0}<p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'May di-wastong detalye sa link. Itama ang ani bago tingnan ang mga na-save na lugar.' : 'The shared link has invalid harvest details. Correct them before reviewing saved outlets.'}</p>{/if}
  {#if saveError}<p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'Sa tab na ito lang napanatili ang pagbabago. Maaaring mawala ito kapag isinara ang browser.' : 'This change is held in this tab only and may be lost when you close the browser.'}</p>{/if}
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
      <div class="flex items-center gap-3">
        <button
          type="button"
          onclick={handleClearAll}
          class="px-4 py-2 rounded-full text-xs font-semibold text-[#6E3511] hover:bg-[#6E3511]/10 transition-colors min-h-[44px]"
        >
          {isFil ? 'Alisin Lahat' : 'Clear all'}
        </button>

        <a
          href={compareAllUrl}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#597928] text-white text-xs font-bold hover:bg-[#435c1d] transition-all shadow-sm min-h-[44px]"
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
    <svg class="w-5 h-5 text-[#597928] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <span class="font-bold text-[#20251E]">{isFil ? 'Naka-save sa device na ito:' : 'Saved locally on this device:'}</span>
      {isFil
        ? 'Ang mga lugar na ito ay naka-save sa iyong browser cache. Hindi ito nangangailangan ng account o internet login.'
        : 'Outlets are saved in your local browser memory. No login or cloud sync is required.'}
    </div>
  </div>

  <!-- Content States -->
  {#if savedOutlets.length === 0}
    <!-- Empty State -->
    <div class="bg-white rounded-2xl border border-[#20251E]/12 p-8 sm:p-12 text-center space-y-5 shadow-sm">
      <div class="w-16 h-16 rounded-full bg-[#597928]/10 text-[#597928] mx-auto flex items-center justify-center">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>

      <div class="space-y-1.5 max-w-md mx-auto">
        <h2 class="text-xl sm:text-2xl font-serif font-bold text-[#20251E]">
          {queryIssues.length ? (isFil ? 'Itama muna ang detalye ng ani' : 'Correct harvest details first') : t('noSavedTitle', lang)}
        </h2>
        <p class="text-xs sm:text-sm text-[#4A5245] leading-relaxed">
          {queryIssues.length ? (isFil ? 'Hindi pa ipinapakita ang mga nai-save na lugar dahil mali ang detalye sa link.' : 'Saved outlets are hidden until the invalid link details are corrected.') : t('noSavedSubtitle', lang)}
        </p>
      </div>

      <div class="pt-2">
        <a
          href={queryIssues.length ? '/' : `/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}&places=${encodeURIComponent(comparisonIds.join(','))}`}
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#597928] text-white font-semibold text-sm hover:bg-[#435c1d] transition-all shadow-sm min-h-[44px]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>{queryIssues.length ? (isFil ? 'Itama ang detalye ng ani' : 'Correct harvest details') : t('exploreOutlets', lang)}</span>
        </a>
      </div>
    </div>
  {:else}
    <!-- Saved Outlets Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each savedOutlets as outlet (outlet.id)}
        {@const fit = evaluateFit(outlet, harvest)}
        {@const dist = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}
        {@const detailHref = `/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}&places=${encodeURIComponent(comparisonIds.join(','))}`}
        {@const compareHref = `/compare?places=${encodeURIComponent([...new Set([...comparisonIds, outlet.id])].slice(0, 3).join(','))}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}

        <article class="bg-white rounded-2xl border border-[#20251E]/12 p-6 shadow-sm hover:border-[#597928]/40 transition-all flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <!-- Card Top Bar: Fit Badge & Remove Button -->
            <div class="flex items-start justify-between gap-3">
              <span
                class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  fit.status === 'match'
                    ? 'bg-[#597928]/10 text-[#597928]'
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
                class="w-10 h-10 rounded-full flex items-center justify-center text-[#6B7265] hover:text-red-700 hover:bg-red-50 transition-colors min-h-[44px]"
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
                <a href={detailHref} class="hover:text-[#597928] transition-colors">
                  {outlet.name}
                </a>
              </h2>
              <div class="flex items-center gap-2 text-xs text-[#4A5245] mt-1">
                <span class="font-medium text-[#6E3511]">{outlet.municipality}, Laguna</span>
                <span>&bull;</span>
                <span>{outletCategoryLabel(outlet.category, lang)}</span>
                <span>&bull;</span>
                <span>{dist} km {isFil ? 'tuwirang layo' : 'straight-line'}</span>
              </div>
            </div>

            <!-- Transparent Math Ledger -->
            <div class="rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 p-3.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <div class="text-[10px] uppercase font-semibold text-[#6B7265]">{fit.dataValidUntil && fit.dataValidUntil < todayInManila() ? (isFil ? 'Lumang halimbawang presyo' : 'Expired sample price') : (isFil ? 'Halimbawang presyo' : 'Sample price')}</div>
                <div class="text-sm font-bold text-[#20251E]">
                  {fit.samplePricePerKg !== null ? `₱${fit.samplePricePerKg}/kg` : (isFil ? 'Walang tala' : 'Not posted')}
                </div>
              </div>
              <div>
                <div class="text-[10px] uppercase font-semibold text-[#6B7265]">{isFil ? 'Tatanggapin' : 'Accepted'}</div>
                <div class="text-sm font-bold text-[#597928]">
                  {fit.acceptedKg !== null ? `${fit.acceptedKg} kg` : (isFil ? 'Kumpirmahin' : 'Confirm')}
                </div>
              </div>
              <div>
                <div class="text-[10px] uppercase font-semibold text-[#597928]">{isFil ? 'Matapos ang biyahe' : 'After transport'}</div>
                <div class="text-sm font-bold text-[#597928]">
                  {fit.afterTransportPay !== null ? `₱${fit.afterTransportPay.toLocaleString()}` : '---'}
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="flex items-center gap-3 pt-2 border-t border-[#20251E]/8">
            <a
              href={detailHref}
              class="flex-1 min-h-[44px] px-4 py-2 rounded-full bg-[#597928] text-white font-semibold text-xs text-center flex items-center justify-center gap-1 hover:bg-[#435c1d] transition-all"
            >
              <span>{t('viewDetails', lang)}</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href={compareHref}
              class="min-h-[44px] px-4 py-2 rounded-full border border-[#20251E]/20 text-[#20251E] font-semibold text-xs hover:border-[#597928] hover:text-[#597928] transition-all flex items-center gap-1.5"
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
