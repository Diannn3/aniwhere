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
  const dateLabel = $derived(new Intl.DateTimeFormat(isFil ? 'fil-PH' : 'en-PH', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${demand.validUntil}T00:00:00Z`)));
</script>

<article class="border-t border-[#20251E]/20 py-5 first:border-t-0">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-xl font-bold">{crop}</h3>
      <p class="mt-1 text-sm font-semibold text-[#6E3511]">{statusLabel} · {isFil ? 'Hanggang' : 'Until'} {dateLabel}</p>
    </div>
    <p class="text-right font-bold tabular-nums">{demand.maxKg === undefined ? (isFil ? 'Kapasidad: kukumpirmahin' : 'Capacity: confirm') : `${demand.maxKg.toLocaleString(isFil ? 'fil-PH' : 'en-PH')} kg ${isFil ? 'pinakamataas' : 'maximum'}`}</p>
  </div>
  {#if demand.pricePerKg !== undefined}<p class="mt-2 text-sm text-[#4A5245]">{isFil ? 'Halimbawang presyo' : 'Sample price'}: <strong class="tabular-nums">₱{demand.pricePerKg.toLocaleString(isFil ? 'fil-PH' : 'en-PH')}/kg</strong></p>{/if}
  {#if demand.variety || demand.grade || demand.packaging}<p class="mt-2 text-sm text-[#4A5245]">{[demand.variety, demand.grade, demand.packaging].filter(Boolean).join(' · ')}</p>{/if}
  <div class="mt-4 flex flex-wrap gap-2">
    <button type="button" onclick={onEdit} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'I-edit' : 'Edit'}</button>
    {#if status === 'active'}<button type="button" onclick={onPause} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'I-pause' : 'Pause'}</button>{/if}
    {#if status === 'paused' || status === 'draft' || status === 'expired'}<button type="button" onclick={onResume} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'Ipagpatuloy' : 'Resume'}</button>{/if}
    <a href={previewHref} class="inline-flex min-h-11 items-center rounded-lg border border-[#597928] px-4 font-semibold text-[#486320] hover:bg-[#EBF3DF]">{isFil ? 'Tingnan bilang farmer' : 'Preview as farmer'}</a>
    <button type="button" onclick={() => { confirmingRemove = true; }} class="min-h-11 rounded-lg px-4 font-semibold text-[#6E3511] underline hover:bg-[#FCECD8]">{isFil ? 'Alisin' : 'Remove'}</button>
  </div>
  {#if confirmingRemove}<div class="mt-3 rounded-lg border border-[#6E3511]/30 bg-[#FCECD8] p-3"><p class="font-semibold">{isFil ? 'Alisin ang pangangailangang ito sa device?' : 'Remove this need from this device?'}</p><div class="mt-2 flex flex-wrap gap-2"><button type="button" onclick={onRemove} class="min-h-11 rounded-lg bg-[#6E3511] px-4 font-bold text-white">{isFil ? 'Oo, alisin' : 'Yes, remove'}</button><button type="button" onclick={() => { confirmingRemove = false; }} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold">{isFil ? 'Kanselahin' : 'Cancel'}</button></div></div>{/if}
</article>
