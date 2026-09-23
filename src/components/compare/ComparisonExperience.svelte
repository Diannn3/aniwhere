<script lang="ts">
  import { onMount } from 'svelte';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';
  import { subscribeTransportUpdate } from '../../lib/ani/ui-sync';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { evaluateFit } from '../../lib/domain/match';
  import { getCropLabel } from '../../lib/domain/crops';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import {
    distanceForBasis,
    getOutletRouteEstimate,
    sharedDistanceBasis,
  } from '../../lib/routing/routing-matrix';
  import { parseCompareQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { safeStorage } from '../../lib/state/storage';
  import type { FitStatus, HarvestQuery, Outlet } from '../../lib/domain/types';

  interface Props {
    initialLang?: 'en' | 'fil';
    initialPlaceIds?: string[];
  }

  const { initialLang = 'en', initialPlaceIds = [] } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  function normalizeSelectedIds(ids: string[]): string[] {
    const knownIds = new Set(CURRENT_OUTLETS.map((outlet) => outlet.id));
    const knownSlugs = new Map(CURRENT_OUTLETS.map((outlet) => [outlet.slug, outlet.id]));
    return ids
      .map((id) => knownIds.has(id) ? id : knownSlugs.get(id))
      .filter((id): id is string => Boolean(id))
      .filter((id, index, values) => values.indexOf(id) === index)
      .slice(0, 3);
  }

  let selectedIds = $state<string[]>(normalizeSelectedIds(initialPlaceIds));
  let harvest = $state<HarvestQuery>({ crop: 'tomato', quantityKg: 300, originMunicipality: 'los-banos', readyDate: todayInManila() });
  let transportDrafts = $state<Record<string, string>>({});
  let transportAnnouncement = $state('');

  onMount(() => {
    const parsed = parseCompareQuery(window.location.search);
    harvest = parsed.harvest;
    lang = parsed.lang || lang;

    const params = new URLSearchParams(window.location.search);
    if (params.has('places')) {
      selectedIds = normalizeSelectedIds(parsed.placeIds);
      safeStorage.setItem('aniwhere_compare_ids', selectedIds);
      syncComparisonUrl(selectedIds);
      return;
    }

    const stored = safeStorage.getItem<string[]>('aniwhere_compare_ids', []);
    selectedIds = normalizeSelectedIds(stored);
  });

  onMount(() => subscribeHarvestContext((next) => {
    harvest = next;
  }));

  onMount(() => subscribeTransportUpdate(({ outletId, amount }) => {
    if (!selectedIds.includes(outletId)) return;
    transportDrafts = { ...transportDrafts, [outletId]: String(amount) };
    const outlet = CURRENT_OUTLETS.find((item) => item.id === outletId || item.slug === outletId);
    if (!outlet) return;
    const fit = evaluateFit(outlet, harvest, amount);
    transportAnnouncement = fit.afterTransportPay === null
      ? copy(`Transport updated for ${outlet.name}; after transport cannot be calculated without a recorded price.`, `Na-update ang gastos sa biyahe para sa ${outlet.name}; hindi makalkula ang matapos ang biyahe nang walang nakatalang presyo.`)
      : copy(`After transport updated to ${formatPeso(fit.afterTransportPay)} for ${outlet.name}.`, `Na-update sa ${formatPeso(fit.afterTransportPay)} ang matapos ang biyahe para sa ${outlet.name}.`);
  }));

  const isFil = $derived(lang === 'fil');
  const cropName = $derived(getCropLabel(harvest.crop, lang));
  const originMun = $derived(LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]);
  const comparedOutlets = $derived(selectedIds.map((id) => CURRENT_OUTLETS.find((o) => o.id === id || o.slug === id)).filter((o): o is Outlet => Boolean(o)).slice(0, 3));
  const comparisonDistanceBasis = $derived(
    sharedDistanceBasis(
      comparedOutlets.map((outlet) => {
        const distance = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng);
        return getOutletRouteEstimate(harvest.originMunicipality, outlet.id, distance);
      })
    )
  );

  function copy(en: string, fil: string) { return isFil ? fil : en; }
  function formatPeso(value: number | null) { return value === null ? copy('Not calculated', 'Hindi nakalkula') : `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`; }
  function formatKg(value: number | null) { return value === null ? copy('Confirm first', 'Kumpirmahin muna') : `${value.toLocaleString('en-PH')} kg`; }
  function formatEvidenceDate(value: string | null | undefined) {
    if (!value) return copy('Not recorded', 'Walang tala');
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(isFil ? 'fil-PH' : 'en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function evidenceKindLabel(kind: string) {
    const labels: Record<string, [string, string]> = {
      demo: ['Demo — sample data', 'Demo — halimbawang datos'], buyer_offer: ['Buyer-posted offer', 'Alok na naka-post ng buyer'],
      reviewed_place: ['Reviewed place information', 'Nasuring impormasyon ng lugar'], public_reference: ['Public reference', 'Pampublikong sanggunian'],
      unknown: ['Source type unknown', 'Hindi alam ang uri ng pinagmulan'],
    };
    const label = labels[kind] || labels.unknown;
    return isFil ? label[1] : label[0];
  }
  function priceLabel(kind: string, value: number | null) {
    if (value === null) return copy('No price recorded', 'Walang nakatalang presyo');
    const prefix = kind === 'demo' ? copy('Sample price', 'Halimbawang presyo') : kind === 'buyer_offer' ? copy('Buyer-posted price', 'Presyong naka-post ng buyer') : kind === 'public_reference' ? copy('Reference price', 'Presyong sanggunian') : copy('Recorded price', 'Nakatalaang presyo');
    return `${prefix}: ₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}/kg`;
  }
  function fitTone(status: FitStatus) {
    if (status === 'match') return 'border-[#597928]/30 bg-[#486320]/10 text-[#20251E]';
    if (status === 'partial') return 'border-[#6E3511]/25 bg-[#FCECD8] text-[#20251E]';
    if (status === 'confirm') return 'border-[#4E7380]/30 bg-[#4E7380]/10 text-[#20251E]';
    return 'border-[#6E3511]/25 bg-[#FCECD8]/60 text-[#20251E]';
  }
  function hasTransportDraft(id: string) { return Object.prototype.hasOwnProperty.call(transportDrafts, id); }
  function transportValue(outlet: Outlet, recorded: number | null) { return hasTransportDraft(outlet.id) ? transportDrafts[outlet.id] : recorded === null ? '' : String(recorded); }
  function parsedTransport(outlet: Outlet, recorded: number | null) {
    const value = transportValue(outlet, recorded).trim();
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  function transportProvenance(outlet: Outlet, recorded: number | null) {
    if (!transportValue(outlet, recorded).trim()) return copy('Transport has not been entered.', 'Wala pang inilalagay na gastos sa biyahe.');
    return hasTransportDraft(outlet.id) ? copy('Your edited transport amount.', 'Inedit mong halaga ng biyahe.') : copy('Recorded transport estimate.', 'Nakatalaang tantiya sa biyahe.');
  }
  function syncComparisonUrl(ids: string[]) {
    const params = new URLSearchParams(serializeDiscoverQuery(harvest, 'list', undefined, lang));
    if (ids.length > 0) params.set('places', ids.join(','));
    window.history.replaceState({}, '', `/compare?${params.toString()}`);
  }

  function handleTransportChange(outlet: Outlet, recorded: number | null, value: string) {
    transportDrafts = { ...transportDrafts, [outlet.id]: value };
    const transport = parsedTransport(outlet, recorded);
    if (transport === null) {
      transportAnnouncement = copy(`Transport is not entered for ${outlet.name}; after transport is not calculated.`, `Wala pang gastos sa biyahe para sa ${outlet.name}; hindi nakalkula ang matapos ang biyahe.`);
      return;
    }
    const nextFit = evaluateFit(outlet, harvest, transport);
    transportAnnouncement = nextFit.afterTransportPay === null
      ? copy(`Transport updated for ${outlet.name}; after transport cannot be calculated without a recorded price.`, `Na-update ang gastos sa biyahe para sa ${outlet.name}; hindi makalkula ang matapos ang biyahe nang walang nakatalang presyo.`)
      : copy(`After transport updated to ${formatPeso(nextFit.afterTransportPay)} for ${outlet.name}.`, `Na-update sa ${formatPeso(nextFit.afterTransportPay)} ang matapos ang biyahe para sa ${outlet.name}.`);
  }
  function handleRemove(id: string) {
    selectedIds = selectedIds.filter((selectedId) => selectedId !== id);
    safeStorage.setItem('aniwhere_compare_ids', selectedIds);
    syncComparisonUrl(selectedIds);
  }
</script>

<div class="almanac-page comparison-page w-full min-w-0 max-w-none px-4 py-6 sm:px-8 sm:py-8 lg:px-12 xl:px-16">
  <div class="min-w-0 space-y-8 lg:space-y-10">
    <header class="flex flex-wrap items-end justify-between gap-5 border-b border-[#20251E]/20 pb-6">
      <div class="max-w-3xl">
        <h1 class="font-serif text-3xl font-bold leading-tight tracking-[-0.025em] text-[#20251E] sm:text-4xl">{copy('Compare options for your harvest', 'Paghambingin ang mga opsyon para sa ani mo')}</h1>
      </div>
      <a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#597928]/35 bg-[#FFFDF8] px-4 py-2 text-sm font-semibold text-[#486320] transition-colors hover:bg-[#FCECD8]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Edit harvest context', 'Baguhin ang konteksto ng ani')}</a>
    </header>

    <section aria-label={copy('Harvest context', 'Konteksto ng ani')} class="border-y border-[#20251E]/20 bg-[#FCECD8]/35">
      <div class="grid grid-cols-2 gap-x-5 sm:grid-cols-4 sm:gap-x-0">
        <div class="min-w-0 border-b border-[#20251E]/10 py-3 pr-3 sm:border-b-0 sm:px-4 sm:first:pl-0"><p class="text-xs font-semibold text-[#596052]">{copy('Harvest', 'Ani')}</p><p class="mt-1 font-semibold text-[#20251E]">{cropName}</p></div>
        <div class="min-w-0 border-b border-[#20251E]/10 py-3 sm:border-b-0 sm:border-l sm:border-[#20251E]/10 sm:px-4"><p class="text-xs font-semibold text-[#596052]">{copy('Quantity', 'Dami')}</p><p class="mt-1 font-semibold tabular-nums text-[#20251E]">{harvest.quantityKg.toLocaleString('en-PH')} kg</p></div>
        <div class="min-w-0 py-3 pr-3 sm:border-l sm:border-[#20251E]/10 sm:px-4">
          <p class="text-xs font-semibold text-[#596052]">{copy('Origin municipality', 'Munisipalidad')}</p>
          <p class="mt-1 font-semibold text-[#20251E]">{originMun.name}</p>
          <p class="mt-1 text-xs leading-4 text-[#596052]">{copy('Distance reference: municipality center', 'Batayan ng layo: sentro ng munisipyo')}</p>
        </div>
        <div class="min-w-0 border-l border-[#20251E]/10 py-3 pl-4 sm:px-4"><p class="text-xs font-semibold text-[#596052]">{copy('Ready date', 'Petsa ng ani')}</p><p class="mt-1 font-semibold tabular-nums text-[#20251E]">{harvest.readyDate}</p></div>
      </div>
    </section>

    <aside class="border border-[#6E3511]/20 bg-[#FCECD8] px-4 py-4 text-sm leading-6 text-[#20251E] sm:px-5" aria-label={copy('Calculation note', 'Paalala sa kalkulasyon')}>
      <p class="font-bold text-[#6E3511]">{copy('Demo — sample data', 'Demo — halimbawang datos')}</p>
      <p class="mt-1">{copy(
        'After entered transport only — not profit or guaranteed income. The figure subtracts the amount below from recorded gross; production costs are not included.',
        'Pagkatapos lamang ng inilagay na gastos sa biyahe — hindi tubo o garantisadong kita. Ibinabawas ang halaga sa ibaba mula sa nakatalang kabuuan; hindi kasama ang gastos sa produksiyon.',
      )}</p>
      <p class="mt-1 text-[#4A5245]">{copy(
        'Replace a recorded demo transport estimate with your own amount. With no transport amount or recorded price, the result is not calculated.',
        'Palitan ang nakatalang demo tantiya sa biyahe ng sarili mong halaga. Kung walang halagang biyahe o nakatalang presyo, hindi kakalkulahin ang resulta.',
      )}</p>
    </aside>

    {#if comparedOutlets.length === 0}
      <section class="border-y border-[#20251E]/20 bg-white px-4 py-10 sm:px-8 sm:py-14">
        <h2 class="font-serif text-2xl font-bold text-[#20251E]">{copy('No outlets selected', 'Walang napiling outlet')}</h2>
        <p class="mt-3 max-w-xl text-base leading-6 text-[#4A5245]">{copy('Select up to three outlets from discovery to compare the same details side by side.', 'Pumili ng hanggang tatlong outlet mula sa paghahanap upang maihambing ang parehong detalye nang magkatabi.')}</p>
        <a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#486320] px-5 py-2.5 text-sm font-semibold text-[#FFFDF8] transition-colors hover:bg-[#3A5219] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Find selling options', 'Maghanap ng mapagbebentahan')}</a>
      </section>
    {:else}
      <section class="sm:hidden" aria-labelledby="mobile-comparison-title">
        <div class="mb-5 border-b border-[#20251E]/20 pb-4">
          <h2 id="mobile-comparison-title" class="font-serif text-2xl font-bold tracking-[-0.02em] text-[#20251E]">
            {copy('Decision ledger', 'Talaan ng desisyon')}
          </h2>
          <p class="mt-1 text-sm leading-5 text-[#4A5245]">
            {copy('Read each place in the same order, then confirm its terms before travel.', 'Basahin ang bawat lugar sa parehong ayos, saka kumpirmahin ang mga kondisyon bago bumiyahe.')}
          </p>
          <p class="mt-2 text-sm leading-5 text-[#596052]">
            {comparisonDistanceBasis === 'road'
              ? copy('All selected places use road-distance estimates.', 'Tantiya ng layo sa kalsada ang gamit sa lahat ng napiling lugar.')
              : copy('All selected places use straight-line distance from the municipality center, not exact travel distance.', 'Tuwid na layo mula sa sentro ng munisipyo ang gamit sa lahat ng napiling lugar, hindi eksaktong haba ng biyahe.')}
          </p>
        </div>

        <div class="grid gap-6">
          {#each comparedOutlets as outlet (outlet.id)}
            {@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}
            {@const transport = parsedTransport(outlet, recordedTransport)}
            {@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}
            {@const distance = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}
            {@const route = getOutletRouteEstimate(harvest.originMunicipality, outlet.id, distance)}
            {@const unknowns = isFil ? fit.unknownsFil : fit.unknowns}
            {@const questions = isFil ? fit.conditionsToConfirmFil : fit.conditionsToConfirm}
            <article class="min-w-0 border-t-2 border-[#20251E] bg-white px-4 pb-5 pt-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="font-serif text-xl font-bold leading-tight text-[#20251E]">{outlet.name}</h3>
                  <p class="mt-1 text-sm text-[#4A5245]">{outlet.municipality}, Laguna · {outlet.category}</p>
                </div>
                <button
                  type="button"
                  onclick={() => handleRemove(outlet.id)}
                  class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[#4A5245] hover:bg-[#20251E]/8 hover:text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
                  aria-label={copy(`Remove ${outlet.name} from comparison`, `Alisin ang ${outlet.name} sa paghahambing`)}
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div class={`mt-4 border-y px-0 py-3 ${fitTone(fit.status)}`}>
                <p class="font-semibold">{isFil ? fit.statusLabelFil : fit.statusLabel}</p>
                <p class="mt-1 text-sm leading-5 text-[#4A5245]">{isFil ? fit.reasonFil : fit.reason}</p>
              </div>

              <dl class="divide-y divide-[#20251E]/10">
                <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <dt class="text-sm text-[#4A5245]">{copy('Can accept', 'Kayang tanggapin')}</dt>
                  <dd class="font-semibold tabular-nums text-[#20251E]">{formatKg(fit.acceptedKg)}</dd>
                </div>
                <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <dt class="text-sm text-[#4A5245]">{copy('Harvest remaining', 'Natitirang ani')}</dt>
                  <dd class="font-semibold tabular-nums text-[#20251E]">{formatKg(fit.remainingKg)}</dd>
                </div>
                <div class="py-3">
                  <dt class="text-sm text-[#4A5245]">{copy('Price evidence', 'Ebidensya ng presyo')}</dt>
                  <dd class="mt-1 font-semibold tabular-nums text-[#20251E]">{priceLabel(fit.evidenceKind, fit.samplePricePerKg)}</dd>
                  <dd class="text-sm text-[#4A5245]">{evidenceKindLabel(fit.evidenceKind)}</dd>
                </div>
                <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <dt class="text-sm text-[#4A5245]">{copy('Gross amount', 'Kabuuang halaga')}</dt>
                  <dd class="font-semibold tabular-nums text-[#20251E]">{formatPeso(fit.grossPay)}</dd>
                </div>
                <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <dt class="text-sm text-[#4A5245]">{copy('Distance', 'Layo')}</dt>
                  <dd class="font-semibold tabular-nums text-[#20251E]">
                    {comparisonDistanceBasis === 'road'
                      ? `${distanceForBasis(route, comparisonDistanceBasis).toFixed(1)} km ${copy('by road', 'sa kalsada')}`
                      : `${distanceForBasis(route, comparisonDistanceBasis).toFixed(1)} km ${copy('straight-line', 'tuwid na layo')}`}
                  </dd>
                </div>
              </dl>

              <div class="border-t border-[#20251E]/20 py-4">
                <label class="text-sm font-semibold text-[#20251E]" for={`mobile-transport-${outlet.id}`}>
                  {copy('Transport amount used', 'Halagang biyahe na gagamitin')}
                  <span class="sr-only">{copy(` for ${outlet.name}`, ` para sa ${outlet.name}`)}</span>
                </label>
                <div class="relative mt-2">
                  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#4A5245]">₱</span>
                  <input
                    id={`mobile-transport-${outlet.id}`}
                    type="number"
                    min="0"
                    step="50"
                    inputmode="decimal"
                    value={transportValue(outlet, recordedTransport)}
                    placeholder={copy('Enter amount', 'Maglagay ng halaga')}
                    oninput={(event) => handleTransportChange(outlet, recordedTransport, (event.currentTarget as HTMLInputElement).value)}
                    class={`min-h-11 w-full rounded-lg border bg-[#FFFDF8] py-2 pl-7 pr-3 text-base font-semibold tabular-nums text-[#20251E] outline-none transition-shadow focus:ring-2 focus:ring-[#597928] ${hasTransportDraft(outlet.id) ? 'border-[#597928]' : 'border-[#20251E]/35'}`}
                  />
                </div>
                <p class="mt-2 text-sm leading-5 text-[#4A5245]">{transportProvenance(outlet, recordedTransport)}</p>
                <div class="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-[#20251E]/10 pt-3">
                  <span class="text-sm font-semibold text-[#20251E]">{copy('After transport', 'Matapos ang biyahe')}</span>
                  <strong class="text-lg tabular-nums text-[#20251E]">
                    {transport === null ? copy('Not calculated', 'Hindi nakalkula') : formatPeso(fit.afterTransportPay)}
                  </strong>
                </div>
              </div>

              <div class="bg-[#FCECD8] px-4 py-4 text-sm leading-5 text-[#20251E]">
                <p class="font-semibold">{fit.sourceLabel || copy('Source unknown', 'Hindi alam ang pinagmulan')}</p>
                <dl class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[#4A5245]">
                  <div><dt class="inline">{copy('Updated', 'Na-update')}: </dt><dd class="inline tabular-nums">{formatEvidenceDate(fit.dataUpdatedAt)}</dd></div>
                  <div><dt class="inline">{copy('Valid until', 'May bisa hanggang')}: </dt><dd class="inline tabular-nums">{formatEvidenceDate(fit.dataValidUntil)}</dd></div>
                </dl>
                {#if unknowns.length > 0}
                  <p class="mt-3"><strong>{copy('Still unknown:', 'Hindi pa alam:')}</strong> {unknowns.join(', ')}</p>
                {/if}
                {#if questions.length > 0}
                  <p class="mt-3 font-semibold">{copy('Confirm before travel', 'Kumpirmahin bago bumiyahe')}</p>
                  <ul class="mt-1 list-disc space-y-1 pl-5">{#each questions as question}<li>{question}</li>{/each}</ul>
                {:else}
                  <p class="mt-3">{copy('Confirm current terms before travel.', 'Kumpirmahin pa rin ang kasalukuyang kondisyon bago bumiyahe.')}</p>
                {/if}
              </div>

              <a
                href={`/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}`}
                class="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#597928]/35 px-4 py-2 text-sm font-semibold text-[#486320] hover:bg-[#486320]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]"
              >
                {copy('Review this place', 'Suriin ang lugar na ito')}
              </a>
            </article>
          {/each}
        </div>
      </section>

      <section class="hidden min-w-0 sm:block" aria-labelledby="ledger-title">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#20251E]/20 pb-4">
          <div><h2 id="ledger-title" class="font-serif text-2xl font-bold tracking-[-0.02em] text-[#20251E]">{copy('Decision ledger', 'Talaan ng desisyon')}</h2><p class="mt-1 text-sm text-[#4A5245]">{copy('Each row measures the same detail across all selected outlets.', 'Pareho ang sinusukat ng bawat hanay sa lahat ng napiling outlet.')}</p></div>
          <p id="ledger-scroll-note" class="text-sm font-medium text-[#4E7380]">{copy('If needed, scroll within the ledger to see every outlet.', 'Kung kailangan, mag-scroll sa loob ng talaan para makita ang bawat outlet.')}</p>
        </div>
        <p class="mb-4 text-sm leading-5 text-[#596052]">
          {comparisonDistanceBasis === 'road'
            ? copy(
                'All selected places have road estimates, so distance is compared on the same road-distance basis.',
                'May road estimate ang lahat ng napiling lugar kaya pare-parehong layo sa kalsada ang ginagamit.',
              )
            : copy(
                'Distance uses straight-line values for every selected place so the comparison stays on one basis. These are not exact travel distances.',
                'Tuwid na layo ang gamit sa lahat ng napiling lugar para pare-pareho ang batayan. Hindi ito eksaktong haba ng biyahe.',
              )}
        </p>
        <div class="matrix-scroll max-w-full min-w-0 overflow-x-auto border-y border-[#20251E]/20 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]" tabindex="0" aria-describedby="ledger-scroll-note">
          <table class="w-full table-fixed border-separate border-spacing-0 text-left text-sm" style:min-width={`${220 + comparedOutlets.length * 255}px`}>
            <caption class="sr-only">{copy('Comparison ledger for selected outlets', 'Talaan ng paghahambing para sa mga napiling outlet')}</caption>
            <thead class="bg-[#FCECD8]"><tr class="align-top">
              <th scope="col" class="ledger-metric w-[220px] border-b border-r border-[#20251E]/20 bg-[#FCECD8] px-4 py-4 text-sm font-semibold text-[#20251E]">{copy('Decision fact', 'Batayan ng desisyon')}</th>
              {#each comparedOutlets as outlet (outlet.id)}
                <th scope="col" class="border-b border-r border-[#20251E]/15 px-4 py-4 last:border-r-0"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="font-serif text-lg font-bold leading-5 text-[#20251E]">{outlet.name}</p><p class="mt-2 text-sm font-medium text-[#4A5245]">{outlet.municipality}, Laguna · {outlet.category}</p></div><button type="button" onclick={() => handleRemove(outlet.id)} class="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[#4A5245] transition-colors hover:bg-[#20251E]/8 hover:text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]" aria-label={copy(`Remove ${outlet.name} from comparison`, `Alisin ang ${outlet.name} sa paghahambing`)}><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg></button></div></th>
              {/each}
            </tr></thead>
            <tbody>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Fit', 'Pagkakatugma')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}{@const transport = parsedTransport(outlet, recordedTransport)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 align-top"><p class="font-semibold text-[#20251E]">{isFil ? fit.statusLabelFil : fit.statusLabel}</p><p class="mt-1 text-sm leading-5 text-[#4A5245]">{isFil ? fit.reasonFil : fit.reason}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Accepted quantity', 'Kayang tanggapin')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 font-semibold tabular-nums text-[#20251E]">{formatKg(fit.acceptedKg)}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Remaining harvest', 'Natitirang ani')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 font-semibold tabular-nums text-[#20251E]">{formatKg(fit.remainingKg)}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Price evidence', 'Ebidensya ng presyo')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4"><p class="font-semibold tabular-nums text-[#20251E]">{priceLabel(fit.evidenceKind, fit.samplePricePerKg)}</p><p class="mt-1 text-xs text-[#4A5245]">{evidenceKindLabel(fit.evidenceKind)}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Gross amount', 'Kabuuang halaga')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 font-semibold tabular-nums text-[#20251E]">{formatPeso(fit.grossPay)}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Transport amount used', 'Halagang biyahe na gagamitin')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}{@const value = transportValue(outlet, recordedTransport)}<td class="px-4 py-4 align-top"><label class="mb-2 block font-semibold text-[#20251E]" for={`transport-${outlet.id}`}>{copy('Transport for', 'Biyahe para sa')} {outlet.name}</label><div class="relative max-w-[200px]"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#4A5245]">₱</span><input id={`transport-${outlet.id}`} type="number" min="0" step="50" inputmode="decimal" value={value} placeholder={copy('Not entered', 'Wala pang halaga')} oninput={(event) => handleTransportChange(outlet, recordedTransport, (event.currentTarget as HTMLInputElement).value)} class={`min-h-11 w-full rounded-lg border bg-[#FFFDF8] py-2 pl-7 pr-3 text-base font-semibold tabular-nums text-[#20251E] outline-none transition-shadow focus:ring-2 focus:ring-[#597928] ${hasTransportDraft(outlet.id) ? 'border-[#597928]' : 'border-[#20251E]/35'}`} /></div><p class="mt-2 text-sm leading-5 text-[#4A5245]">{transportProvenance(outlet, recordedTransport)}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('After transport amount', 'Matapos ang halagang biyahe')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}{@const transport = parsedTransport(outlet, recordedTransport)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}{@const afterTransport = transport === null ? null : fit.afterTransportPay}<td class="px-4 py-4"><p class="font-semibold tabular-nums text-[#20251E]">{formatPeso(afterTransport)}</p><p class="mt-1 text-xs leading-4 text-[#4A5245]">{transport === null ? copy('Enter transport to calculate.', 'Maglagay ng gastos upang makalkula.') : copy('Not profit or guaranteed income.', 'Hindi ito tubo o garantisadong kita.')}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Distance', 'Layo')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const distance = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}{@const route = getOutletRouteEstimate(harvest.originMunicipality, outlet.id, distance)}<td class="px-4 py-4"><p class="font-semibold tabular-nums text-[#20251E]">{distanceForBasis(route, comparisonDistanceBasis).toFixed(1)} km</p><p class="mt-1 text-xs text-[#4A5245]">{comparisonDistanceBasis === 'road'
  ? copy(
      `Road distance from ${originMun.name.split(',')[0]} municipality center · ~${route.roadDurationMinutes} min drive`,
      `Layo sa kalsada mula sa sentro ng ${originMun.name.split(',')[0]} · ~${route.roadDurationMinutes} min biyahe`,
    )
  : copy(
      `Straight-line from ${originMun.name.split(',')[0]} municipality center; used consistently across all selected places.`,
      `Tuwid na layo mula sa sentro ng ${originMun.name.split(',')[0]}; pare-pareho itong gamit sa lahat ng napiling lugar.`,
    )}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Source and freshness', 'Pinagmulan at kasariwaan')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4"><p class="font-semibold text-[#20251E]">{fit.sourceLabel || copy('Source unknown', 'Hindi alam ang pinagmulan')}</p><dl class="mt-2 grid gap-1 text-xs text-[#4A5245]"><div class="flex justify-between gap-3"><dt>{copy('Updated', 'Na-update')}</dt><dd class="tabular-nums text-right">{formatEvidenceDate(fit.dataUpdatedAt)}</dd></div><div class="flex justify-between gap-3"><dt>{copy('Valid until', 'May bisa hanggang')}</dt><dd class="tabular-nums text-right">{formatEvidenceDate(fit.dataValidUntil)}</dd></div></dl></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Confirm before travel', 'Kumpirmahin bago bumiyahe')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}{@const questions = isFil ? fit.conditionsToConfirmFil : fit.conditionsToConfirm}{@const unknowns = isFil ? fit.unknownsFil : fit.unknowns}<td class="px-4 py-4 align-top">{#if unknowns.length > 0}<p class="mb-2 text-xs font-semibold text-[#4E7380]">{copy('Still unknown:', 'Hindi pa alam:')} {unknowns.join(', ')}</p>{/if}{#if questions.length > 0}<ul class="space-y-1.5 text-xs leading-5 text-[#4A5245]">{#each questions as question}<li class="flex gap-2"><span aria-hidden="true" class="text-[#6E3511]">—</span><span>{question}</span></li>{/each}</ul>{:else}<p class="text-xs leading-5 text-[#4A5245]">{copy('No additional question is recorded. Confirm current terms before travel.', 'Walang nakatalang dagdag na tanong. Kumpirmahin pa rin ang kasalukuyang kondisyon bago bumiyahe.')}</p>{/if}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Review', 'Suriin')}</th>{#each comparedOutlets as outlet (outlet.id)}<td class="px-4 py-4"><a href={`/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}`} class="inline-flex min-h-[44px] items-center rounded-lg border border-[#597928]/35 px-3 py-2 text-xs font-semibold text-[#486320] transition-colors hover:bg-[#486320]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Review outlet', 'Suriin ang outlet')}</a></td>{/each}</tr>
            </tbody>
          </table>
        </div>
      </section>
      <p class="sr-only" aria-live="polite">{transportAnnouncement}</p>
      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#20251E]/15 pt-5"><a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="inline-flex min-h-[44px] items-center rounded-lg border border-[#20251E]/20 px-4 py-2 text-sm font-semibold text-[#20251E] transition-colors hover:bg-[#FCECD8]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Back to discovery', 'Bumalik sa paghahanap')}</a>{#if comparedOutlets.length < 3}<a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="inline-flex min-h-[44px] items-center rounded-lg bg-[#486320] px-4 py-2 text-sm font-semibold text-[#FFFDF8] transition-colors hover:bg-[#3A5219] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Add an outlet', 'Magdagdag ng outlet')}</a>{/if}</footer>
    {/if}
  </div>
</div>

<style>
  .comparison-page { width: 100%; min-width: 0; }
  .matrix-scroll { width: 100%; overscroll-behavior-inline: contain; -webkit-overflow-scrolling: touch; scrollbar-color: #597928 #FCECD8; scrollbar-width: thin; }
  .matrix-scroll::-webkit-scrollbar { height: 12px; }
  .matrix-scroll::-webkit-scrollbar-track { background: #FCECD8; }
  .matrix-scroll::-webkit-scrollbar-thumb { background: #597928; border: 3px solid #FCECD8; border-radius: 999px; }
  .ledger-metric { left: 0; position: sticky; z-index: 1; }
  thead .ledger-metric { z-index: 2; }
  .matrix-scroll tbody > tr > * { border-bottom: 1px solid rgb(32 37 30 / 12%); }
  .matrix-scroll tbody > tr > td:not(:last-child) { border-right: 1px solid rgb(32 37 30 / 10%); }
  .matrix-scroll tbody > tr:nth-child(7) > td { background: rgb(252 236 216 / 40%); }
  .matrix-scroll tbody > tr:nth-child(9) > td,
  .matrix-scroll tbody > tr:nth-child(10) > td { background: rgb(252 236 216 / 55%); }
  @media print {
    .matrix-scroll { overflow: visible; }
    .matrix-scroll table { min-width: 0 !important; }
    .ledger-metric { position: static; }
  }
</style>
