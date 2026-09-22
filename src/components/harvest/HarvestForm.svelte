<script lang="ts">
  import { onMount } from 'svelte';
  import { SUPPORTED_CROPS } from '../../lib/domain/crops';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { isValidIsoDate, validateHarvestInput } from '../../lib/domain/validation';
  import { serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { safeStorage } from '../../lib/state/storage';
  import { t } from '../../content/translations';
  import { publishHarvestContext, subscribeHarvestContext } from '../../lib/ani/harvest-sync';

  type HarvestDraft = {
    cropChoice: string;
    otherCrop: string;
    quantityKg: number;
    originMunicipality: string;
    readyDate: string;
    variety: string;
    grade: string;
    packaging: string;
  };

  const DRAFT_KEY = 'aniwhere:harvest-ticket:v2';
  let { initialLang = 'en' }: { initialLang?: 'en' | 'fil' } = $props();

  let cropChoice = $state('tomato');
  let otherCrop = $state('');
  let quantityKg = $state(300);
  let originMunicipality = $state('los-banos');
  let readyDate = $state(todayInManila());
  let variety = $state('');
  let grade = $state('');
  let packaging = $state('');
  let showDetails = $state(false);
  let lang = $state<'en' | 'fil'>(initialLang);
  let errors = $state<Record<string, string>>({});

  let cropGroupEl: HTMLFieldSetElement | null = $state(null);
  let otherCropInputEl: HTMLInputElement | null = $state(null);
  let quantityInputEl: HTMLInputElement | null = $state(null);
  let municipalitySelectEl: HTMLSelectElement | null = $state(null);
  let readyDateInputEl: HTMLInputElement | null = $state(null);
  let errorSummaryEl: HTMLDivElement | null = $state(null);

  const cropLabel = () => (cropChoice === 'other' ? otherCrop.trim() : cropChoice);

  function restoreDraft(draft: HarvestDraft) {
    const knownCropChoice = SUPPORTED_CROPS.some((item) => item.key === draft.cropChoice);
    const parsedQuantity = Number(draft.quantityKg);
    const knownOrigin = LAGUNA_MUNICIPALITIES.some((item) => item.id === draft.originMunicipality);

    cropChoice = knownCropChoice ? draft.cropChoice : 'tomato';
    otherCrop = typeof draft.otherCrop === 'string' ? draft.otherCrop.trim().slice(0, 80) : '';
    quantityKg =
      Number.isFinite(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= 100000
        ? parsedQuantity
        : 300;
    originMunicipality = knownOrigin ? draft.originMunicipality : 'los-banos';
    readyDate = isValidIsoDate(draft.readyDate) ? draft.readyDate : todayInManila();
    variety = typeof draft.variety === 'string' ? draft.variety.trim().slice(0, 80) : '';
    grade = typeof draft.grade === 'string' ? draft.grade.trim().slice(0, 80) : '';
    packaging = typeof draft.packaging === 'string' ? draft.packaging.trim().slice(0, 80) : '';
    showDetails = Boolean(variety || grade || packaging);
  }

  function saveDraft() {
    safeStorage.setItem<HarvestDraft>(DRAFT_KEY, {
      cropChoice,
      otherCrop,
      quantityKg: Number(quantityKg),
      originMunicipality,
      readyDate,
      variety,
      grade,
      packaging,
    });
  }

  function saveAndShareDraft() {
    saveDraft();

    const crop = cropLabel();
    const validation = validateHarvestInput({
      crop,
      quantityKg,
      originMunicipality,
      readyDate,
    });
    if (!validation.isValid) return;

    publishHarvestContext({
      crop,
      quantityKg: Number(quantityKg),
      originMunicipality,
      readyDate,
      details:
        variety.trim() || grade.trim() || packaging.trim()
          ? {
              ...(variety.trim() ? { variety: variety.trim().slice(0, 80) } : {}),
              ...(grade.trim() ? { grade: grade.trim().slice(0, 80) } : {}),
              ...(packaging.trim() ? { packaging: packaging.trim().slice(0, 80) } : {}),
            }
          : undefined,
    });
  }

  function focusField(field: string) {
    const target =
      field === 'crop'
        ? cropChoice === 'other'
          ? otherCropInputEl
          : cropGroupEl
        : field === 'quantityKg'
          ? quantityInputEl
          : field === 'originMunicipality'
            ? municipalitySelectEl
            : readyDateInputEl;
    target?.focus();
  }

  function inputLabel(field: string) {
    if (field === 'crop') return t('cropLabel', lang);
    if (field === 'quantityKg') return t('quantityLabel', lang);
    if (field === 'originMunicipality') return t('locationLabel', lang);
    return t('readyDateLabel', lang);
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    const urlCrop = params.get('crop');
    const urlKg = Number(params.get('kg'));
    const urlOrigin = params.get('origin');
    const urlReady = params.get('ready');
    const hasHarvestQuery = Boolean(urlCrop || params.has('kg') || urlOrigin || urlReady);

    if (urlLang === 'en' || urlLang === 'fil') lang = urlLang;

    if (hasHarvestQuery) {
      const supportedCrop = SUPPORTED_CROPS.some((item) => item.key === urlCrop);
      cropChoice = supportedCrop ? urlCrop! : urlCrop ? 'other' : cropChoice;
      otherCrop = supportedCrop ? '' : urlCrop || '';
      quantityKg = Number.isFinite(urlKg) && urlKg > 0 ? urlKg : quantityKg;
      originMunicipality = LAGUNA_MUNICIPALITIES.some((item) => item.id === urlOrigin) ? urlOrigin! : originMunicipality;
      readyDate = urlReady || readyDate;
      variety = params.get('variety') || '';
      grade = params.get('grade') || '';
      packaging = (params.get('packaging') || '').slice(0, 80);
      variety = variety.slice(0, 80);
      grade = grade.slice(0, 80);
      showDetails = Boolean(variety || grade || packaging);
      queueMicrotask(saveAndShareDraft);
      return;
    }

    restoreDraft(safeStorage.getItem<HarvestDraft | null>(DRAFT_KEY, null) ?? {
      cropChoice,
      otherCrop,
      quantityKg,
      originMunicipality,
      readyDate,
      variety,
      grade,
      packaging,
    });
    queueMicrotask(saveAndShareDraft);
  });

  onMount(() => subscribeHarvestContext((next) => {
    const supportedCrop = SUPPORTED_CROPS.some((item) => item.key === next.crop);
    cropChoice = supportedCrop ? next.crop : 'other';
    otherCrop = supportedCrop ? '' : next.crop;
    quantityKg = next.quantityKg;
    originMunicipality = next.originMunicipality;
    readyDate = next.readyDate || todayInManila();
    variety = next.details?.variety || '';
    grade = next.details?.grade || '';
    packaging = next.details?.packaging || '';
    showDetails = Boolean(variety || grade || packaging);
    saveDraft();
  }));

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const validation = validateHarvestInput({
      crop: cropLabel(),
      quantityKg,
      originMunicipality,
      readyDate,
    });

    if (!validation.isValid) {
      errors = lang === 'fil' ? validation.errorsFil : validation.errors;
      requestAnimationFrame(() => errorSummaryEl?.focus());
      return;
    }

    errors = {};
    saveDraft();
    const queryString = serializeDiscoverQuery(
      {
        crop: cropLabel(),
        quantityKg: Number(quantityKg),
        originMunicipality,
        readyDate,
        details:
          variety.trim() || grade.trim() || packaging.trim()
            ? {
                ...(variety.trim() ? { variety: variety.trim() } : {}),
                ...(grade.trim() ? { grade: grade.trim() } : {}),
                ...(packaging.trim() ? { packaging: packaging.trim() } : {}),
              }
            : undefined,
      },
      'list',
      undefined,
      lang,
    );
    window.location.href = `/discover?${queryString}`;
  }
</script>

<form onsubmit={handleSubmit} oninput={() => queueMicrotask(saveAndShareDraft)} onchange={() => queueMicrotask(saveAndShareDraft)} novalidate class="harvest-ticket space-y-6 p-4 sm:p-6">
  <div class="flex items-start justify-between gap-4 border-b quiet-rule pb-5">
    <div class="max-w-xl">
      <h2 class="text-2xl font-bold tracking-tight text-[#20251E] sm:text-3xl">{lang === 'fil' ? 'Ilagay ang ani mo' : 'Describe your harvest'}</h2>
      <p class="mt-2 text-sm leading-relaxed text-[#4A5245] sm:text-base">{lang === 'fil' ? 'Makikita mo kung saan maaaring dalhin ang ani, kung gaano karami ang kaya nilang tanggapin, at kung ano ang kailangang kumpirmahin.' : 'See where your harvest could go, how much an outlet can take, and what you still need to confirm.'}</p>
    </div>
    <span class="hidden shrink-0 rounded-lg bg-[#FCECD8] px-3 py-2 text-xs font-semibold text-[#6E3511] sm:inline-block">{t('demoNotice', lang)}</span>
  </div>

  {#if Object.keys(errors).length > 0}
    <div bind:this={errorSummaryEl} tabindex="-1" role="alert" class="rounded-xl border border-[#6E3511]/35 bg-[#FCECD8]/60 p-4 text-sm text-[#20251E]">
      <p class="font-bold">{lang === 'fil' ? `Suriin ang ${Object.keys(errors).length} field` : `Check ${Object.keys(errors).length} field${Object.keys(errors).length > 1 ? 's' : ''}`}</p>
      <ul class="mt-2 list-inside list-disc space-y-1">
        {#each Object.entries(errors) as [field, message]}
          <li><button type="button" class="text-left font-semibold underline decoration-[#6E3511]/45 underline-offset-4" onclick={() => focusField(field)}>{inputLabel(field)}: {message}</button></li>
        {/each}
      </ul>
    </div>
  {/if}

  <fieldset id="harvest-crop" bind:this={cropGroupEl} tabindex="-1" class="min-w-0" aria-describedby={errors.crop ? 'crop-error' : undefined}>
    <legend class="text-sm font-bold text-[#20251E]">{t('cropLabel', lang)} <span class="text-[#6E3511]" aria-hidden="true">*</span></legend>
    <p class="mt-1 text-xs text-[#4A5245]">{lang === 'fil' ? 'Pumili ng pananim na aalamin para sa market fit.' : 'Choose the crop you want to check for market fit.'}</p>
    <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {#each SUPPORTED_CROPS as item}
        <label class="group relative cursor-pointer">
          <input class="peer sr-only" type="radio" name="crop" value={item.key} bind:group={cropChoice} />
          <span class="flex min-h-14 items-center justify-center rounded-lg border border-[#20251E]/15 bg-[#FFFDF8] px-3 text-center text-sm font-semibold text-[#20251E] transition-all group-hover:border-[#597928] peer-checked:border-[#597928] peer-checked:bg-[#486320] peer-checked:text-[#FFFDF8] peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#597928]">{lang === 'fil' ? item.labelFil : item.labelEn}</span>
        </label>
      {/each}
      <label class="group relative cursor-pointer">
        <input class="peer sr-only" type="radio" name="crop" value="other" bind:group={cropChoice} />
        <span class="flex min-h-14 items-center justify-center rounded-lg border border-[#20251E]/15 bg-[#FFFDF8] px-3 text-center text-sm font-semibold text-[#20251E] transition-all group-hover:border-[#597928] peer-checked:border-[#597928] peer-checked:bg-[#486320] peer-checked:text-[#FFFDF8] peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#597928]">{lang === 'fil' ? 'Ibang ani' : 'Other crop'}</span>
      </label>
    </div>
    {#if cropChoice === 'other'}
      <label class="mt-3 block">
        <span class="sr-only">{lang === 'fil' ? 'Ilagay ang uri ng ani' : 'Enter crop name'}</span>
        <input bind:this={otherCropInputEl} bind:value={otherCrop} type="text" maxlength="80" autocomplete="off" placeholder={lang === 'fil' ? 'Ilagay ang uri ng ani' : 'Enter crop name'} class={`min-h-12 w-full rounded-lg border bg-[#FFFDF8] px-3 text-base text-[#20251E] ${errors.crop ? 'border-[#6E3511]' : 'border-[#20251E]/15'} focus:border-[#597928] focus:outline-none focus:ring-2 focus:ring-[#597928]/25`} />
      </label>
      <p class="mt-2 text-xs leading-relaxed text-[#4A5245]">
        {lang === 'fil'
          ? 'Para sa ibang ani, hindi pa kumpleto ang detalyadong matching. Ang hindi tiyak na terms ay mananatiling “Kumpirmahin.”'
          : 'Detailed matching is not complete for other crops yet. Unknown terms will stay as “Contact to confirm.”'}
      </p>
    {/if}
    {#if errors.crop}<p id="crop-error" class="mt-2 text-sm font-semibold text-[#6E3511]">{errors.crop}</p>{/if}
  </fieldset>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <label class="block rounded-xl border border-[#20251E]/12 bg-[#FFFDF8]/80 p-4 transition-colors focus-within:border-[#597928] focus-within:ring-2 focus-within:ring-[#597928]/20">
      <span class="block text-sm font-bold text-[#20251E]">{t('quantityLabel', lang)} <span class="text-[#6E3511]" aria-hidden="true">*</span></span>
      <span class="mt-1 block text-xs text-[#4A5245]">{lang === 'fil' ? 'Kabuuang timbang na handa mong dalhin.' : 'Total weight you are ready to bring.'}</span>
      <span class="mt-3 flex items-center gap-2">
        <input id="harvest-quantity" bind:this={quantityInputEl} bind:value={quantityKg} type="number" min="1" max="100000" step="1" inputmode="numeric" aria-describedby={errors.quantityKg ? 'quantity-error' : undefined} class="min-h-10 min-w-0 flex-1 bg-transparent text-2xl font-bold text-[#20251E] outline-none" />
        <span class="font-tabular text-sm font-bold text-[#4A5245]">kg</span>
      </span>
      {#if errors.quantityKg}<span id="quantity-error" class="mt-2 block text-sm font-semibold text-[#6E3511]">{errors.quantityKg}</span>{/if}
    </label>

    <label class="block rounded-xl border border-[#20251E]/12 bg-[#FFFDF8]/80 p-4 transition-colors focus-within:border-[#597928] focus-within:ring-2 focus-within:ring-[#597928]/20">
      <span class="block text-sm font-bold text-[#20251E]">{t('locationLabel', lang)} <span class="text-[#6E3511]" aria-hidden="true">*</span></span>
      <span class="mt-1 block text-xs text-[#4A5245]">
        {lang === 'fil'
          ? 'Munisipalidad kung saan manggagaling ang ani. Ang sentro ng munisipyo ang batayang lokasyon para sa layo, hindi ang eksaktong bukid.'
          : 'Municipality where the harvest will leave from. Distance uses the municipality center as a reference point, not your exact farm.'}
      </span>
      <select id="harvest-origin" bind:this={municipalitySelectEl} bind:value={originMunicipality} aria-describedby={errors.originMunicipality ? 'origin-error' : undefined} class="mt-3 min-h-10 w-full bg-transparent text-base font-bold text-[#20251E] outline-none">
        {#each LAGUNA_MUNICIPALITIES as municipality}
          <option value={municipality.id}>{municipality.name}</option>
        {/each}
      </select>
      {#if errors.originMunicipality}<span id="origin-error" class="mt-2 block text-sm font-semibold text-[#6E3511]">{errors.originMunicipality}</span>{/if}
    </label>

    <label class="block rounded-xl border border-[#20251E]/12 bg-[#FFFDF8]/80 p-4 transition-colors focus-within:border-[#597928] focus-within:ring-2 focus-within:ring-[#597928]/20 sm:col-span-2">
      <span class="block text-sm font-bold text-[#20251E]">{t('readyDateLabel', lang)}</span>
      <span class="mt-1 block text-xs text-[#4A5245]">{lang === 'fil' ? 'Ilagay ang petsang handa nang dalhin ang ani.' : 'Set the day the harvest will be ready to move.'}</span>
      <input id="harvest-ready-date" bind:this={readyDateInputEl} bind:value={readyDate} type="date" min={todayInManila()} aria-describedby={errors.readyDate ? 'ready-date-error' : undefined} class="mt-3 min-h-10 w-full bg-transparent text-base font-bold text-[#20251E] outline-none" />
      {#if errors.readyDate}<span id="ready-date-error" class="mt-2 block text-sm font-semibold text-[#6E3511]">{errors.readyDate}</span>{/if}
    </label>
  </div>

  <div class="border-t quiet-rule pt-4">
    <button type="button" class="flex min-h-11 w-full items-center justify-between gap-4 text-left" aria-expanded={showDetails} onclick={() => (showDetails = !showDetails)}>
      <span>
        <span class="block text-sm font-bold text-[#20251E]">{lang === 'fil' ? 'Magdagdag ng barayti, grade, o packaging' : 'Add variety, grade, or packaging'} <span class="font-normal text-[#4A5245]">({lang === 'fil' ? 'opsyonal' : 'optional'})</span></span>
        <span class="mt-1 block text-xs text-[#4A5245]">{lang === 'fil' ? 'Makakatulong ito kung may partikular na requirement ang outlet.' : 'These details help when an outlet has specific requirements.'}</span>
      </span>
      <svg class={`h-5 w-5 shrink-0 text-[#597928] transition-transform ${showDetails ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {#if showDetails}
      <div class="mt-4 grid grid-cols-1 gap-3 border-t quiet-rule pt-4 sm:grid-cols-3">
        <label><span class="block text-xs font-bold text-[#20251E]">{t('varietyLabel', lang)}</span><input bind:value={variety} type="text" maxlength="80" placeholder={lang === 'fil' ? 'hal. Diamante' : 'e.g. Diamante'} class="mt-2 min-h-11 w-full rounded-lg border border-[#20251E]/15 bg-[#FFFDF8] px-3 text-sm text-[#20251E]" /></label>
        <label><span class="block text-xs font-bold text-[#20251E]">{t('gradeLabel', lang)}</span><input bind:value={grade} type="text" maxlength="80" placeholder={lang === 'fil' ? 'hal. Grade A' : 'e.g. Grade A'} class="mt-2 min-h-11 w-full rounded-lg border border-[#20251E]/15 bg-[#FFFDF8] px-3 text-sm text-[#20251E]" /></label>
        <label><span class="block text-xs font-bold text-[#20251E]">{t('packagingLabel', lang)}</span><input bind:value={packaging} type="text" maxlength="80" placeholder={lang === 'fil' ? 'hal. plastic crate' : 'e.g. plastic crate'} class="mt-2 min-h-11 w-full rounded-lg border border-[#20251E]/15 bg-[#FFFDF8] px-3 text-sm text-[#20251E]" /></label>
      </div>
    {/if}
  </div>

  <button type="submit" class="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#486320] px-6 py-3 text-base font-bold text-[#FFFDF8] shadow-[0_14px_28px_-18px_rgba(32,37,30,0.9)] transition-all hover:-translate-y-0.5 hover:bg-[#3A5219] focus-visible:ring-4 focus-visible:ring-[#597928]/30 active:translate-y-0">
    <span>{t('findPlacesAction', lang)}</span>
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
  </button>

  <p class="text-center text-xs leading-relaxed text-[#4A5245]">{t('noAccountNeeded', lang)} <span class="text-[#6E3511]">{t('confirmTermsNotice', lang)}</span></p>
</form>
