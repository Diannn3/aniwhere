<script lang="ts">
  import { onMount } from 'svelte';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { getSavedOutletIds, toggleSavedOutlet } from '../../lib/state/saved-outlets';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { getCropLabel } from '../../lib/domain/crops';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import type { HarvestQuery } from '../../lib/domain/types';
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
  function formatEvidenceDate(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }


  function handleRemove(id: string) {
    toggleSavedOutlet(id);
    savedIds = getSavedOutletIds();
    confirmClearAll = false;
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

<div class="almanac-page w-full max-w-none px-4 py-6 sm:px-8 sm:py-8 lg:px-12 xl:px-16">
  <header class="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-[#20251E]/25 pb-6">
    <div class="min-w-0">
      <h1 class="font-serif text-3xl font-bold leading-tight text-[#20251E] sm:text-4xl">
        {t('savedTitle', lang)}
      </h1>
      <p class="mt-2 max-w-2xl text-base text-[#4A5245]">
        {isFil
          ? 'Suriin ang tugma, ebidensya, at matitirang ani bago makipag-ugnayan o bumiyahe.'
          : 'Review fit, evidence, and remaining harvest before contacting an outlet or travelling.'}
      </p>
      <p class="mt-3 text-sm font-semibold text-[#4A5245] font-tabular">
        {getCropLabel(harvest.crop, lang)} · {harvest.quantityKg.toLocaleString('en-PH')} kg · {originMun.name}
        {#if harvest.readyDate} · {isFil ? 'Handa' : 'Ready'} {harvest.readyDate}{/if}
      </p>
    </div>

    {#if savedOutlets.length > 0}
      <div class="flex flex-wrap items-center gap-2">
        {#if confirmClearAll}
          <div class="flex flex-wrap items-center gap-2 rounded-lg bg-[#FCECD8] px-3 py-2">
            <span class="text-sm font-semibold text-[#6E3511]">{isFil ? 'Alisin lahat ng naka-save?' : 'Clear every saved place?'}</span>
            <button type="button" onclick={() => (confirmClearAll = false)} class="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-[#20251E] hover:bg-[#FFFDF8]">
              {isFil ? 'Kanselahin' : 'Cancel'}
            </button>
            <button type="button" onclick={handleClearAll} class="min-h-11 rounded-lg bg-[#6E3511] px-3 py-2 text-sm font-bold text-[#FFFDF8] hover:bg-[#5A2B0E]">
              {isFil ? 'Oo, alisin lahat' : 'Yes, clear all'}
            </button>
          </div>
        {:else}
          <button type="button" onclick={handleClearAll} class="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-[#6E3511] hover:bg-[#FCECD8]/60">
            {isFil ? 'Alisin lahat' : 'Clear all'}
          </button>
        {/if}
        <a href={compareAllUrl} class="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#486320] px-5 py-2 text-sm font-bold text-[#FFFDF8] hover:bg-[#3A5219]">
          {isFil ? `Paghambingin ang (${Math.min(savedOutlets.length, 3)})` : `Compare saved (${Math.min(savedOutlets.length, 3)})`}
        </a>
      </div>
    {/if}
  </header>

  <aside class="mt-5 border-y border-[#6E3511]/25 bg-[#FCECD8]/50 px-4 py-3 text-sm leading-relaxed text-[#20251E]">
    <strong>{isFil ? 'Demo — halimbawang datos. Naka-save lang sa device na ito.' : 'Demo — sample data. Saved only on this device.'}</strong>
    {isFil
      ? 'Ang mga lugar ay naka-save lang sa browser na ito. Hindi ito reserbasyon at hindi nito kinokontak ang buyer.'
      : 'These places stay in this browser. Saving does not reserve capacity or contact a buyer.'}
  </aside>

  {#if savedOutlets.length === 0}
    <section class="mt-8 border-y border-[#20251E]/25 bg-[#FCECD8]/20 px-4 py-10 sm:px-8 sm:py-14" aria-labelledby="saved-empty-title">
      <h2 id="saved-empty-title" class="font-serif text-2xl font-bold text-[#20251E] sm:text-3xl">{t('noSavedTitle', lang)}</h2>
      <p class="mt-3 max-w-xl text-base leading-relaxed text-[#4A5245]">{t('noSavedSubtitle', lang)}</p>
      <a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#486320] px-5 py-2 text-sm font-semibold text-[#FFFDF8] hover:bg-[#3A5219]">
        {t('exploreOutlets', lang)}
      </a>
    </section>
  {:else}
    <section class="mt-8" aria-labelledby="saved-ledger-title">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 id="saved-ledger-title" class="font-serif text-2xl font-bold text-[#20251E]">
          {isFil ? 'Talaan ng mga nai-save' : 'Your shortlist'}
        </h2>
        <p class="text-sm font-semibold text-[#4A5245] font-tabular">
          {savedOutlets.length} {isFil ? 'lugar · hanggang 3 ang maihahambing' : 'places · compare up to 3'}
        </p>
      </div>

      <ol class="border-t border-[#20251E]/30">
        {#each savedOutlets as outlet, index (outlet.id)}
          {@const fit = evaluateFit(outlet, harvest)}
          {@const dist = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}
          {@const detailHref = `/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}`}
          {@const compareHref = `/compare?places=${encodeURIComponent(outlet.id)}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`}

          <li class="border-b border-[#20251E]/25">
            <article class="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-5 sm:py-7">
              <span aria-hidden="true" class="almanac-index border-r border-[#20251E]/20 pt-0.5 text-lg text-[#6E3511] font-tabular">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div class="min-w-0">
                <div class="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:gap-8">
                  <div class="min-w-0">
                    <h3 class="font-serif text-xl font-bold leading-tight text-[#20251E] sm:text-2xl">
                      <a href={detailHref} class="inline-flex min-h-11 items-center hover:text-[#486320]">{outlet.name}</a>
                    </h3>
                    <p class="mt-1 text-sm text-[#4A5245]">
                      {outlet.municipality}, Laguna · <span class="capitalize">{outlet.category}</span>
                    </p>
                    <p class="mt-3 text-sm font-bold text-[#20251E]">
                      {isFil ? fit.statusLabelFil : fit.statusLabel}
                    </p>
                    <p class="mt-1 max-w-2xl text-sm leading-relaxed text-[#4A5245]">
                      {isFil ? fit.reasonFil : fit.reason}
                    </p>
                    <p class="mt-3 text-sm text-[#4A5245] font-tabular">
                      <strong class="text-[#20251E]">{dist.toFixed(1)} km</strong>
                      {isFil
                        ? ` tuwid na layo mula sa sentro ng ${originMun.name.split(',')[0]}`
                        : ` straight-line from ${originMun.name.split(',')[0]} municipality center`}
                    </p>
                  </div>

                  <dl class="grid grid-cols-2 border-y border-[#20251E]/20 font-tabular lg:self-start">
                    <div class="min-w-0 py-3 pr-3">
                      <dt class="text-sm font-semibold text-[#4A5245]">{isFil ? 'Kayang tanggapin' : 'Can accept'}</dt>
                      <dd class="mt-1 text-lg font-bold leading-tight text-[#20251E] sm:text-xl">
                        {fit.acceptedKg !== null ? `${fit.acceptedKg.toLocaleString('en-PH')} kg` : (isFil ? 'Hindi pa alam' : 'Unknown')}
                      </dd>
                    </div>
                    <div class="min-w-0 border-l border-[#20251E]/15 py-3 pl-3">
                      <dt class="text-sm font-semibold text-[#4A5245]">{isFil ? 'Matitirang ani' : 'Harvest remaining'}</dt>
                      <dd class="mt-1 text-lg font-bold leading-tight text-[#20251E] sm:text-xl">
                        {fit.remainingKg !== null ? `${fit.remainingKg.toLocaleString('en-PH')} kg` : (isFil ? 'Hindi pa alam' : 'Unknown')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="mt-5 bg-[#FCECD8]/50 px-4 py-3 text-sm leading-relaxed text-[#20251E]">
                  <p>
                    <strong>{isFil ? 'Pinagmulan:' : 'Source:'}</strong>
                    {fit.sourceLabel || (isFil ? 'Hindi alam' : 'Unknown')}
                    {#if fit.dataUpdatedAt}
                      · {isFil ? 'Na-update' : 'Updated'} {formatEvidenceDate(fit.dataUpdatedAt)}
                    {/if}
                  </p>
                  {#if fit.unknowns.length > 0}
                    <p class="mt-1"><strong>{isFil ? 'Kailangang kumpirmahin:' : 'Still to confirm:'}</strong> {(isFil ? fit.unknownsFil : fit.unknowns).join(', ')}</p>
                  {/if}
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-2">
                  <a href={detailHref} class="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#486320] px-4 py-2 text-sm font-semibold text-[#FFFDF8] hover:bg-[#3A5219]">
                    {t('viewDetails', lang)}
                  </a>
                  <a href={compareHref} class="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#20251E]/25 px-4 py-2 text-sm font-semibold text-[#20251E] hover:border-[#597928] hover:bg-[#FCECD8]/50">
                    {isFil ? 'Ihambing' : 'Compare'}
                  </a>
                  <button type="button" onclick={() => handleRemove(outlet.id)} aria-label={`${isFil ? 'Alisin sa nai-save' : 'Remove from saved'}: ${outlet.name}`} class="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-[#6E3511] hover:bg-[#FCECD8]/60">
                    {isFil ? 'Alisin' : 'Remove'}
                  </button>
                </div>
              </div>
            </article>
          </li>
        {/each}
      </ol>
    </section>
  {/if}
</div>
