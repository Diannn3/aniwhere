<script lang="ts">
  import { tick } from 'svelte';
  import { validateDemand, type BagsakanDemoDemand, type BagsakanDemoProfile } from '../../lib/bagsakan/state';
  import { SUPPORTED_CROPS } from '../../lib/domain/crops';
  import { todayInManila } from '../../lib/state/url-state';
  import DemandAdvanced from './DemandAdvanced.svelte';

  let { profile, demands, demand = null, lang = 'en', onSave, onCancel, onEditExisting }: {
    profile: BagsakanDemoProfile;
    demands: BagsakanDemoDemand[];
    demand?: BagsakanDemoDemand | null;
    lang?: 'en' | 'fil';
    onSave: (demand: BagsakanDemoDemand) => void;
    onCancel: () => void;
    onEditExisting: (id: string) => void;
  } = $props();
  const today = todayInManila();
  const nextWeek = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  let cropKey = $state(demand?.cropKey ?? 'tomato');
  let customCropLabel = $state(demand?.customCropLabel ?? '');
  let unknownCapacity = $state(demand ? demand.maxKg === undefined : false);
  let maxKgInput = $state(demand?.maxKg === undefined ? '' : String(demand.maxKg));
  let priceInput = $state(demand?.pricePerKg === undefined ? '' : String(demand.pricePerKg));
  let validFrom = $state(demand?.validFrom ?? today);
  let validUntil = $state(demand?.validUntil ?? nextWeek);
  let status = $state<'draft' | 'active' | 'paused'>(demand?.status ?? 'active');
  let advanced = $state({
    minKg: demand?.minKg === undefined ? '' : String(demand.minKg),
    receivingWeekdays: demand?.receivingWeekdays ?? [] as number[],
    receivingStartTime: demand?.receivingStartTime ?? '',
    receivingEndTime: demand?.receivingEndTime ?? '',
    variety: demand?.variety ?? '',
    grade: demand?.grade ?? '',
    packaging: demand?.packaging ?? '',
    notes: demand?.notes ?? '',
  });
  let errors = $state<Record<string, string>>({});
  let duplicateId = $state<string | null>(null);
  const isFil = $derived(lang === 'fil');
  const errorsFil: Record<string, string> = {
    cropKey: 'Pumili ng pananim.', customCropLabel: 'Pangalanan ang ibang pananim.',
    maxKg: 'Maglagay ng positibong kapasidad o piliin ang hindi pa alam.',
    minKg: 'Dapat hindi negatibo o higit sa kapasidad ang pinakamababang kg.',
    pricePerKg: 'Dapat positibo ang presyo o iwang blangko.',
    validFrom: 'Maglagay ng wastong petsa ng simula.',
    validUntil: 'Maglagay ng wastong petsa ng pagtatapos pagkatapos ng simula.',
    status: 'Dapat saklaw ng aktibong pangangailangan ang araw na ito. Gawing burador kung sa hinaharap pa magsisimula.',
    receivingWeekdays: 'Pumili ng wastong araw ng pagtanggap.',
    receivingStartTime: 'Gamitin ang 24-oras na HH:MM.',
    receivingEndTime: 'Dapat matapos ang oras ng pagtanggap pagkatapos ng simula.',
  };

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const duplicate = demands.find((item) => item.cropKey === cropKey && item.id !== demand?.id);
    duplicateId = duplicate?.id ?? null;
    if (duplicate) {
      errors = { cropKey: isFil ? 'May pangangailangan na para sa pananim na ito. I-edit iyon.' : 'This crop already has a need. Edit it instead.' };
      await tick();
      document.getElementById('bag-demand-cropKey')?.focus();
      return;
    }
    const candidate: BagsakanDemoDemand = {
      id: demand?.id ?? crypto.randomUUID(), profileId: profile.id,
      cropKey, customCropLabel: cropKey === 'other' && customCropLabel.trim() ? customCropLabel : undefined,
      maxKg: unknownCapacity ? undefined : String(maxKgInput).trim() ? Number(maxKgInput) : NaN,
      minKg: advanced.minKg.trim() ? Number(advanced.minKg) : undefined,
      pricePerKg: String(priceInput).trim() ? Number(priceInput) : undefined,
      status, validFrom, validUntil,
      receivingWeekdays: advanced.receivingWeekdays.length ? advanced.receivingWeekdays : undefined,
      receivingStartTime: advanced.receivingStartTime || undefined,
      receivingEndTime: advanced.receivingEndTime || undefined,
      variety: advanced.variety.trim() ? advanced.variety : undefined,
      grade: advanced.grade.trim() ? advanced.grade : undefined,
      packaging: advanced.packaging.trim() ? advanced.packaging : undefined,
      notes: advanced.notes.trim() ? advanced.notes : undefined,
      updatedAt: new Date().toISOString(),
    };
    errors = validateDemand(candidate);
    if (isFil) errors = Object.fromEntries(Object.entries(errors).map(([key, message]) => [key, errorsFil[key] ?? message]));
    if (Object.keys(errors).length) {
      await tick();
      document.getElementById(`bag-demand-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    onSave(candidate);
  }
</script>

<form onsubmit={save} novalidate class="space-y-6 rounded-xl border border-[#20251E]/15 bg-white p-4 sm:p-6">
  <div><h2 class="text-2xl font-bold tracking-tight">{demand ? (isFil ? 'I-edit ang pangangailangan' : 'Edit buying need') : (isFil ? 'Magdagdag ng pangangailangan' : 'Add buying need')}</h2><p class="mt-2 text-[#4A5245]">{isFil ? 'Ilagay ang kasalukuyang kakayahang tumanggap. Demo lamang ito sa device na ito.' : 'Record what you can currently receive. This is a demo on this device only.'}</p></div>
  {#if Object.keys(errors).length}<div role="alert" class="rounded-lg border border-[#6E3511]/40 bg-[#FCECD8] p-3 text-[#6E3511]"><p class="font-semibold">{isFil ? 'Ayusin ang mga field na may error.' : 'Fix the fields marked below.'}</p><ul class="mt-1 list-disc pl-5 text-sm">{#each Object.values(errors) as error}<li>{error}</li>{/each}</ul></div>{/if}
  <div class="grid gap-4 sm:grid-cols-2">
    <div><label for="bag-demand-cropKey" class="mb-1 block font-semibold">{isFil ? 'Pananim' : 'Crop'} *</label><select id="bag-demand-cropKey" bind:value={cropKey} onchange={() => { duplicateId = null; errors = {}; }} aria-invalid={Boolean(errors.cropKey)} aria-describedby={errors.cropKey ? 'bag-demand-cropKey-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 bg-[#FFFDF8] px-3">{#each SUPPORTED_CROPS as crop}<option value={crop.key}>{isFil ? crop.labelFil : crop.labelEn}</option>{/each}<option value="other">{isFil ? 'Iba pa' : 'Other'}</option></select>{#if errors.cropKey}<p id="bag-demand-cropKey-error" class="mt-1 text-sm text-[#6E3511]">{errors.cropKey}</p>{/if}{#if duplicateId}<button type="button" onclick={() => onEditExisting(duplicateId!)} class="mt-2 min-h-11 font-bold text-[#486320] underline">{isFil ? 'I-edit ang kasalukuyang pangangailangan' : 'Edit existing need'}</button>{/if}</div>
    {#if cropKey === 'other'}<div><label for="bag-demand-customCropLabel" class="mb-1 block font-semibold">{isFil ? 'Pangalan ng pananim' : 'Crop name'} *</label><input id="bag-demand-customCropLabel" bind:value={customCropLabel} aria-invalid={Boolean(errors.customCropLabel)} aria-describedby={errors.customCropLabel ? 'bag-demand-customCropLabel-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.customCropLabel}<p id="bag-demand-customCropLabel-error" class="mt-1 text-sm text-[#6E3511]">{errors.customCropLabel}</p>{/if}</div>{/if}
    <div><label for="bag-demand-maxKg" class="mb-1 block font-semibold">{isFil ? 'Pinakamaraming kg na matatanggap' : 'Maximum kg you can receive'}</label><input id="bag-demand-maxKg" type="number" min="0" step="any" bind:value={maxKgInput} disabled={unknownCapacity} aria-invalid={Boolean(errors.maxKg)} aria-describedby={errors.maxKg ? 'bag-demand-maxKg-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3 tabular-nums disabled:bg-[#20251E]/5" /><label class="mt-2 flex min-h-11 items-center gap-2"><input id="bag-demand-unknown" type="checkbox" bind:checked={unknownCapacity} />{isFil ? 'Hindi pa alam ang kapasidad' : 'Capacity unknown'}</label>{#if errors.maxKg}<p id="bag-demand-maxKg-error" class="mt-1 text-sm text-[#6E3511]">{errors.maxKg}</p>{/if}</div>
    <div><label for="bag-demand-pricePerKg" class="mb-1 block font-semibold">{isFil ? 'Halimbawang presyo, ₱/kg (opsyonal)' : 'Sample price, ₱/kg (optional)'}</label><input id="bag-demand-pricePerKg" type="number" min="0" step="any" bind:value={priceInput} aria-invalid={Boolean(errors.pricePerKg)} aria-describedby={errors.pricePerKg ? 'bag-demand-pricePerKg-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3 tabular-nums" />{#if errors.pricePerKg}<p id="bag-demand-pricePerKg-error" class="mt-1 text-sm text-[#6E3511]">{errors.pricePerKg}</p>{/if}</div>
    <div><label for="bag-demand-validFrom" class="mb-1 block font-semibold">{isFil ? 'Simula ng bisa' : 'Valid from'} *</label><input id="bag-demand-validFrom" type="date" bind:value={validFrom} aria-invalid={Boolean(errors.validFrom)} aria-describedby={errors.validFrom ? 'bag-demand-validFrom-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.validFrom}<p id="bag-demand-validFrom-error" class="mt-1 text-sm text-[#6E3511]">{errors.validFrom}</p>{/if}</div>
    <div><label for="bag-demand-validUntil" class="mb-1 block font-semibold">{isFil ? 'Hanggang kailan' : 'Valid until'} *</label><input id="bag-demand-validUntil" type="date" bind:value={validUntil} aria-invalid={Boolean(errors.validUntil)} aria-describedby={errors.validUntil ? 'bag-demand-validUntil-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.validUntil}<p id="bag-demand-validUntil-error" class="mt-1 text-sm text-[#6E3511]">{errors.validUntil}</p>{/if}</div>
    <div><label for="bag-demand-status" class="mb-1 block font-semibold">{isFil ? 'Katayuan' : 'Status'}</label><select id="bag-demand-status" bind:value={status} aria-invalid={Boolean(errors.status)} aria-describedby={errors.status ? 'bag-demand-status-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3"><option value="active">{isFil ? 'Aktibong demo' : 'Active demo'}</option><option value="draft">{isFil ? 'Burador' : 'Draft'}</option>{#if demand}<option value="paused">{isFil ? 'Naka-pause' : 'Paused'}</option>{/if}</select>{#if errors.status}<p id="bag-demand-status-error" class="mt-1 text-sm text-[#6E3511]">{errors.status}</p>{/if}</div>
  </div>
  <DemandAdvanced value={advanced} {lang} {errors} onChange={(value) => { advanced = value; }} />
  <div class="flex flex-wrap gap-3"><button type="submit" class="min-h-11 rounded-lg bg-[#486320] px-5 font-bold text-white hover:bg-[#365118] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#486320]">{demand ? (isFil ? 'I-save ang pagbabago' : 'Save changes') : (isFil ? 'I-save ang pangangailangan' : 'Save need')}</button><button type="button" onclick={onCancel} class="min-h-11 rounded-lg border border-[#20251E]/30 px-5 font-semibold hover:bg-[#FCECD8]">{isFil ? 'Kanselahin' : 'Cancel'}</button></div>
</form>
