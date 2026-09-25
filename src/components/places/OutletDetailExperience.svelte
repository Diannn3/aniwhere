<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { subscribeHarvestContext } from '../../lib/ani/harvest-sync';
  import type { Outlet, HarvestQuery } from '../../lib/domain/types';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { getCropLabel } from '../../lib/domain/crops';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { isOutletSaved, toggleSavedOutlet } from '../../lib/state/saved-outlets';
  import { t } from '../../content/translations';
  import LiveLagunaMap from '../map/LiveLagunaMap.svelte';
  import { formatEstimatedDriveDuration } from '../../lib/routing/routing-matrix';
  import type { OutletRouteEstimate } from '../../lib/routing/routing-matrix';
  import { getImmediateOutletRoute, resolveOutletRoute } from '../../lib/routing/route-resolver';
  import { runtimeRouteCacheKey } from '../../lib/routing/runtime-route-cache';

  interface Props {
    outlet: Outlet;
    initialLang?: 'en' | 'fil';
  }

  const { outlet, initialLang = 'en' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let harvest = $state<HarvestQuery>({
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: todayInManila(),
  });

  let saved = $state(false);
  let showMessageModal = $state(false);
  let showContactModal = $state(false);
  let copiedMessage = $state(false);
  let copyMessageNotice = $state('');
  let messageTrigger: HTMLButtonElement | null = $state(null);
  let contactTrigger: HTMLButtonElement | null = $state(null);
  let messagePanel: HTMLDivElement | null = $state(null);
  let contactPanel: HTMLDivElement | null = $state(null);
  let messageCloseButton: HTMLButtonElement | null = $state(null);
  let contactCloseButton: HTMLButtonElement | null = $state(null);
  type RouteRequestState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'not_configured';
  let resolvedRoute = $state<OutletRouteEstimate | undefined>();
  let resolvedRouteKey = $state<string | undefined>();
  let routeRequestState = $state<RouteRequestState>('idle');
  let routeClientReady = $state(false);

  onMount(() => {
    saved = isOutletSaved(outlet.id);
    const parsed = parseDiscoverQuery(window.location.search);
    harvest = parsed.harvest;
    if (parsed.lang) {
      lang = parsed.lang;
    }
    routeClientReady = true;
  });

  onMount(() => subscribeHarvestContext((next) => {
    harvest = next;
  }));

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]
  );

  const distanceKm = $derived(
    calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)
  );

  const fitResult = $derived(evaluateFit(outlet, harvest));
  const immediateRoute = $derived(
    getImmediateOutletRoute(harvest.originMunicipality, outlet, distanceKm)
  );
  const routeResolutionKey = $derived(
    outlet.isLocalBagsakan
      ? runtimeRouteCacheKey(harvest.originMunicipality, outlet.lat, outlet.lng)
      : undefined
  );
  const routeEstimate = $derived(
    outlet.isLocalBagsakan &&
    resolvedRouteKey === routeResolutionKey &&
    resolvedRoute
      ? resolvedRoute
      : immediateRoute.route
  );
  const displayRouteRequestState = $derived<RouteRequestState>(
    !outlet.isLocalBagsakan
      ? 'idle'
      : resolvedRouteKey === routeResolutionKey
        ? routeRequestState
        : immediateRoute.state === 'cached'
          ? 'ready'
          : routeClientReady
            ? 'loading'
            : 'idle'
  );

  $effect(() => {
    if (!routeClientReady) return;
    const originId = harvest.originMunicipality;
    const straightLineDistanceKm = distanceKm;
    const key = outlet.isLocalBagsakan
      ? runtimeRouteCacheKey(originId, outlet.lat, outlet.lng)
      : undefined;
    const immediate = getImmediateOutletRoute(originId, outlet, straightLineDistanceKm);
    resolvedRouteKey = key;
    resolvedRoute = immediate.route;

    if (
      !outlet.isLocalBagsakan ||
      immediate.state === 'static' ||
      immediate.state === 'cached'
    ) {
      routeRequestState = immediate.route.source === 'road' ? 'ready' : 'idle';
      return;
    }

    routeRequestState = 'loading';
    const controller = new AbortController();
    void resolveOutletRoute(originId, outlet, straightLineDistanceKm, {
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted) return;
      resolvedRoute = result.route;
      routeRequestState =
        result.route.source === 'road'
          ? 'ready'
          : result.failureReason === 'not_configured'
            ? 'not_configured'
            : 'unavailable';
    });

    return () => controller.abort();
  });

  const isFil = $derived(lang === 'fil');
  const cropName = $derived(getCropLabel(harvest.crop, lang));
  const hasRecordedContact = $derived(Boolean(outlet.contactPhone || outlet.contactEmail));

  function handleToggleSave() {
    saved = toggleSavedOutlet(outlet.id);
  }

  async function openMessageDialog() {
    showMessageModal = true;
    await tick();
    messageCloseButton?.focus();
  }

  async function openContactDialog() {
    showContactModal = true;
    await tick();
    contactCloseButton?.focus();
  }

  function closeMessageDialog() {
    showMessageModal = false;
    requestAnimationFrame(() => messageTrigger?.focus());
  }

  function closeContactDialog() {
    showContactModal = false;
    requestAnimationFrame(() => contactTrigger?.focus());
  }

  function handleDialogKeydown(event: KeyboardEvent, panel: HTMLElement | null, close: () => void) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab' || !panel) return;

    const focusable = [...panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function formatEvidenceDate(value: string | null | undefined): string {
    if (!value) return isFil ? 'Hindi alam' : 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function handleCopyMessage() {
    copyMessageNotice = '';

    if (!navigator?.clipboard?.writeText) {
      copiedMessage = false;
      copyMessageNotice = isFil
        ? 'Hindi available ang automatic copy. Piliin ang mensahe at kopyahin ito nang manu-mano.'
        : 'Automatic copy is unavailable. Select the message and copy it manually.';
      return;
    }

    try {
      await navigator.clipboard.writeText(messageTemplate);
      copiedMessage = true;
      copyMessageNotice = isFil ? 'Nakopya ang mensahe.' : 'Message copied.';
      window.setTimeout(() => {
        copiedMessage = false;
      }, 2500);
    } catch {
      copiedMessage = false;
      copyMessageNotice = isFil
        ? 'Hindi nakopya ang mensahe. Piliin ang text at kopyahin ito nang manu-mano.'
        : 'The message could not be copied. Select the text and copy it manually.';
    }
  }

  const harvestDetailSummary = $derived(
    [
      harvest.details?.variety ? `${isFil ? 'barayti' : 'variety'}: ${harvest.details.variety}` : '',
      harvest.details?.grade ? `${isFil ? 'grade' : 'grade'}: ${harvest.details.grade}` : '',
      harvest.details?.packaging ? `${isFil ? 'packaging' : 'packaging'}: ${harvest.details.packaging}` : '',
    ]
      .filter(Boolean)
      .join(', ')
  );

  const priceLabel = $derived(
    outlet.isLocalBagsakan
      ? (isFil ? 'Presyo sa lokal na demo' : 'Local demo price')
      : fitResult.evidenceKind === 'demo'
      ? (isFil ? 'Presyo' : 'Price')
      : fitResult.evidenceKind === 'buyer_offer'
        ? (isFil ? 'Presyong naka-post ng buyer' : 'Buyer-posted price')
        : (isFil ? 'Presyo' : 'Price')
  );

  const priceQuestion = $derived(
    fitResult.evidenceKind === 'buyer_offer' && fitResult.samplePricePerKg !== null
      ? (isFil
          ? `Nais ko pong kumpirmahin kung tumatanggap pa po kayo sa naka-post na presyong ₱${fitResult.samplePricePerKg}/kg at ano ang grading at receiving schedule.`
          : `I would like to confirm whether you are currently accepting deliveries at the posted price of ₱${fitResult.samplePricePerKg}/kg and what the receiving schedule and grading requirements are.`)
      : (isFil
          ? 'Nais ko rin pong kumpirmahin ang kasalukuyang presyo, kapasidad, receiving schedule, at grading requirements.'
          : 'I would also like to confirm the current price, capacity, receiving schedule, and grading requirements.')
  );

  const messageTemplate = $derived(
    isFil
      ? `Magandang araw po. Mayroon po akong ${harvest.quantityKg} kg na ${cropName} na handang anihin sa ${harvest.readyDate} mula sa ${originMun.name}${harvestDetailSummary ? ` (${harvestDetailSummary})` : ''}. ${priceQuestion} Maraming salamat po.`
      : `Good day. I have ${harvest.quantityKg} kg of ${cropName} ready for harvest on ${harvest.readyDate} from ${originMun.name}${harvestDetailSummary ? ` (${harvestDetailSummary})` : ''}. ${priceQuestion} Thank you.`
  );

  const backUrl = $derived(
    `/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`
  );

  const compareUrl = $derived(
    `/compare?places=${encodeURIComponent(outlet.id)}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`
  );
</script>

<div class="almanac-page outlet-detail relative w-full max-w-none px-4 py-3 sm:px-8 sm:py-4 lg:px-12 xl:px-16">
  <!-- Back link -->
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#20251E]/10 pb-4">
    <div class="flex items-center gap-2 text-sm text-[#4A5245]">
      <a
        href={backUrl}
        class="inline-flex items-center gap-1.5 font-semibold text-[#486320] hover:text-[#435c1d] transition-colors py-1 px-2 rounded-lg hover:bg-[#486320]/10"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{isFil ? 'Bumalik sa resulta' : 'Back to discovery results'}</span>
      </a>
    </div>

    <!-- Right Controls: Save & Share -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleToggleSave}
        class={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[44px] ${
          saved
            ? 'bg-[#486320] text-white border-[#597928] shadow-sm'
            : 'bg-white text-[#20251E] border-[#20251E]/20 hover:border-[#597928]'
        }`}
        aria-label={saved ? 'Saved on this device' : 'Save outlet'}
      >
        <svg class="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span>{saved ? (isFil ? 'Nai-save' : 'Saved on device') : (isFil ? 'I-save ang lugar' : 'Save outlet')}</span>
      </button>

      <a
        href={compareUrl}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-[#20251E] border border-[#20251E]/20 hover:border-[#597928] transition-all min-h-[44px]"
      >
        <svg class="w-4 h-4 text-[#486320]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>{isFil ? 'Ihambing' : 'Compare'}</span>
      </a>
    </div>
  </div>

  {#if outlet.isLocalBagsakan}
    <p class="border border-[#6E3511]/25 bg-[#FCECD8]/55 px-4 py-3 text-sm leading-5 text-[#6E3511]">{isFil ? 'Demo bagsakan entry sa device na ito. Hindi ito live o beripikadong alok; kumpirmahin ang kapasidad, presyo, at oras bago bumiyahe.' : 'Demo Bagsakan entry on this device. This is not a live or verified offer; confirm capacity, price, and hours before travel.'}</p>
  {/if}

  <!-- Hero Facility Card (Anti-Vibecode: Direct H1, No Kicker) -->
  <header class="outlet-intro almanac-entry p-6 sm:p-8 space-y-6">
    <div class="flex flex-col gap-6">
      <div class="space-y-3 max-w-2xl">
        <!-- Direct H1 Header (No eyebrow pill above!) -->
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#20251E] tracking-tight">
          {outlet.name}
        </h1>

        <div class="flex flex-wrap items-center gap-3 text-sm text-[#4A5245]">
          <span class="inline-flex items-center gap-1 text-[#6E3511] font-semibold">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {outlet.municipality}, Laguna
          </span>
          <span class="text-[#20251E]/20">&bull;</span>
          <span class="capitalize font-medium text-[#20251E]">{outlet.category}</span>
          <span class="text-[#20251E]/20">&bull;</span>
          <span class="text-xs bg-[#486320]/10 text-[#486320] px-2.5 py-0.5 rounded-full font-medium">
            {routeEstimate.source === 'road'
              ? `${routeEstimate.roadDistanceKm?.toFixed(1)} km ${isFil ? 'sa kalsada' : 'by road'} · ${originMun.name.split(',')[0]} ${isFil ? 'sentro ng munisipyo' : 'municipality center'}`
              : `${distanceKm.toFixed(1)} km ${isFil ? 'tuwid na layo' : 'straight-line'} · ${originMun.name.split(',')[0]} ${isFil ? 'sentro ng munisipyo' : 'municipality center'}`}
          </span>
        </div>

        <p class="text-sm sm:text-base text-[#4A5245] leading-relaxed pt-1">
          {isFil ? outlet.descriptionFil : outlet.description}
        </p>
      </div>

      <!-- Fit Status Badge Card -->
      <div class="flex-shrink-0">
        <div
          class={`rounded-xl p-4 border flex flex-col gap-1.5 sm:min-w-[260px] ${
            fitResult.status === 'match'
              ? 'bg-[#486320]/8 border-[#597928]/25 text-[#20251E]'
              : fitResult.status === 'partial'
              ? 'bg-[#FCECD8]/50 border-[#6E3511]/25 text-[#20251E]'
              : fitResult.status === 'confirm'
              ? 'bg-[#4E7380]/10 border-[#4E7380]/25 text-[#20251E]'
              : 'bg-red-50/80 border-red-200 text-red-900'
          }`}
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold tracking-tight">
              {isFil ? fitResult.statusLabelFil : fitResult.statusLabel}
            </span>
          </div>
          <p class="text-xs text-[#4A5245] leading-relaxed">
            {isFil ? fitResult.reasonFil : fitResult.reason}
          </p>
        </div>
      </div>
    </div>

    <!-- Facility Attributes Tray -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#20251E]/8">
      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
        <div class="w-8 h-8 rounded-lg bg-[#486320]/10 text-[#486320] flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <div class="text-xs font-semibold text-[#20251E]">{isFil ? 'Uri ng Ebidensya' : 'Evidence Type'}</div>
          <div class="text-[11px] text-[#596052]">{fitResult.sourceLabel || (isFil ? 'Pinagmulan hindi alam' : 'Source unknown')}</div>
        </div>
      </div>

      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
        <div class="w-8 h-8 rounded-lg bg-[#6E3511]/10 text-[#6E3511] flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <div class="text-xs font-semibold text-[#20251E]">{isFil ? 'Huling Update' : 'Last Updated'}</div>
          <div class="text-[11px] text-[#596052]">{fitResult.dataUpdatedAt ? formatEvidenceDate(fitResult.dataUpdatedAt) : outlet.sampleOfferDate}</div>
        </div>
      </div>

      <div class="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/6">
        <div class="w-8 h-8 rounded-lg bg-[#4E7380]/10 text-[#4E7380] flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <div class="text-xs font-semibold text-[#20251E]">{isFil ? 'May Bisa Hanggang' : 'Valid Until'}</div>
          <div class="text-[11px] text-[#596052]">{fitResult.dataValidUntil ? formatEvidenceDate(fitResult.dataValidUntil) : (isFil ? 'Walang expiry na nakatala' : 'No expiry recorded')}</div>
        </div>
      </div>
    </div>
  </header>
    <!-- Right: Geographic Route Preview -->
    <section class="outlet-route bg-white rounded-2xl border border-[#20251E]/12 p-6 sm:p-8 shadow-sm space-y-5">
      <div class="flex items-center justify-between border-b border-[#20251E]/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#4E7380]/12 text-[#4E7380] flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 class="text-xl font-serif font-bold text-[#20251E]">
            {isFil ? 'Mapa at konteksto ng biyahe' : 'Map & travel context'}
          </h2>
        </div>

      </div>

      <div class="rounded-xl overflow-hidden border border-[#20251E]/10 bg-[#FAF7EE] relative">
        <LiveLagunaMap
          items={[{
            outlet,
            fit: fitResult,
            distanceKm
          }]}
          harvest={harvest}
          selectedId={outlet.id}
          lang={lang}
          onSelect={() => {}}
          routeOverride={routeEstimate}
          routeRequestState={displayRouteRequestState}
        />
      </div>

      <div class="grid gap-2 text-xs text-[#596052] pt-1 sm:grid-cols-3 sm:items-start">
        <span>
          {isFil ? 'Batayang lokasyon' : 'Reference point'}:
          <strong>{originMun.name.split(',')[0]}{isFil ? ' — sentro ng munisipyo' : ' municipality center'}</strong>
        </span>
        <span>
          {routeEstimate.source === 'road' ? (isFil ? 'Kalsada' : 'Road') : (isFil ? 'Tuwid na layo' : 'Straight-line')}:
          <strong>{routeEstimate.source === 'road' ? routeEstimate.roadDistanceKm?.toFixed(1) : distanceKm.toFixed(1)} km</strong>
          {#if routeEstimate.source === 'road'}
            <span class="block">{formatEstimatedDriveDuration(routeEstimate) ?? '—'} {isFil ? 'tinatayang biyahe' : 'estimated drive'}</span>
          {:else}
            <span class="block">
              {displayRouteRequestState === 'loading'
                ? (isFil ? 'Kinukuha ang rutang pangkalsada…' : 'Fetching road route…')
                : displayRouteRequestState === 'not_configured'
                  ? (isFil ? 'Hindi naka-configure ang live road routing.' : 'Live road routing is not configured.')
                  : displayRouteRequestState === 'unavailable'
                    ? (isFil ? 'Pansamantalang hindi available ang rutang pangkalsada.' : 'Road route is temporarily unavailable.')
                    : (isFil ? 'Walang rutang pangkalsada.' : 'Road route unavailable.')}
            </span>
          {/if}
        </span>
        <span>
          {isFil ? 'Destinasyon' : 'Destination'}:
          <strong>
            {outlet.isLocalBagsakan
              ? outlet.localLocationBasis === 'exact_pin'
                ? (isFil ? 'naka-save na eksaktong pin ng Bagsakan' : 'saved exact Bagsakan pin')
                : (isFil ? 'sentro ng ' + outlet.municipality : outlet.municipality + ' municipality center')
              : outlet.municipality}
          </strong>
        </span>
      </div>
      {#if routeEstimate.source === 'road'}
        <p class="mt-2 text-xs leading-5 text-[#596052]">
          {isFil
            ? 'Tantya ito ng OpenRouteService mula sa reference point ng munisipyo, hindi sa eksaktong bukid o live traffic ETA.'
            : 'This is an OpenRouteService estimate from the municipality reference point, not the exact farm or a live-traffic ETA.'}
        </p>
      {/if}
    </section>

  <!-- Decision Summary & Transparent Math Card -->
  <section class="outlet-decision almanac-entry p-6 sm:p-8 space-y-6">
    <div class="flex items-center justify-between gap-4 border-b border-[#20251E]/10 pb-4">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-[#486320]/12 text-[#486320] flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-serif font-bold text-[#20251E]">
          {isFil ? 'Buod ng Desisyon' : 'Decision Summary'}
        </h2>
      </div>

      <span class="text-xs text-[#596052] bg-[#FCECD8]/60 text-[#6E3511] font-semibold px-2.5 py-1 rounded-full">
        {harvest.quantityKg.toLocaleString('en-PH')} kg {cropName}
      </span>
    </div>

    <!-- 6-Metric Visual Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- 1. Your Produce -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#596052] uppercase tracking-wider">
          {isFil ? 'Ani Mo' : 'Your Produce'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#20251E]">{cropName}</div>
        <div class="text-[11px] text-[#596052]">{isFil ? 'Handa' : 'Ready'} {harvest.readyDate}</div>
      </div>

      <!-- 2. Accepted Quantity -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#596052] uppercase tracking-wider">
          {isFil ? 'Kayang Tanggapin' : 'Accepted'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#486320]">
          {fitResult.acceptedKg !== null
            ? `${fitResult.acceptedKg.toLocaleString('en-PH')} kg`
            : (isFil ? 'Kumpirmahin muna' : 'Confirm first')}
        </div>
        <div class="text-[11px] text-[#596052]">
          {fitResult.remainingKg === null
            ? (isFil ? 'Hindi pa alam ang matitirang ani' : 'Remaining harvest is not known yet')
            : fitResult.remainingKg > 0
              ? `${fitResult.remainingKg.toLocaleString('en-PH')} kg ${isFil ? 'ang matitira' : 'remaining'}`
              : (isFil ? 'Walang matitirang ani' : 'No harvest remaining')}
        </div>
      </div>

      <!-- 3. Price -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#596052] uppercase tracking-wider">
          {priceLabel}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#20251E]">
          {fitResult.samplePricePerKg !== null
            ? `₱${fitResult.samplePricePerKg}/kg`
            : (isFil ? 'Walang nakatalang presyo' : 'No price recorded')}
        </div>
        <div class="text-[11px] text-[#596052]">{fitResult.sourceLabel || (isFil ? 'Pinagmulan hindi alam' : 'Source unknown')}</div>
      </div>

      <!-- 4. Gross Subtotal -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#596052] uppercase tracking-wider">
          {isFil ? 'Kabuuang Halaga' : 'Gross Subtotal'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#20251E]">
          {fitResult.grossPay !== null
            ? `₱${fitResult.grossPay.toLocaleString('en-PH')}`
            : (isFil ? 'Hindi makalkula' : 'Not calculated')}
        </div>
        <div class="text-[11px] text-[#596052]">
          {fitResult.acceptedKg !== null && fitResult.samplePricePerKg !== null
            ? `${fitResult.acceptedKg.toLocaleString('en-PH')} kg × ₱${fitResult.samplePricePerKg}`
            : (isFil ? 'Kailangan muna ang dami at presyo' : 'Needs accepted quantity and price')}
        </div>
      </div>

      <!-- 5. Entered Transport -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#596052] uppercase tracking-wider">
          {isFil ? 'Nakatalaang Tantiya sa Biyahe' : 'Recorded Transport Estimate'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#6E3511]">
          {fitResult.enteredTransport !== null
            ? `-₱${fitResult.enteredTransport.toLocaleString('en-PH')}`
            : (isFil ? 'Walang nakatala' : 'Not recorded')}
        </div>
        <div class="text-[11px] text-[#596052]">
          {isFil ? 'Tinatayang gastos sa biyahe, hindi aktuwal na quote' : 'Recorded estimate, not an actual hauling quote'}
        </div>
      </div>

      <!-- 6. After Entered Transport -->
      <div class="p-3.5 rounded-xl bg-[#486320]/8 border border-[#597928]/30 space-y-1">
        <div class="text-[11px] font-semibold text-[#486320] uppercase tracking-wider">
          {isFil ? 'Matapos ang Nakatalaang Biyahe' : 'After Recorded Transport'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#486320]">
          {fitResult.afterTransportPay !== null
            ? `₱${fitResult.afterTransportPay.toLocaleString('en-PH')}`
            : (isFil ? 'Hindi makalkula' : 'Not calculated')}
        </div>
        <div class="text-[11px] text-[#4A5245]">{isFil ? 'Bago ang gastos sa bukid' : 'Before farm costs'}</div>
      </div>
    </div>

    <!-- Mandatory Honest Agricultural Commerce Notice -->
    <div class="rounded-xl p-3.5 bg-[#FFFDF8] border border-[#20251E]/10 flex items-start gap-3 text-xs text-[#4A5245]">
      <svg class="w-4 h-4 text-[#6E3511] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <span class="font-bold text-[#20251E]">{isFil ? 'Paalala:' : 'Notice:'}</span>
        {isFil
          ? ' Ang kalkulasyon ay gumagamit lamang ng nakatalang tantiya sa biyahe sa itaas. Hindi ito kita o garantisadong tubo.'
          : ' This arithmetic uses only the recorded transport estimate shown above. It is not profit or guaranteed income.'}
      </div>
    </div>
  </section>

  <!-- Two Column Layout: Requirements to Confirm & Geographic Corridor -->
  <div class="outlet-questions grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Left: Requirements in Question Form -->
    <section class="bg-white rounded-2xl border border-[#20251E]/12 p-6 sm:p-8 shadow-sm space-y-5">
      <div class="flex items-center gap-2.5 border-b border-[#20251E]/10 pb-4">
        <div class="w-8 h-8 rounded-lg bg-[#6E3511]/12 text-[#6E3511] flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 class="text-xl font-serif font-bold text-[#20251E]">
          {isFil ? 'Mga Katanungan Bago Bumiyahe' : 'Requirements to Confirm'}
        </h2>
      </div>

      {#if fitResult.unknowns.length > 0}
        <div class="rounded-xl p-3 bg-[#4E7380]/10 border border-[#4E7380]/20 text-xs text-[#2A4B56]">
          <strong>{isFil ? 'Hindi pa alam:' : 'Still unknown:'}</strong> {(isFil ? fitResult.unknownsFil : fitResult.unknowns).join(', ')}
        </div>
      {/if}

      <p class="text-xs text-[#596052]">
        {isFil
          ? 'Huwag bumiyahe nang hindi pa nakukumpirma ang mga sumusunod na tanong sa mamimili:'
          : 'Do not travel without confirming these key operational questions with the intake manager:'}
      </p>

      <ul class="space-y-3">
        <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 text-xs sm:text-sm text-[#20251E]">
          <span class="w-5 h-5 rounded-full bg-[#486320]/15 text-[#486320] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">?</span>
          <span>{isFil ? `Anong grade at antas ng pagkahinog ang kailangan ninyo para sa ${cropName}?` : `What grade and ripeness standard do you require for ${cropName}?`}</span>
        </li>
        <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 text-xs sm:text-sm text-[#20251E]">
          <span class="w-5 h-5 rounded-full bg-[#486320]/15 text-[#486320] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">?</span>
          <span>{isFil ? 'Anong packaging o uri ng crate ang kailangan sa delivery?' : 'What packaging or crate specification is required at delivery?'}</span>
        </li>
        <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 text-xs sm:text-sm text-[#20251E]">
          <span class="w-5 h-5 rounded-full bg-[#486320]/15 text-[#486320] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">?</span>
          <span>{isFil ? `Ano ang eksaktong oras ng pagtanggap at cutoff sa ${harvest.readyDate}?` : `What are the exact receiving hours and gate cutoffs on ${harvest.readyDate}?`}</span>
        </li>

        {#if fitResult.conditionsToConfirm && fitResult.conditionsToConfirm.length > 0}
          {#each isFil ? fitResult.conditionsToConfirmFil : fitResult.conditionsToConfirm as cond}
            <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FCECD8]/40 border border-[#6E3511]/15 text-xs sm:text-sm text-[#20251E]">
              <span class="w-5 h-5 rounded-full bg-[#6E3511]/15 text-[#6E3511] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">!</span>
              <span>{cond}</span>
            </li>
          {/each}
        {/if}
      </ul>
    </section>

  </div>

  <!-- Contact & Next Steps Action Dock -->
  <section class="outlet-actions almanac-entry p-6 sm:p-8 space-y-6">
    <div class="flex items-center gap-2.5 border-b border-[#20251E]/10 pb-4">
      <div class="w-8 h-8 rounded-lg bg-[#486320]/12 text-[#486320] flex items-center justify-center">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-serif font-bold text-[#20251E]">
          {isFil ? 'Pakikipag-ugnayan at Susunod na Hakbang' : 'Contact & Next Steps'}
        </h2>
        <p class="text-xs text-[#596052]">
          {isFil
            ? 'Kumpirmahin ang mga detalye bago bumiyahe. Maaaring magbago ang presyo at kapasidad.'
            : 'Confirm terms before travel. Availability, price, and requirements may change.'}
        </p>
      </div>
    </div>

    <!-- Action Buttons with Apple HIG min-h-[48px] -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- 1. Primary next step follows the deterministic fit state. -->
      {#if fitResult.status === 'no_match'}
        <a
          href={backUrl}
          class="w-full min-h-[48px] px-5 py-3 rounded-full bg-[#486320] text-white font-semibold text-sm hover:bg-[#47621f] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>{isFil ? 'Tingnan ang ibang mapagbebentahan' : 'Check other selling options'}</span>
        </a>
      {:else}
        <button
          bind:this={messageTrigger}
          type="button"
          onclick={openMessageDialog}
          class="w-full min-h-[48px] px-5 py-3 rounded-full bg-[#486320] text-white font-semibold text-sm hover:bg-[#47621f] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span>{isFil ? 'Ihanda ang mensahe' : 'Prepare message'}</span>
        </button>
      {/if}

      <!-- 2. Public Contact Details -->
      <button
        bind:this={contactTrigger}
        type="button"
        onclick={openContactDialog}
        class="w-full min-h-[48px] px-5 py-3 rounded-full bg-white border border-[#20251E]/20 text-[#20251E] font-semibold text-sm hover:bg-[#FFFDF8] hover:border-[#597928] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4 text-[#486320]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span>
          {hasRecordedContact
            ? (isFil ? 'Detalye ng kontak' : 'Contact details')
            : (isFil ? 'Walang nakatalang kontak' : 'No recorded contact')}
        </span>
      </button>

      <!-- 3. Compare Options -->
      <a
        href={compareUrl}
        class="w-full min-h-[48px] px-5 py-3 rounded-full bg-white border border-[#20251E]/20 text-[#20251E] font-semibold text-sm hover:bg-[#FFFDF8] hover:border-[#597928] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4 text-[#6E3511]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>{isFil ? 'Paghambingin ang mga opsyon' : 'Compare options'}</span>
      </a>
    </div>

    <!-- Provenance / Timestamp Attribution Footer -->
    <div class="pt-4 border-t border-[#20251E]/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#596052]">
      <div>
        {isFil ? 'Pinagmulan' : 'Source'}:
        <span class="font-medium text-[#20251E]">{fitResult.sourceLabel || (isFil ? 'Hindi alam' : 'Source unknown')} &bull; {outlet.sampleOfferDate}</span>
      </div>
    </div>
  </section>
</div>

<!-- Modal: Prepare Message -->
{#if showMessageModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20251E]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="prepare-message-title">
    <div bind:this={messagePanel} onkeydown={(event) => handleDialogKeydown(event, messagePanel, closeMessageDialog)} class="bg-white rounded-2xl border border-[#20251E]/15 max-w-lg w-full p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-[#20251E]/10 pb-3">
        <h3 id="prepare-message-title" class="text-lg font-serif font-bold text-[#20251E]">
          {isFil ? 'Ihanda ang Mensahe sa Mamimili' : 'Prepare Inquiry Message'}
        </h3>
        <button
          bind:this={messageCloseButton}
          type="button"
          onclick={closeMessageDialog}
          class="w-11 h-11 rounded-full flex items-center justify-center text-[#4A5245] hover:bg-[#20251E]/10"
          aria-label={isFil ? 'Isara' : 'Close'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="text-xs text-[#4A5245]">
        {outlet.isLocalBagsakan
          ? (isFil ? 'Demo template lamang ito. Walang live contact channel para sa lokal na Bagsakan entry.' : 'This is a demo template only. The local Bagsakan entry has no live contact channel.')
          : isFil
          ? 'Maaari mong kopyahin ang template na ito para i-text o ipadala sa intake coordinator bago ibiyahe ang ani:'
          : 'Copy this ready-made template to text or message the intake coordinator before hauling:'}
      </p>

      <div class="p-4 rounded-xl bg-[#FAF7EE] border border-[#20251E]/10 text-xs sm:text-sm text-[#20251E] leading-relaxed font-sans select-all whitespace-pre-wrap">
        {messageTemplate}
      </div>

      <div class="rounded-xl p-3 bg-[#FCECD8]/60 border border-[#6E3511]/15 text-[11px] text-[#6E3511]">
        <strong>{isFil ? 'Paalala:' : 'Notice:'}</strong>
        {isFil
          ? ' Hindi awtomatikong nagpapadala ng SMS ang AniWhere. Kopyahin ang mensahe at ipadala mo mismo kung may beripikadong contact.'
          : ' AniWhere does not send automated SMS. Copy the message and send it yourself only when you have a verified contact.'}
      </div>

      {#if copyMessageNotice}
        <p class="text-xs text-[#4A5245]" role="status" aria-live="polite">{copyMessageNotice}</p>
      {/if}

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onclick={closeMessageDialog}
          class="px-4 py-2 rounded-full text-xs font-semibold text-[#4A5245] hover:bg-[#20251E]/5 min-h-[44px]"
        >
          {isFil ? 'Isara' : 'Close'}
        </button>

        <button
          type="button"
          onclick={handleCopyMessage}
          class="px-5 py-2.5 rounded-full text-xs font-bold bg-[#486320] text-white hover:bg-[#435c1d] transition-all flex items-center gap-1.5 min-h-[44px]"
        >
          {#if copiedMessage}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{isFil ? 'Nakopya na!' : 'Copied to clipboard!'}</span>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{isFil ? 'Kopyahin ang mensahe' : 'Copy message'}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Public Contact Details -->
{#if showContactModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20251E]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="contact-details-title">
    <div bind:this={contactPanel} onkeydown={(event) => handleDialogKeydown(event, contactPanel, closeContactDialog)} class="bg-white rounded-2xl border border-[#20251E]/15 max-w-md w-full p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-[#20251E]/10 pb-3">
        <h3 id="contact-details-title" class="text-lg font-serif font-bold text-[#20251E]">
          {outlet.name}
        </h3>
        <button
          bind:this={contactCloseButton}
          type="button"
          onclick={closeContactDialog}
          class="w-11 h-11 rounded-full flex items-center justify-center text-[#4A5245] hover:bg-[#20251E]/10"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3 text-xs sm:text-sm text-[#20251E]">
        <div class="p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
          <div class="text-[11px] font-semibold text-[#596052] uppercase">
            {isFil ? 'Lokasyon ng tala' : 'Recorded location'}
          </div>
          <div class="font-bold">{outlet.municipality}, Laguna</div>
          <div class="text-[11px] text-[#596052]">
            {isFil
              ? 'Walang operating hours na ipinapalagay kung hindi ito beripikado.'
              : 'No operating hours are inferred unless they are verified.'}
          </div>
        </div>

        {#if hasRecordedContact}
          <div class="p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-2">
            <div class="text-[11px] font-semibold text-[#596052] uppercase">
              {isFil ? 'Nakatala na contact field' : 'Recorded contact field'}
            </div>
            {#if outlet.contactPhone}
              <div class="font-mono text-xs text-[#20251E]">{outlet.contactPhone}</div>
            {/if}
            {#if outlet.contactEmail}
              <div class="text-xs text-[#20251E]">{outlet.contactEmail}</div>
            {/if}
            <p class="text-[11px] leading-relaxed text-[#6E3511]">
              {isFil
                ? 'Hindi beripikadong contact. Kumpirmahin bago tumawag o mag-message.'
                : 'Unverified contact. Verify before calling or messaging.'}
            </p>
          </div>
        {:else}
          <div class="p-3 rounded-xl bg-[#4E7380]/8 border border-[#4E7380]/18 text-xs text-[#2A4B56]">
            {isFil
              ? 'Walang nakatalang phone o email para sa record na ito. Hindi gumagawa ang AniWhere ng imbentong contact details.'
              : 'No phone or email is recorded for this entry. AniWhere does not substitute invented contact details.'}
          </div>
        {/if}

        <div class="rounded-xl p-3 bg-[#FCECD8]/60 border border-[#6E3511]/15 text-[11px] text-[#6E3511]">
          <strong>{isFil ? 'Paalala:' : 'Notice:'}</strong>
          {isFil
            ? 'Hindi gumagawa ang AniWhere ng tawag, reserbasyon, o transaksyon.'
            : 'AniWhere does not place calls, reserve capacity, or complete transactions.'}
        </div>
      </div>

      <div class="flex items-center justify-end pt-2">
        <button
          type="button"
          onclick={closeContactDialog}
          class="px-5 py-2.5 rounded-full text-xs font-bold bg-[#486320] text-white hover:bg-[#435c1d] transition-all min-h-[44px]"
        >
          {isFil ? 'Tapos' : 'Done'}
        </button>
      </div>
    </div>
  </div>
{/if}
<style>
  .outlet-detail {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
    background: #fffdf8;
    color: #20251e;
    width: 100%;
    max-width: none;
    margin-inline: 0;
  }
  .outlet-detail > :first-child,
  .outlet-decision,
  .outlet-questions,
  .outlet-actions { grid-column: 1 / -1; }
  .outlet-intro, .outlet-route, .outlet-decision, .outlet-actions,
  .outlet-questions > section {
    border: 1px solid rgb(32 37 30 / 18%);
    border-radius: 12px;
    background: #fffdf8;
    box-shadow: none;
  }
  .outlet-route { min-width: 0; padding: 1rem; }
  .outlet-route > div:nth-child(2) { border-radius: 4px; }
  .outlet-route > div:last-child {
    border-top: 1px solid rgb(32 37 30 / 18%);
    padding: 1rem .25rem .25rem;
    line-height: 1.5;
  }
  .outlet-route strong { display: block; color: #20251e; font-variant-numeric: tabular-nums; }
  .outlet-intro > div:last-child {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
  }
  .outlet-intro > div:last-child > div {
    align-items: flex-start;
    padding: .75rem;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .outlet-intro > div:last-child > div + div { border-left: 1px solid rgb(32 37 30 / 14%); }
  .outlet-decision > div:nth-child(2) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border-block: 1px solid rgb(32 37 30 / 18%); }
  .outlet-decision > div:nth-child(2) > div {
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 1rem;
    border-bottom: 1px solid rgb(32 37 30 / 12%);
  }
  .outlet-decision > div:nth-child(2) > div:last-child { background: #eaf3de; }
  .outlet-questions { display: block; }
  .outlet-questions li { border-radius: 4px; }
  .outlet-detail h1, .outlet-detail h2 { font-family: 'Outfit Variable', Outfit, system-ui, sans-serif; letter-spacing: -.025em; }
  .outlet-detail h1 { font-size: clamp(1.875rem, 3vw, 2.75rem); line-height: 1.12; }
  .outlet-detail :is(button, a):focus-visible { outline: 3px solid #486320; outline-offset: 3px; }
  .outlet-detail :is(button, a) { border-radius: 8px; }
  .outlet-detail ::selection { background: #d9e8c5; color: #20251e; }
  @media (min-width: 1024px) {
    .outlet-detail { grid-template-columns: minmax(20rem, 1fr) minmax(0, 1.55fr); gap: 1.25rem; }
    .outlet-intro { grid-column: 1; grid-row: 2; }
    .outlet-route { grid-column: 2; grid-row: 2; }
    .outlet-actions { grid-row: 3; }
    .outlet-decision { grid-row: 4; }
    .outlet-questions { grid-row: 5; }
    .outlet-decision > div:nth-child(2) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .outlet-decision > div:nth-child(2) > div:not(:nth-child(3n)) { border-right: 1px solid rgb(32 37 30 / 12%); }
  }
  @media (max-width: 1023px) {
    .outlet-route { grid-row: 3; }
    .outlet-actions { grid-row: 4; }
    .outlet-decision { grid-row: 5; }
    .outlet-questions { grid-row: 6; }
  }
  @media (max-width: 639px) {
    .outlet-detail { gap: 1rem; padding-inline: 1rem; }
    .outlet-intro, .outlet-decision, .outlet-actions, .outlet-questions > section { padding: 1rem; }
    .outlet-intro > div:last-child { grid-template-columns: 1fr; }
    .outlet-intro > div:last-child > div { padding: .5rem 0; }
    .outlet-intro > div:last-child > div + div { border-left: 0; border-top: 1px solid rgb(32 37 30 / 14%); }
    .outlet-route > div:first-child > span { display: none; }
    .outlet-route > div:last-child { grid-template-columns: 1fr; }
  }
</style>
