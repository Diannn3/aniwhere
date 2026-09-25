<script lang="ts">
  import type { BagsakanDemoDemand } from '../../lib/bagsakan/state';
  import { getCropLabel } from '../../lib/domain/crops';

  let { demand, status, previewHref, lang = 'en', onEdit, onPause, onResume, onRemove }: {
    demand: BagsakanDemoDemand;
    status: 'draft' | 'active' | 'paused' | 'expired';
    previewHref: string;
    lang?: 'en' | 'fil';
    onEdit: () => void;
    onPause: () => void;
    onResume: () => void;
    onRemove: () => void;
  } = $props();
  let confirmingRemove = $state(false);
  const isFil = $derived(lang === 'fil');
  const crop = $derived(demand.cropKey === 'other' ? demand.customCropLabel || (isFil ? 'Iba pa' : 'Other') : getCropLabel(demand.cropKey, lang));
  const statusLabel = $derived(status === 'active' ? (isFil ? 'Aktibong demo' : 'Active demo') : status === 'paused' ? (isFil ? 'Naka-pause' : 'Paused') : status === 'expired' ? (isFil ? 'Nag-expire' : 'Expired') : (isFil ? 'Burador' : 'Draft'));
  const formatDate = (date: string) => new Intl.DateTimeFormat(isFil ? 'fil-PH' : 'en-PH', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
</script>

<article class="border-t border-[#20251E]/20 py-6 first:border-t-0">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-xl font-bold">{crop}</h3>
      <p class="mt-1 font-semibold text-[#6E3511]">{statusLabel}</p>
    </div>
  </div>
  <dl class="mt-4 grid gap-3 sm:grid-cols-3">
    <div><dt class="text-sm text-[#4A5245]">{isFil ? 'Matatanggap' : 'Can receive'}</dt><dd class="font-bold tabular-nums">{demand.maxKg === undefined ? (isFil ? 'Kukumpirmahin' : 'To confirm') : `${demand.maxKg.toLocaleString(isFil ? 'fil-PH' : 'en-PH')} kg ${isFil ? 'pinakamataas' : 'maximum'}`}</dd></div>
    <div><dt class="text-sm text-[#4A5245]">{isFil ? 'Halimbawang presyo' : 'Sample price'}</dt><dd class="font-bold tabular-nums">{demand.pricePerKg === undefined ? (isFil ? 'Walang nakalagay' : 'Not entered') : `₱${demand.pricePerKg.toLocaleString(isFil ? 'fil-PH' : 'en-PH')}/kg`}</dd></div>
    <div><dt class="text-sm text-[#4A5245]">{isFil ? 'Petsa ng pagtanggap' : 'Receiving dates'}</dt><dd class="font-semibold tabular-nums">{formatDate(demand.validFrom)} – {formatDate(demand.validUntil)}</dd></div>
  </dl>
  {#if demand.variety || demand.grade || demand.packaging}<p class="mt-3 text-sm text-[#4A5245]">{[demand.variety, demand.grade, demand.packaging].filter(Boolean).join(' · ')}</p>{/if}
  <div class="mt-4 flex flex-wrap gap-2">
    <button type="button" onclick={onEdit} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'I-edit' : 'Edit'}</button>
    {#if status === 'active'}<button type="button" onclick={onPause} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'I-pause' : 'Pause'}</button>{/if}
    {#if status === 'paused' || status === 'draft' || status === 'expired'}<button type="button" onclick={onResume} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'Ipagpatuloy' : 'Resume'}</button>{/if}
  </div>
  <details class="mt-3"><summary class="inline-flex min-h-11 cursor-pointer items-center py-2 font-semibold text-[#365118] underline underline-offset-4">{isFil ? 'Iba pang opsyon' : 'More options'}</summary><div class="flex flex-wrap gap-2 pb-2"><a href={previewHref} class="inline-flex min-h-11 items-center rounded-lg border border-[#597928] px-4 font-semibold text-[#486320] hover:bg-[#EBF3DF]">{isFil ? 'Tingnan bilang farmer' : 'Preview as farmer'}</a><button type="button" onclick={() => { confirmingRemove = true; }} class="min-h-11 rounded-lg px-4 font-semibold text-[#6E3511] underline hover:bg-[#FCECD8]">{isFil ? 'Alisin' : 'Remove'}</button></div></details>
  {#if confirmingRemove}<div class="mt-3 rounded-lg border border-[#6E3511]/30 bg-[#FCECD8] p-3"><p class="font-semibold">{isFil ? 'Alisin ang pangangailangang ito sa device?' : 'Remove this need from this device?'}</p><div class="mt-2 flex flex-wrap gap-2"><button type="button" onclick={onRemove} class="min-h-11 rounded-lg bg-[#6E3511] px-4 font-bold text-white">{isFil ? 'Oo, alisin' : 'Yes, remove'}</button><button type="button" onclick={() => { confirmingRemove = false; }} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold">{isFil ? 'Kanselahin' : 'Cancel'}</button></div></div>{/if}
</article>
