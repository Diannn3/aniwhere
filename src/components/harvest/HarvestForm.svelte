<script lang="ts">
  import { onMount } from 'svelte';
  import { SUPPORTED_CROPS } from '../../lib/domain/crops';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { validateHarvestInput } from '../../lib/domain/validation';
  import { parseDiscoverQuery, serializeDiscoverQuery, todayInManila } from '../../lib/state/url-state';
  import { t } from '../../content/translations';

  let { initialLang = 'fil' }: { initialLang?: 'en' | 'fil' } = $props();

  let crop = $state('tomato');
  let quantityKg = $state(300);
  let originMunicipality = $state('los-banos');
  let readyDate = $state(todayInManila());
  let variety = $state('');
  let grade = $state('');
  let packaging = $state('');
  let showDetails = $state(false);
  let lang = $state<'en' | 'fil'>(initialLang);
  let linkIssues = $state<string[]>([]);

  let errors = $state<Record<string, string>>({});
  let formSubmitted = $state(false);

  let cropSelectEl: HTMLSelectElement | null = $state(null);
  let quantityInputEl: HTMLInputElement | null = $state(null);
  let municipalitySelectEl: HTMLSelectElement | null = $state(null);
  let readyDateInputEl: HTMLInputElement | null = $state(null);

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const parsed = parseDiscoverQuery(urlParams);
    linkIssues = parsed.issues;
    crop = parsed.harvest.crop;
    quantityKg = parsed.harvest.quantityKg;
    originMunicipality = parsed.harvest.originMunicipality;
    readyDate = parsed.harvest.readyDate || todayInManila();
    variety = parsed.harvest.details?.variety || '';
    grade = parsed.harvest.details?.grade || '';
    packaging = parsed.harvest.details?.packaging || '';
    showDetails = Boolean(variety || grade || packaging);
    lang = parsed.lang;
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    formSubmitted = true;

    const validation = validateHarvestInput({
      crop,
      quantityKg,
      originMunicipality,
      readyDate,
    });

    if (!validation.isValid) {
      errors = lang === 'fil' ? validation.errorsFil : validation.errors;
      if (errors.crop && cropSelectEl) {
        cropSelectEl.focus();
      } else if (errors.quantityKg && quantityInputEl) {
        quantityInputEl.focus();
      } else if (errors.originMunicipality && municipalitySelectEl) {
        municipalitySelectEl.focus();
      } else if (errors.readyDate && readyDateInputEl) {
        readyDateInputEl.focus();
      }
      return;
    }

    errors = {};

    const queryString = serializeDiscoverQuery(
      {
        crop,
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
      lang
    );

    window.location.href = `/discover?${queryString}`;
  }
</script>

<form onsubmit={handleSubmit} novalidate class="farmer-screen space-y-4">
  {#if linkIssues.length > 0}<p role="alert" class="rounded-xl border border-[#6E3511]/30 bg-[#FCECD8] p-4 text-base text-[#6E3511]">{lang === 'fil' ? 'May di-wastong detalye sa link. Suriin ang ani, dami, lugar, at petsa bago maghanap.' : 'The shared link has invalid details. Check the crop, quantity, location, and date before searching.'}</p>{/if}
  <!-- 2x2 Input Cards Grid (Maintains 2 columns across all viewports) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
    
    <!-- 1. Crop Card -->
    <label
      for="harvest-crop"
      class="block bg-[#FFFDF8] border rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:border-[#597928]/60 focus-within:ring-2 focus-within:ring-[#597928] focus-within:border-[#597928] shadow-xs {errors.crop ? 'border-red-500 bg-red-50/20' : 'border-[#20251E]/15'}"
    >
      <div class="flex items-center gap-1.5 text-xs font-semibold text-[#20251E] mb-1">
        <svg class="w-3.5 h-3.5 text-[#597928] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 5 4 9 9 9 1 0 2-.2 3-.5-1-1.5-1.5-3.5-1.5-5.5 0-4.5 3-8 7-9-1.5-2.5-4.5-4-7.5-4z" />
        </svg>
        <span class="truncate">{t('cropLabel', lang)}</span>
        <span class="text-[#6E3511]" aria-hidden="true">*</span>
      </div>
      <div class="relative">
        <select
          id="harvest-crop"
          bind:this={cropSelectEl}
          bind:value={crop}
          aria-describedby={errors.crop ? 'crop-error' : undefined}
          class="w-full bg-transparent text-sm sm:text-base font-semibold text-[#20251E] outline-none cursor-pointer pr-4 py-1 truncate"
        >
          {#each SUPPORTED_CROPS as item}
            <option value={item.key}>
              {lang === 'fil' ? item.labelFil : item.labelEn}
            </option>
          {/each}
          <option value="other">
            {lang === 'fil' ? 'Iba pang pananim' : 'Other crop'}
          </option>
        </select>
      </div>
      {#if errors.crop}
        <p id="crop-error" class="text-[11px] font-medium text-red-700 mt-1" role="alert">
          {errors.crop}
        </p>
      {/if}
    </label>

    <!-- 2. Quantity Card -->
    <label
      for="harvest-quantity"
      class="block bg-[#FFFDF8] border rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:border-[#597928]/60 focus-within:ring-2 focus-within:ring-[#597928] focus-within:border-[#597928] shadow-xs {errors.quantityKg ? 'border-red-500 bg-red-50/20' : 'border-[#20251E]/15'}"
    >
      <div class="flex items-center gap-1.5 text-xs font-semibold text-[#20251E] mb-1">
        <svg class="w-3.5 h-3.5 text-[#597928] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 3h12l2 6H4L6 3zM4 9v11a2 2 0 002 2h12a2 2 0 002-2V9" />
        </svg>
        <span class="truncate">{t('quantityLabel', lang)}</span>
        <span class="text-[#6E3511]" aria-hidden="true">*</span>
      </div>
      <div class="flex items-center justify-between">
        <input
          id="harvest-quantity"
          type="number"
          min="1"
          max="100000"
          step="1"
          bind:this={quantityInputEl}
          bind:value={quantityKg}
          aria-describedby={errors.quantityKg ? 'quantity-error' : undefined}
          class="w-full bg-transparent text-sm sm:text-base font-semibold font-tabular text-[#20251E] outline-none py-1"
          placeholder="300"
        />
        <span class="text-xs sm:text-sm font-semibold text-[#6B7265] pl-1 select-none">
          kg
        </span>
      </div>
      {#if errors.quantityKg}
        <p id="quantity-error" class="text-[11px] font-medium text-red-700 mt-1" role="alert">
          {errors.quantityKg}
        </p>
      {/if}
    </label>

    <!-- 3. Location Card -->
    <label
      for="harvest-origin"
      class="block bg-[#FFFDF8] border rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:border-[#597928]/60 focus-within:ring-2 focus-within:ring-[#597928] focus-within:border-[#597928] shadow-xs {errors.originMunicipality ? 'border-red-500 bg-red-50/20' : 'border-[#20251E]/15'}"
    >
      <div class="flex items-center gap-1.5 text-xs font-semibold text-[#20251E] mb-1">
        <svg class="w-3.5 h-3.5 text-[#597928] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12zM12 11a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
        <span class="truncate">{t('locationLabel', lang)}</span>
        <span class="text-[#6E3511]" aria-hidden="true">*</span>
      </div>
      <div class="relative">
        <select
          id="harvest-origin"
          bind:this={municipalitySelectEl}
          bind:value={originMunicipality}
          aria-describedby={errors.originMunicipality ? 'origin-error' : undefined}
          class="w-full bg-transparent text-sm sm:text-base font-semibold text-[#20251E] outline-none cursor-pointer pr-4 py-1 truncate"
        >
          {#each LAGUNA_MUNICIPALITIES as mun}
            <option value={mun.id}>{mun.name}</option>
          {/each}
        </select>
      </div>
      {#if errors.originMunicipality}
        <p id="origin-error" class="text-[11px] font-medium text-red-700 mt-1" role="alert">
          {errors.originMunicipality}
        </p>
      {/if}
    </label>

    <!-- 4. Ready Date Card -->
    <label
      for="harvest-date"
      class="block bg-[#FFFDF8] border rounded-2xl p-3 sm:p-4 cursor-pointer transition-all hover:border-[#597928]/60 focus-within:ring-2 focus-within:ring-[#597928] focus-within:border-[#597928] shadow-xs {errors.readyDate ? 'border-red-500 bg-red-50/20' : 'border-[#20251E]/15'}"
    >
      <div class="flex items-center gap-1.5 text-xs font-semibold text-[#20251E] mb-1">
        <svg class="w-3.5 h-3.5 text-[#597928] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span class="truncate">{t('readyDateLabel', lang)}</span>
      </div>
      <input
        id="harvest-date"
        type="date"
        min={todayInManila()}
        bind:this={readyDateInputEl}
        bind:value={readyDate}
        aria-describedby={errors.readyDate ? 'ready-date-error' : undefined}
        class="w-full bg-transparent text-sm sm:text-base font-semibold text-[#20251E] outline-none py-1"
      />
      {#if errors.readyDate}
        <p id="ready-date-error" class="text-[11px] font-medium text-red-700 mt-1" role="alert">
          {errors.readyDate}
        </p>
      {/if}
    </label>

  </div>

  <div class="rounded-2xl border border-[#20251E]/10 bg-[#FAF7EE] overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left min-h-[48px]"
      aria-expanded={showDetails}
      onclick={() => (showDetails = !showDetails)}
    >
      <div>
        <div class="text-sm font-semibold text-[#20251E]">{t('harvestDetailsToggle', lang)}</div>
        <div class="text-[11px] text-[#6B7265] mt-0.5">{t('harvestDetailsHint', lang)}</div>
      </div>
      <svg
        class="w-4 h-4 text-[#597928] transition-transform {showDetails ? 'rotate-180' : ''}"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    {#if showDetails}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4 border-t border-[#20251E]/8 pt-3">
        <label class="space-y-1">
          <span class="text-xs font-semibold text-[#20251E]">{t('varietyLabel', lang)}</span>
          <input
            type="text"
            bind:value={variety}
            placeholder={lang === 'fil' ? 'hal. Diamante' : 'e.g. Diamante'}
            class="w-full rounded-xl border border-[#20251E]/15 bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#597928]/35"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs font-semibold text-[#20251E]">{t('gradeLabel', lang)}</span>
          <input
            type="text"
            bind:value={grade}
            placeholder={lang === 'fil' ? 'hal. Grade A' : 'e.g. Grade A'}
            class="w-full rounded-xl border border-[#20251E]/15 bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#597928]/35"
          />
        </label>
        <label class="space-y-1">
          <span class="text-xs font-semibold text-[#20251E]">{t('packagingLabel', lang)}</span>
          <input
            type="text"
            bind:value={packaging}
            placeholder={lang === 'fil' ? 'hal. plastic crate' : 'e.g. plastic crate'}
            class="w-full rounded-xl border border-[#20251E]/15 bg-[#FFFDF8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#597928]/35"
          />
        </label>
      </div>
    {/if}
  </div>

  <!-- Primary Submit Button: Restrained Pill matching Reference 01 -->
  <button
    type="submit"
    class="w-full min-h-[52px] bg-[#597928] hover:bg-[#486320] text-[#FFFDF8] font-semibold text-base px-6 py-3.5 rounded-full shadow-sm transition-all focus:outline-none focus:ring-3 focus:ring-[#597928]/40 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
  >
    <span>{t('findPlacesAction', lang)}</span>
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
    </svg>
  </button>

  <!-- Explanatory Trust & Verification Note -->
  <div class="text-center pt-2 space-y-1">
    <p class="text-xs text-[#4A5245] font-medium">
      {t('noAccountNeeded', lang)}
    </p>
    <p class="text-[11px] text-[#6E3511]">
      {t('confirmTermsNotice', lang)}
    </p>
  </div>
</form>
