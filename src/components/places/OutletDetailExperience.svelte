<script lang="ts">
  import { onMount } from 'svelte';
  import type { Outlet, HarvestQuery } from '../../lib/domain/types';
  import { evaluateFit } from '../../lib/domain/match';
  import { calculateStraightLineDistanceKm } from '../../lib/domain/distance';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { getCropLabel } from '../../lib/domain/crops';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { isOutletSaved, toggleSavedOutlet } from '../../lib/state/saved-outlets';
  import { t, outletCategoryLabel, evidenceLabel } from '../../content/translations';
  import ResilientLagunaMap from '../map/ResilientLagunaMap.svelte';

  interface Props {
    outlet: Outlet;
    initialLang?: 'en' | 'fil';
  }

  const { outlet, initialLang = 'fil' } = $props();

  let lang = $state<'en' | 'fil'>(initialLang);
  let harvest = $state<HarvestQuery>({
    crop: 'tomato',
    quantityKg: 300,
    originMunicipality: 'los-banos',
    readyDate: todayInManila(),
  });
  const historicalHarvest = $derived(Boolean(harvest.readyDate && harvest.readyDate < todayInManila()));

  let saved = $state(false);
  let showMessageModal = $state(false);
  let showContactModal = $state(false);
  let copiedMessage = $state(false);
  let copyError = $state(false);
  let saveError = $state(false);
  let dialogTrigger: HTMLElement | null = null;
  let activeDialog: HTMLElement | null = $state(null);
  let comparedIds = $state<string[]>([]);
  let queryIssues = $state<string[]>([]);

  onMount(() => {
    saved = isOutletSaved(outlet.id);
    const parsed = parseDiscoverQuery(window.location.search);
    queryIssues = parsed.issues;
    harvest = parsed.harvest;
    comparedIds = new URLSearchParams(window.location.search).get('places')?.split(',').filter(Boolean) ?? [];
    if (parsed.lang) {
      lang = parsed.lang;
    }
  });

  const originMun = $derived(
    LAGUNA_MUNICIPALITIES.find((m) => m.id === harvest.originMunicipality) || LAGUNA_MUNICIPALITIES[0]
  );

  const distanceKm = $derived(
    calculateStraightLineDistanceKm(originMun.lat, originMun.lng, outlet.lat, outlet.lng)
  );

  const fitResult = $derived(evaluateFit(outlet, harvest));

  const isFil = $derived(lang === 'fil');
  const hasVerifiedContact = $derived(Boolean(outlet.contactPhone || outlet.contactEmail));

  function handleToggleSave() {
    const result = toggleSavedOutlet(outlet.id);
    saved = result.saved;
    saveError = !result.persisted;
  }

  function closeDialog() {
    showMessageModal = false;
    showContactModal = false;
    requestAnimationFrame(() => dialogTrigger?.focus());
  }

  function openDialog(kind: 'message' | 'contact', event: MouseEvent) {
    dialogTrigger = event.currentTarget as HTMLElement;
    showMessageModal = kind === 'message';
    showContactModal = kind === 'contact';
    requestAnimationFrame(() => activeDialog?.querySelector<HTMLButtonElement>('button')?.focus());
  }

  function handleDialogKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
    }
    if (event.key !== 'Tab' || !activeDialog) return;
    const focusable = [...activeDialog.querySelectorAll<HTMLElement>('button, a[href], textarea, input')];
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
    copyError = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(messageTemplate);
      copiedMessage = true;
      setTimeout(() => {
        copiedMessage = false;
      }, 2500);
    } catch {
      copiedMessage = false;
      copyError = true;
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
    fitResult.dataValidUntil && fitResult.dataValidUntil < todayInManila()
      ? (isFil ? 'Lumang halimbawang presyo' : 'Expired sample price')
      : fitResult.evidenceKind === 'demo'
      ? (isFil ? 'Halimbawang presyo' : 'Sample price')
      : fitResult.evidenceKind === 'buyer_offer'
        ? (isFil ? 'Presyong naka-post ng buyer' : 'Buyer-posted price')
        : (isFil ? 'Presyo' : 'Price')
  );

  const priceQuestion = $derived(
    fitResult.samplePricePerKg === null
      ? (isFil
          ? 'Nais ko rin pong malaman ang kasalukuyang presyo, receiving schedule, at grading requirements.'
          : 'I would also like to confirm the current price, receiving schedule, and grading requirements.')
      : fitResult.evidenceKind === 'demo'
        ? (isFil
            ? `Nais ko pong kumpirmahin kung tumatanggap pa po kayo at kung ang halimbawang presyong ₱${fitResult.samplePricePerKg}/kg ay naaangkop pa, pati ang grading at receiving schedule.`
            : `I would like to confirm whether you are currently accepting deliveries and whether the demo price of ₱${fitResult.samplePricePerKg}/kg still applies, along with the receiving schedule and grading requirements.`)
        : (isFil
            ? `Nais ko pong kumpirmahin kung tumatanggap pa po kayo sa naka-post na presyong ₱${fitResult.samplePricePerKg}/kg at ano ang grading at receiving schedule.`
            : `I would like to confirm whether you are currently accepting deliveries at the posted price of ₱${fitResult.samplePricePerKg}/kg and what the receiving schedule and grading requirements are.`)
  );

  const messageTemplate = $derived(
    isFil
      ? `Magandang araw po. Mayroon po akong ${harvest.quantityKg} kg na ${getCropLabel(harvest.crop, lang)} na handang anihin sa ${harvest.readyDate} mula sa ${originMun.name}${harvestDetailSummary ? ` (${harvestDetailSummary})` : ''}. ${priceQuestion} Maraming salamat po.`
      : `Good day. I have ${harvest.quantityKg} kg of ${getCropLabel(harvest.crop, lang)} ready for harvest on ${harvest.readyDate} from ${originMun.name}${harvestDetailSummary ? ` (${harvestDetailSummary})` : ''}. ${priceQuestion} Thank you.`
  );

  const backUrl = $derived(
    `/discover?${serializeDiscoverQuery(harvest, 'list', undefined, lang)}&places=${encodeURIComponent(comparedIds.join(','))}`
  );

  const compareUrl = $derived(
    `/compare?places=${encodeURIComponent([...new Set([...comparedIds, outlet.id])].slice(0, 3).join(','))}&${serializeDiscoverQuery(harvest, 'list', undefined, lang)}`
  );
</script>

<div class="farmer-screen max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
  {#if queryIssues.length > 0}
    <p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'May di-wastong detalye sa link. Suriin ang ani, dami, lugar, at petsa bago magpatuloy.' : 'The shared link has invalid harvest details. Check the crop, quantity, location, and date before continuing.'}</p>
  {/if}
  {#if historicalHarvest}<p role="status" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'Lumipas na ang petsa ng ani. Makasaysayang halimbawa lamang ang mga halagang ito.' : 'The harvest date is past. These figures are a historical example.'}</p>{/if}
  {#if saveError}
    <p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{isFil ? 'Napanatili lamang ang pagpili sa tab na ito. Maaaring mawala ito kapag isinara ang browser.' : 'Your saved choice is available in this tab only and may be lost when you close the browser.'}</p>
  {/if}
  {#if queryIssues.length > 0}
    <a href="/" class="inline-flex min-h-[44px] items-center rounded-xl bg-[#597928] px-5 py-2 text-base font-semibold text-white">{isFil ? 'Itama ang detalye ng ani' : 'Correct harvest details'}</a>
  {:else}
  <!-- Back Link & Breadcrumbs -->
  <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#20251E]/10 pb-4">
    <div class="flex items-center gap-2 text-sm text-[#4A5245]">
      <a
        href={backUrl}
        class="inline-flex items-center gap-1.5 font-semibold text-[#597928] hover:text-[#435c1d] transition-colors py-1 px-2 rounded-lg hover:bg-[#597928]/10"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{isFil ? 'Bumalik sa resulta' : 'Back to discovery results'}</span>
      </a>
      <span class="text-[#20251E]/20">/</span>
      <span class="hidden sm:inline text-xs text-[#6B7265]">{originMun.name}</span>
      <span class="hidden sm:inline text-[#20251E]/20">/</span>
      <span class="text-xs font-medium text-[#20251E] truncate max-w-[200px]">{outlet.name}</span>
    </div>

    <!-- Right Controls: Save & Share -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={handleToggleSave}
        class={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[44px] ${
          saved
            ? 'bg-[#597928] text-white border-[#597928] shadow-sm'
            : 'bg-white text-[#20251E] border-[#20251E]/20 hover:border-[#597928]'
        }`}
        aria-label={saved ? (isFil ? 'Nai-save sa device' : 'Saved on this device') : (isFil ? 'I-save ang lugar' : 'Save outlet')}
        aria-pressed={saved}
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
        <svg class="w-4 h-4 text-[#597928]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>{isFil ? 'Ihambing' : 'Compare'}</span>
      </a>
    </div>
  </div>

  <!-- Hero Facility Card (Anti-Vibecode: Direct H1, No Kicker) -->
  <header class="bg-white rounded-2xl border border-[#20251E]/12 p-6 sm:p-8 shadow-sm space-y-6">
    <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
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
          <span class="font-medium text-[#20251E]">{outletCategoryLabel(outlet.category, lang)}</span>
          <span class="text-[#20251E]/20">&bull;</span>
          <span class="text-xs bg-[#597928]/10 text-[#597928] px-2.5 py-0.5 rounded-full font-medium">
            {distanceKm} km {isFil ? 'tuwirang layo mula sa' : 'straight-line from'} {originMun.name}
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
              ? 'bg-[#597928]/8 border-[#597928]/25 text-[#20251E]'
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
        <div class="w-8 h-8 rounded-lg bg-[#597928]/10 text-[#597928] flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <div class="text-xs font-semibold text-[#20251E]">{isFil ? 'Uri ng Ebidensya' : 'Evidence Type'}</div>
          <div class="text-[11px] text-[#6B7265]">{evidenceLabel(fitResult, lang)}</div>
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
          <div class="text-[11px] text-[#6B7265]">{fitResult.dataUpdatedAt ? formatEvidenceDate(fitResult.dataUpdatedAt) : outlet.sampleOfferDate}</div>
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
          <div class="text-[11px] text-[#6B7265]">{fitResult.dataValidUntil ? formatEvidenceDate(fitResult.dataValidUntil) : (isFil ? 'Walang expiry na nakatala' : 'No expiry recorded')}</div>
        </div>
      </div>
    </div>
  </header>

  <!-- Decision Summary & Transparent Math Card -->
  <section class="bg-white rounded-2xl border border-[#20251E]/12 p-6 sm:p-8 shadow-sm space-y-6">
    <div class="flex items-center justify-between gap-4 border-b border-[#20251E]/10 pb-4">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-[#597928]/12 text-[#597928] flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-serif font-bold text-[#20251E]">
          {isFil ? 'Buod ng Desisyon' : 'Decision Summary'}
        </h2>
      </div>

      <span class="text-xs text-[#6B7265] bg-[#FCECD8]/60 text-[#6E3511] font-semibold px-2.5 py-1 rounded-full">
        {harvest.quantityKg} kg {getCropLabel(harvest.crop, lang)}
      </span>
    </div>

    <!-- 6-Metric Visual Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <!-- 1. Your Produce -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#6B7265] uppercase tracking-wider">
          {isFil ? 'Ani Mo' : 'Your Produce'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#20251E] capitalize">{getCropLabel(harvest.crop, lang)}</div>
        <div class="text-sm text-[#6B7265]">{isFil ? 'Handa' : 'Ready'} {harvest.readyDate}</div>
      </div>

      <!-- 2. Accepted Quantity -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#6B7265] uppercase tracking-wider">
          {isFil ? 'Kayang Tanggapin' : 'Accepted'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#597928]">
          {fitResult.acceptedKg !== null ? `${fitResult.acceptedKg} kg` : (isFil ? 'Kumpirmahin' : 'Confirm')}
        </div>
        <div class="text-[11px] text-[#6B7265]">
          {fitResult.remainingKg === null
            ? (isFil ? 'Hindi pa alam kung ilan ang matatanggap' : 'Accepted amount is unknown')
            : fitResult.remainingKg > 0
              ? (isFil ? `${fitResult.remainingKg} kg ang matitira` : `${fitResult.remainingKg} kg would remain`)
              : (isFil ? 'Maaaring tanggapin ang buong ani; kumpirmahin muna' : 'May accept the full harvest; confirm first')}
        </div>
      </div>

      <!-- 3. Sample Price -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#6B7265] uppercase tracking-wider">
          {priceLabel}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#20251E]">
          {fitResult.samplePricePerKg !== null ? `₱${fitResult.samplePricePerKg}/kg` : (isFil ? 'Walang tala' : 'Not posted')}
        </div>
        <div class="text-[11px] text-[#6B7265]">{evidenceLabel(fitResult, lang)}</div>
      </div>

      <!-- 4. Gross Subtotal -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#6B7265] uppercase tracking-wider">
          {isFil ? 'Kabuuang Halaga' : 'Gross Subtotal'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#20251E]">
          {fitResult.grossPay !== null ? `₱${fitResult.grossPay.toLocaleString()}` : '---'}
        </div>
        <div class="text-[11px] text-[#6B7265]">
          {fitResult.acceptedKg && fitResult.samplePricePerKg
            ? `${fitResult.acceptedKg}kg × ₱${fitResult.samplePricePerKg}`
            : (isFil ? 'Kailangan pang kumpirmahin' : 'Pending intake')}
        </div>
      </div>

      <!-- 5. Entered Transport -->
      <div class="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
        <div class="text-[11px] font-medium text-[#6B7265] uppercase tracking-wider">
          {isFil ? 'Gastos sa Biyahe' : 'Hauling Expense'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#6E3511]">
          {fitResult.enteredTransport !== null ? `-₱${fitResult.enteredTransport.toLocaleString()}` : '---'}
        </div>
        <div class="text-sm text-[#6B7265]">{isFil ? 'Halimbawang tantiya' : 'Sample estimate'}</div>
      </div>

      <!-- 6. After Entered Transport -->
      <div class="p-3.5 rounded-xl bg-[#597928]/8 border border-[#597928]/30 space-y-1">
        <div class="text-[11px] font-semibold text-[#597928] uppercase tracking-wider">
          {isFil ? 'Matapos ang Biyahe' : 'After Transport'}
        </div>
        <div class="text-base sm:text-lg font-bold text-[#597928]">
          {fitResult.afterTransportPay !== null ? `₱${fitResult.afterTransportPay.toLocaleString()}` : '---'}
        </div>
        <div class="text-sm text-[#4A5245]">{isFil ? 'Bago gastos sa bukid' : 'Before farm costs'}</div>
      </div>
    </div>

    <!-- Mandatory Honest Agricultural Commerce Notice -->
    <div class="rounded-xl p-3.5 bg-[#FFFDF8] border border-[#20251E]/10 flex items-start gap-3 text-xs text-[#4A5245]">
      <svg class="w-4 h-4 text-[#6E3511] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <span class="font-bold text-[#20251E]">{isFil ? 'Paalala:' : 'Notice:'}</span> {t('afterTransportNote', lang)}
      </div>
    </div>
  </section>

  <!-- Two Column Layout: Requirements to Confirm & Geographic Corridor -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

      <p class="text-xs text-[#6B7265]">
        {isFil
          ? 'Huwag bumiyahe nang hindi pa nakukumpirma ang mga sumusunod na tanong sa mamimili:'
          : 'Do not travel without confirming these key operational questions with the intake manager:'}
      </p>

      <ul class="space-y-3">
        <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 text-xs sm:text-sm text-[#20251E]">
          <span class="w-5 h-5 rounded-full bg-[#597928]/15 text-[#597928] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">?</span>
          <span>{isFil ? `Anong kalidad at antas ng pagkahinog ang kailangan para sa ${getCropLabel(harvest.crop, lang)}?` : `What grade and ripeness standard do you require for ${getCropLabel(harvest.crop, lang)}?`}</span>
        </li>
        <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 text-xs sm:text-sm text-[#20251E]">
          <span class="w-5 h-5 rounded-full bg-[#597928]/15 text-[#597928] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">?</span>
          <span>{isFil ? 'Anong balot o lalagyan ang kailangan sa paghahatid?' : 'What packaging or crate specification is required at delivery?'}</span>
        </li>
        <li class="flex items-start gap-3 p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 text-xs sm:text-sm text-[#20251E]">
          <span class="w-5 h-5 rounded-full bg-[#597928]/15 text-[#597928] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">?</span>
          <span>{isFil ? `Anong eksaktong oras ng pagtanggap at huling oras ng pagpasok sa ${harvest.readyDate}?` : `What are the exact receiving hours and gate cutoffs on ${harvest.readyDate}?`}</span>
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

    <!-- Right: Geographic Route Preview -->
    <section class="bg-white rounded-2xl border border-[#20251E]/12 p-6 sm:p-8 shadow-sm space-y-5">
      <div class="flex items-center justify-between border-b border-[#20251E]/10 pb-4">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#4E7380]/12 text-[#4E7380] flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 class="text-xl font-serif font-bold text-[#20251E]">
            {isFil ? 'Guhit ng Tuwirang Layo' : 'Straight-Line View'}
          </h2>
        </div>

        <span class="text-xs bg-[#FCECD8] text-[#6E3511] px-2.5 py-0.5 rounded-full font-bold">
          {t('illustrativeMap', lang)}
        </span>
      </div>

      <div class="rounded-xl overflow-hidden border border-[#20251E]/10 bg-[#FAF7EE] relative">
        <ResilientLagunaMap
          items={[{
            outlet,
            fit: fitResult,
            distanceKm
          }]}
          harvest={harvest}
          selectedId={outlet.id}
          isDetailView={true}
          lang={lang}
          onSelect={() => {}}
        />
      </div>

      <div class="flex items-center justify-between text-xs text-[#6B7265] pt-1">
        <span>{isFil ? 'Pinagmulan:' : 'Origin:'} <strong>{originMun.name}</strong></span>
        <span>{isFil ? 'Tuwirang layo:' : 'Straight-line distance:'} <strong>{distanceKm} km</strong></span>
        <span>{isFil ? 'Patutunguhan:' : 'Destination:'} <strong>{outlet.municipality}</strong></span>
      </div>
    </section>
  </div>

  <!-- Contact & Next Steps Action Dock -->
  <section class="bg-white rounded-2xl border border-[#20251E]/12 p-6 sm:p-8 shadow-sm space-y-6">
    <div class="flex items-center gap-2.5 border-b border-[#20251E]/10 pb-4">
      <div class="w-8 h-8 rounded-lg bg-[#597928]/12 text-[#597928] flex items-center justify-center">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-serif font-bold text-[#20251E]">
          {isFil ? 'Pakikipag-ugnayan at Susunod na Hakbang' : 'Contact & Next Steps'}
        </h2>
        <p class="text-xs text-[#6B7265]">
          {isFil
            ? 'Kumpirmahin ang mga detalye bago bumiyahe. Maaaring magbago ang presyo at kapasidad.'
            : 'Confirm terms before travel. Availability, price, and requirements may change.'}
        </p>
      </div>
    </div>

    <!-- Action Buttons with Apple HIG min-h-[48px] -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- 1. Prepare Message CTA -->
      <button
        type="button"
        onclick={(event) => openDialog('message', event)}
        class="w-full min-h-[48px] px-5 py-3 rounded-full bg-[#597928] text-white font-semibold text-sm hover:bg-[#47621f] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span>{isFil ? 'Ihanda ang mensahe' : 'Prepare message'}</span>
      </button>

      <!-- 2. Public Contact Details -->
      <button
        type="button"
        onclick={(event) => openDialog('contact', event)}
        class="w-full min-h-[48px] px-5 py-3 rounded-full bg-white border border-[#20251E]/20 text-[#20251E] font-semibold text-sm hover:bg-[#FFFDF8] hover:border-[#597928] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4 text-[#597928]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span>
          {hasVerifiedContact
            ? (isFil ? 'Pampublikong kontak' : 'Public contact')
            : (isFil ? 'Walang beripikadong kontak' : 'No verified contact')}
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
    <div class="pt-4 border-t border-[#20251E]/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#6B7265]">
      <div>
        {isFil ? 'Pinagmulan:' : 'Source:'} <span class="font-medium text-[#20251E]">{evidenceLabel(fitResult, lang)} &bull; {outlet.sampleOfferDate}</span>
      </div>
      <div>
        {isFil ? 'Halimbawang datos:' : 'Fixture:'} <span class="font-medium text-[#20251E]">{isFil ? 'Demo sa Laguna' : 'Illustrative Laguna demo'} &bull; NextGen Agri Hackathon 2026</span>
      </div>
    </div>
  </section>
  {/if}
</div>

<!-- Modal: Prepare Message -->
{#if showMessageModal}
  <div bind:this={activeDialog} onkeydown={handleDialogKeydown} class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20251E]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="message-dialog-title">
    <div class="bg-white rounded-2xl border border-[#20251E]/15 max-w-lg w-full p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-[#20251E]/10 pb-3">
        <h3 id="message-dialog-title" class="text-lg font-serif font-bold text-[#20251E]">
          {isFil ? 'Ihanda ang Mensahe sa Mamimili' : 'Prepare Inquiry Message'}
        </h3>
        <button
          type="button"
          onclick={closeDialog}
          class="w-10 h-10 rounded-full flex items-center justify-center text-[#4A5245] hover:bg-[#20251E]/10 min-h-[44px]"
          aria-label={isFil ? 'Isara' : 'Close'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="text-xs text-[#4A5245]">
        {isFil
          ? 'Maaari mong kopyahin ang template na ito para i-text o ipadala sa intake coordinator bago ibiyahe ang ani:'
          : 'Copy this ready-made template to text or message the intake coordinator before hauling:'}
      </p>

      <div class="p-4 rounded-xl bg-[#FAF7EE] border border-[#20251E]/10 text-xs sm:text-sm text-[#20251E] leading-relaxed font-sans select-all whitespace-pre-wrap">
        {messageTemplate}
      </div>

      <div class="rounded-xl p-3 bg-[#FCECD8]/60 border border-[#6E3511]/15 text-[11px] text-[#6E3511]">
        <strong>{isFil ? 'Demo lamang:' : 'Demo notice:'}</strong> {isFil ? 'Hindi nagpapadala ng SMS ang AniWhere. Kopyahin ang tekstong ito at ipadala gamit ang iyong telepono.' : 'AniWhere does not send automated SMS. Copy this text and send it using your phone.'}
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onclick={closeDialog}
          class="px-4 py-2 rounded-full text-xs font-semibold text-[#4A5245] hover:bg-[#20251E]/5 min-h-[44px]"
        >
          {isFil ? 'Isara' : 'Close'}
        </button>

        <button
          type="button"
          onclick={handleCopyMessage}
          class="px-5 py-2.5 rounded-full text-xs font-bold bg-[#597928] text-white hover:bg-[#435c1d] transition-all flex items-center gap-1.5 min-h-[44px]"
        >
          {#if copiedMessage}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{isFil ? 'Nakopya ang mensahe' : 'Copied to clipboard!'}</span>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>{isFil ? 'Kopyahin ang mensahe' : 'Copy message'}</span>
          {/if}
        </button>
      </div>
      {#if copyError}<p role="alert" class="text-sm text-[#6E3511]">{isFil ? 'Hindi nakopya. Piliin at kopyahin nang manu-mano ang mensahe sa itaas.' : 'Copy failed. Select and copy the message above manually.'}</p>{/if}
    </div>
  </div>
{/if}

<!-- Modal: Public Contact Details -->
{#if showContactModal}
  <div bind:this={activeDialog} onkeydown={handleDialogKeydown} class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20251E]/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
    <div class="bg-white rounded-2xl border border-[#20251E]/15 max-w-md w-full p-6 space-y-4 shadow-xl">
      <div class="flex items-center justify-between border-b border-[#20251E]/10 pb-3">
        <h3 id="contact-dialog-title" class="text-lg font-serif font-bold text-[#20251E]">
          {outlet.name}
        </h3>
        <button
          type="button"
          onclick={closeDialog}
          class="w-10 h-10 rounded-full flex items-center justify-center text-[#4A5245] hover:bg-[#20251E]/10 min-h-[44px]"
          aria-label={isFil ? 'Isara' : 'Close'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3 text-xs sm:text-sm text-[#20251E]">
        <div class="p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-1">
          <div class="text-[11px] font-semibold text-[#6B7265] uppercase">
            {isFil ? 'Lokasyon ng tala' : 'Recorded location'}
          </div>
          <div class="font-bold">{outlet.municipality}, Laguna</div>
          <div class="text-[11px] text-[#6B7265]">
            {isFil
              ? 'Walang operating hours na ipinapalagay kung hindi ito beripikado.'
              : 'No operating hours are inferred unless they are verified.'}
          </div>
        </div>

        {#if hasVerifiedContact}
          <div class="p-3 rounded-xl bg-[#FFFDF8] border border-[#20251E]/8 space-y-2">
            <div class="text-[11px] font-semibold text-[#6B7265] uppercase">
              {isFil ? 'Beripikadong pampublikong kontak' : 'Verified public contact'}
            </div>
            {#if outlet.contactPhone}
              <div class="font-mono text-xs text-[#20251E]">{outlet.contactPhone}</div>
            {/if}
            {#if outlet.contactEmail}
              <div class="text-xs text-[#20251E]">{outlet.contactEmail}</div>
            {/if}
          </div>
        {:else}
          <div class="p-3 rounded-xl bg-[#4E7380]/8 border border-[#4E7380]/18 text-xs text-[#2A4B56]">
            {isFil
              ? 'Walang beripikadong pampublikong phone o email na nakaimbak para sa record na ito. Huwag gumamit ng imbentong contact details.'
              : 'No verified public phone or email is stored for this record. AniWhere does not substitute invented contact details.'}
          </div>
        {/if}

        <div class="rounded-xl p-3 bg-[#FCECD8]/60 border border-[#6E3511]/15 text-[11px] text-[#6E3511]">
          <strong>{isFil ? 'Paalala:' : 'Notice:'}</strong> {isFil ? 'Halimbawang datos ito para sa hackathon. Walang totoong transaksiyon o tawag na ginagawa ang prototype.' : 'This is hackathon sample data. The prototype does not make transactions or phone calls.'}
        </div>
      </div>

      <div class="flex items-center justify-end pt-2">
        <button
          type="button"
          onclick={closeDialog}
          class="px-5 py-2.5 rounded-full text-xs font-bold bg-[#597928] text-white hover:bg-[#435c1d] transition-all min-h-[44px]"
        >
          {isFil ? 'Tapos' : 'Done'}
        </button>
      </div>
    </div>
  </div>
{/if}
