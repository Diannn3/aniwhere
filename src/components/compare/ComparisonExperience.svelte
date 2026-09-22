<script lang="ts">
  import { onMount } from 'svelte';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';
  import { subscribeTransportUpdate } from '../../lib/ani/ui-sync';
  import { CURRENT_OUTLETS } from '../../lib/data/current-market';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { getOutletRouteEstimate } from '../../lib/routing/routing-matrix';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { safeStorage } from '../../lib/state/storage';
  import type { FitStatus, HarvestQuery, Outlet } from '../../lib/domain/types';
  import { t } from '../../content/translations';

  interface Props {
    initialLang?: 'en' | 'fil';
    initialPlaceIds?: string[];
  }

  const { initialLang = 'en', initialPlaceIds = [] } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let selectedIds = $state<string[]>(initialPlaceIds.slice(0, 3));
  let harvest = $state<HarvestQuery>({ crop: 'tomato', quantityKg: 300, originMunicipality: 'los-banos', readyDate: todayInManila() });
  let transportDrafts = $state<Record<string, string>>({});
  let transportAnnouncement = $state('');

  onMount(() => {
    const parsed = parseDiscoverQuery(window.location.search);
    harvest = parsed.harvest;
    lang = parsed.lang || lang;
    const places = new URLSearchParams(window.location.search).get('places');
    if (places !== null) {
      selectedIds = places.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 3);
      return;
    }
    const stored = safeStorage.getItem<string[]>('aniwhere_compare_ids', []);
    selectedIds = stored.slice(0, 3);
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
  const originMun = $derived(LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]);
  const comparedOutlets = $derived(selectedIds.map((id) => CURRENT_OUTLETS.find((o) => o.id === id || o.slug === id)).filter((o): o is Outlet => Boolean(o)).slice(0, 3));

  function copy(en: string, fil: string) { return isFil ? fil : en; }
  function formatPeso(value: number | null) { return value === null ? copy('Not calculated', 'Hindi nakalkula') : `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 2 })}`; }
  function formatKg(value: number | null) { return value === null ? copy('Confirm', 'Kumpirmahin') : `${value.toLocaleString('en-PH')} kg`; }
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
  }
</script>

<div class="comparison-page mx-auto max-w-7xl min-w-0 px-4 py-8 sm:px-6 md:py-12 lg:px-8">
  <div class="space-y-7">
    <header class="grid gap-5 border-b border-[#20251E]/15 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div class="max-w-3xl">
        <h1 class="font-serif text-3xl font-bold tracking-[-0.02em] text-[#20251E] sm:text-4xl">{copy('Compare options for your harvest', 'Paghambingin ang mga opsyon para sa ani mo')}</h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-[#4A5245] sm:text-base">{copy('Read the same decision facts across each outlet. AniWhere does not rank or guarantee an option.', 'Basahin ang parehong impormasyon sa bawat outlet. Hindi nagraranggo o naggagarantiya ang AniWhere ng anumang opsyon.')}</p>
      </div>
      <a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#597928]/35 bg-[#FFFDF8] px-4 py-2 text-sm font-semibold text-[#486320] transition-colors hover:bg-[#486320]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Edit harvest context', 'Baguhin ang konteksto ng ani')}</a>
    </header>

    <section aria-label={copy('Harvest context', 'Konteksto ng ani')} class="grid gap-px overflow-hidden rounded-xl border border-[#20251E]/15 bg-[#20251E]/15 sm:grid-cols-4">
      <div class="bg-[#FFFDF8] px-4 py-3"><p class="text-xs font-semibold text-[#596052]">{copy('Harvest', 'Ani')}</p><p class="mt-1 font-semibold capitalize text-[#20251E]">{harvest.crop}</p></div>
      <div class="bg-[#FFFDF8] px-4 py-3"><p class="text-xs font-semibold text-[#596052]">{copy('Quantity', 'Dami')}</p><p class="mt-1 font-semibold tabular-nums text-[#20251E]">{harvest.quantityKg.toLocaleString('en-PH')} kg</p></div>
      <div class="bg-[#FFFDF8] px-4 py-3"><p class="text-xs font-semibold text-[#596052]">{copy('From', 'Mula sa')}</p><p class="mt-1 font-semibold text-[#20251E]">{originMun.name}</p></div>
      <div class="bg-[#FFFDF8] px-4 py-3"><p class="text-xs font-semibold text-[#596052]">{copy('Ready date', 'Petsa ng ani')}</p><p class="mt-1 font-semibold tabular-nums text-[#20251E]">{harvest.readyDate}</p></div>
    </section>

    <aside class="grid gap-3 rounded-xl border border-[#6E3511]/20 bg-[#FCECD8] p-4 text-sm text-[#4A5245] sm:grid-cols-[auto_1fr] sm:items-start" aria-label={copy('Calculation note', 'Paalala sa kalkulasyon')}>
      <svg class="mt-0.5 h-5 w-5 text-[#6E3511]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <div><p class="font-semibold text-[#20251E]">{copy('Demo — sample data', 'Demo — halimbawang datos')}</p><p class="mt-1 leading-5">{t('afterTransportNote', lang)}</p><p class="mt-1 text-xs leading-5 text-[#4A5245]">{copy('Edit only your transport amount below. A missing transport amount keeps the after-transport figure uncalculated.', 'I-edit lamang ang gastos mo sa biyahe sa ibaba. Kapag walang inilagay na gastos, hindi kakalkulahin ang matapos ang biyahe.')}</p></div>
    </aside>

    {#if comparedOutlets.length === 0}
      <section class="mx-auto max-w-2xl rounded-2xl border border-[#20251E]/15 bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(32,37,30,0.05)]">
        <h2 class="font-serif text-2xl font-bold text-[#20251E]">{copy('No outlets selected', 'Walang napiling outlet')}</h2>
        <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-[#4A5245]">{copy('Select up to three outlets from discovery to compare the same details side by side.', 'Pumili ng hanggang tatlong outlet mula sa paghahanap upang maihambing ang parehong detalye nang magkatabi.')}</p>
        <a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-[#486320] px-5 py-2.5 text-sm font-semibold text-[#FFFDF8] transition-colors hover:bg-[#3A5219] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Find selling options', 'Maghanap ng mapagbebentahan')}</a>
      </section>
    {:else}
      <section aria-labelledby="ledger-title">
        <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><h2 id="ledger-title" class="font-serif text-2xl font-bold tracking-[-0.02em] text-[#20251E]">{copy('Decision ledger', 'Talaan ng desisyon')}</h2><p class="mt-1 text-sm text-[#4A5245]">{copy('Each row measures the same detail across all selected outlets.', 'Pareho ang sinusukat ng bawat hanay sa lahat ng napiling outlet.')}</p></div>
          <p id="ledger-scroll-note" class="text-xs font-medium text-[#4E7380]">{copy('On a phone, scroll the table sideways to compare.', 'Sa phone, i-scroll nang pakaliwa o pakanan ang talaan upang maghambing.')}</p>
        </div>
        <div class="matrix-scroll max-w-full min-w-0 overflow-x-auto rounded-xl border border-[#20251E]/15 bg-white shadow-[0_1px_3px_rgba(32,37,30,0.05)]" tabindex="0" aria-describedby="ledger-scroll-note">
          <table class="w-full min-w-[900px] border-collapse text-left text-sm">
            <caption class="sr-only">{copy('Comparison ledger for selected outlets', 'Talaan ng paghahambing para sa mga napiling outlet')}</caption>
            <thead class="bg-[#FCECD8]/70"><tr class="align-top">
              <th scope="col" class="ledger-metric w-[190px] border-b border-r border-[#20251E]/15 bg-[#FCECD8] px-4 py-4 text-xs font-bold uppercase tracking-[0.08em] text-[#4A5245]">{copy('Metric', 'Sukatan')}</th>
              {#each comparedOutlets as outlet (outlet.id)}
                <th scope="col" class="min-w-[235px] border-b border-[#20251E]/15 px-4 py-4"><div class="flex items-start justify-between gap-3"><div><p class="font-serif text-lg font-bold leading-5 text-[#20251E]">{outlet.name}</p><p class="mt-1 text-xs font-medium text-[#4A5245]">{outlet.municipality}, Laguna · {outlet.category}</p></div><button type="button" onclick={() => handleRemove(outlet.id)} class="-mr-2 -mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#4A5245] transition-colors hover:bg-[#20251E]/8 hover:text-[#20251E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]" aria-label={copy(`Remove ${outlet.name} from comparison`, `Alisin ang ${outlet.name} sa paghahambing`)}><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" /></svg></button></div></th>
              {/each}
            </tr></thead>
            <tbody class="divide-y divide-[#20251E]/12">
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Fit', 'Pagkakatugma')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}{@const transport = parsedTransport(outlet, recordedTransport)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 align-top"><div class={`rounded-lg border px-3 py-2.5 ${fitTone(fit.status)}`}><p class="font-semibold">{isFil ? fit.statusLabelFil : fit.statusLabel}</p><p class="mt-1 text-xs leading-5 text-[#4A5245]">{isFil ? fit.reasonFil : fit.reason}</p></div></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Accepted quantity', 'Kayang tanggapin')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 font-semibold tabular-nums text-[#20251E]">{formatKg(fit.acceptedKg)}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Remaining harvest', 'Natitirang ani')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 font-semibold tabular-nums text-[#20251E]">{formatKg(fit.remainingKg)}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Price evidence', 'Ebidensya ng presyo')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4"><p class="font-semibold tabular-nums text-[#20251E]">{priceLabel(fit.evidenceKind, fit.samplePricePerKg)}</p><p class="mt-1 text-xs text-[#4A5245]">{evidenceKindLabel(fit.evidenceKind)}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Gross amount', 'Kabuuang halaga')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4 font-semibold tabular-nums text-[#20251E]">{formatPeso(fit.grossPay)}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Entered transport', 'Inilagay na gastos sa biyahe')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}{@const value = transportValue(outlet, recordedTransport)}<td class="px-4 py-4 align-top"><label class="sr-only" for={`transport-${outlet.id}`}>{copy(`Transport for ${outlet.name}`, `Gastos sa biyahe para sa ${outlet.name}`)}</label><div class="relative max-w-[170px]"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#4A5245]">₱</span><input id={`transport-${outlet.id}`} type="number" min="0" step="50" inputmode="decimal" value={value} placeholder={copy('Not entered', 'Wala pang halaga')} oninput={(event) => handleTransportChange(outlet, recordedTransport, (event.currentTarget as HTMLInputElement).value)} class={`min-h-[44px] w-full rounded-lg border bg-white py-2 pl-7 pr-3 font-semibold tabular-nums text-[#20251E] outline-none transition-shadow focus:ring-2 focus:ring-[#597928] ${hasTransportDraft(outlet.id) ? 'border-[#597928]' : 'border-[#20251E]/20'}`} /></div><p class="mt-1.5 text-xs leading-4 text-[#4A5245]">{transportProvenance(outlet, recordedTransport)}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('After entered transport', 'Matapos ang inilagay na biyahe')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const recordedTransport = outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null}{@const transport = parsedTransport(outlet, recordedTransport)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}{@const afterTransport = transport === null ? null : fit.afterTransportPay}<td class="px-4 py-4"><p class="font-semibold tabular-nums text-[#20251E]">{formatPeso(afterTransport)}</p><p class="mt-1 text-xs leading-4 text-[#4A5245]">{transport === null ? copy('Enter transport to calculate.', 'Maglagay ng gastos upang makalkula.') : copy('Not profit or guaranteed income.', 'Hindi ito tubo o garantisadong kita.')}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Distance', 'Layo')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const distance = calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)}{@const route = getOutletRouteEstimate(harvest.originMunicipality, outlet.id, distance)}<td class="px-4 py-4"><p class="font-semibold tabular-nums text-[#20251E]">{route.source === 'road' ? route.roadDistanceKm?.toFixed(1) : distance.toFixed(1)} km</p><p class="mt-1 text-xs text-[#4A5245]">{route.source === 'road'
  ? copy(
      `Road estimate from ${originMun.name} municipality center · ~${route.roadDurationMinutes} min drive`,
      `Tantya mula sa sentro ng ${originMun.name} · ~${route.roadDurationMinutes} min biyahe`,
    )
  : copy(
      `Straight-line from ${originMun.name} municipality center; road route unavailable.`,
      `Tuwid na layo mula sa sentro ng ${originMun.name}; walang rutang pangkalsada.`,
    )}</p></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Source and freshness', 'Pinagmulan at kasariwaan')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}<td class="px-4 py-4"><p class="font-semibold text-[#20251E]">{fit.sourceLabel || copy('Source unknown', 'Hindi alam ang pinagmulan')}</p><dl class="mt-2 grid gap-1 text-xs text-[#4A5245]"><div class="flex justify-between gap-3"><dt>{copy('Updated', 'Na-update')}</dt><dd class="tabular-nums text-right">{formatEvidenceDate(fit.dataUpdatedAt)}</dd></div><div class="flex justify-between gap-3"><dt>{copy('Valid until', 'May bisa hanggang')}</dt><dd class="tabular-nums text-right">{formatEvidenceDate(fit.dataValidUntil)}</dd></div></dl></td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Confirm before travel', 'Kumpirmahin bago bumiyahe')}</th>{#each comparedOutlets as outlet (outlet.id)}{@const transport = parsedTransport(outlet, outlet.acceptedCrops[harvest.crop]?.defaultTransportExpense ?? null)}{@const fit = evaluateFit(outlet, harvest, transport ?? undefined)}{@const questions = isFil ? fit.conditionsToConfirmFil : fit.conditionsToConfirm}{@const unknowns = isFil ? fit.unknownsFil : fit.unknowns}<td class="px-4 py-4 align-top">{#if unknowns.length > 0}<p class="mb-2 text-xs font-semibold text-[#4E7380]">{copy('Still unknown:', 'Hindi pa alam:')} {unknowns.join(', ')}</p>{/if}{#if questions.length > 0}<ul class="space-y-1.5 text-xs leading-5 text-[#4A5245]">{#each questions as question}<li class="flex gap-2"><span aria-hidden="true" class="text-[#6E3511]">—</span><span>{question}</span></li>{/each}</ul>{:else}<p class="text-xs leading-5 text-[#4A5245]">{copy('No additional question is recorded. Confirm current terms before travel.', 'Walang nakatalang dagdag na tanong. Kumpirmahin pa rin ang kasalukuyang kondisyon bago bumiyahe.')}</p>{/if}</td>{/each}</tr>
              <tr><th scope="row" class="ledger-metric border-r border-[#20251E]/12 bg-[#FFFDF8] px-4 py-4 font-semibold text-[#20251E]">{copy('Review', 'Suriin')}</th>{#each comparedOutlets as outlet (outlet.id)}<td class="px-4 py-4"><a href={`/places/${outlet.slug}?${serializeDiscoverQuery(harvest, 'list', outlet.id, lang)}`} class="inline-flex min-h-[44px] items-center rounded-lg border border-[#597928]/35 px-3 py-2 text-xs font-semibold text-[#486320] transition-colors hover:bg-[#486320]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Review outlet', 'Suriin ang outlet')}</a></td>{/each}</tr>
            </tbody>
          </table>
        </div>
        <p class="sr-only" aria-live="polite">{transportAnnouncement}</p>
      </section>
      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#20251E]/15 pt-5"><a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="inline-flex min-h-[44px] items-center rounded-lg border border-[#20251E]/20 px-4 py-2 text-sm font-semibold text-[#20251E] transition-colors hover:bg-[#FCECD8]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Back to discovery', 'Bumalik sa paghahanap')}</a>{#if comparedOutlets.length < 3}<a href={`/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`} class="inline-flex min-h-[44px] items-center rounded-lg bg-[#486320] px-4 py-2 text-sm font-semibold text-[#FFFDF8] transition-colors hover:bg-[#3A5219] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{copy('Add an outlet', 'Magdagdag ng outlet')}</a>{/if}</footer>
    {/if}
  </div>
</div>

<style>
  .comparison-page { width: 100%; max-width: 100vw; min-width: 0; overflow-x: hidden; }
  .matrix-scroll { width: 100%; overscroll-behavior-inline: contain; -webkit-overflow-scrolling: touch; scrollbar-color: #91AC67 #FCECD8; scrollbar-width: thin; }
  .matrix-scroll::-webkit-scrollbar { height: 12px; }
  .matrix-scroll::-webkit-scrollbar-track { background: #FCECD8; }
  .matrix-scroll::-webkit-scrollbar-thumb { background: #597928; border: 3px solid #FCECD8; border-radius: 999px; }
  .ledger-metric { left: 0; position: sticky; z-index: 1; }
  thead .ledger-metric { z-index: 2; }
  @media print { .matrix-scroll { overflow: visible; } .ledger-metric { position: static; } }
</style>
