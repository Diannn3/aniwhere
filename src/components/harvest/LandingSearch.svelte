<script lang="ts">
  import { onMount } from 'svelte';
  import { SUPPORTED_CROPS } from '../../lib/domain/crops';

  let { lang: initialLang = 'en' }: { lang?: 'en' | 'fil' } = $props();
  let lang = $state<'en' | 'fil'>(initialLang);
  let crop = $state('');
  let error = $state(false);
  onMount(() => {
    lang = new URLSearchParams(window.location.search).get('lang') === 'fil' ? 'fil' : 'en';
  });

  function continueToHarvest(event: SubmitEvent) {
    event.preventDefault();
    if (!crop.trim()) {
      error = true;
      return;
    }
    error = false;
    const params = new URLSearchParams({ crop: crop.trim() });
    if (lang === 'fil') params.set('lang', 'fil');
    window.location.href = `/?${params}#harvest-details`;
  }
</script>

<form class="landing-search" onsubmit={continueToHarvest} role="search" aria-label={lang === 'fil' ? 'Hanapin ang ani' : 'Search by crop'}>
  <label class="sr-only" for="landing-crop">{lang === 'fil' ? 'Anong ani ang ibebenta mo?' : 'What are you harvesting?'}</label>
  <svg class="landing-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21v-8m0 0c-5 0-8-3-8-8 5 0 8 3 8 8Zm0 0c0-5 3-8 8-8 0 5-3 8-8 8Z"/></svg>
  <input id="landing-crop" bind:value={crop} oninput={() => (error = false)} aria-invalid={error} aria-describedby={error ? 'landing-crop-error' : undefined} maxlength="80" autocomplete="off" list="landing-crop-suggestions" placeholder={lang === 'fil' ? 'Anong ani ang ibebenta mo?' : 'What are you harvesting?'} />
  <datalist id="landing-crop-suggestions">
    {#each SUPPORTED_CROPS as suggestion (suggestion.key)}
      <option value={lang === 'fil' ? suggestion.labelFil : suggestion.labelEn}></option>
      {#each suggestion.aliases.filter((alias) => alias !== (lang === 'fil' ? suggestion.labelFil : suggestion.labelEn).toLowerCase()) as alias (alias)}
        <option value={alias} label={lang === 'fil' ? suggestion.labelFil : suggestion.labelEn}></option>
      {/each}
    {/each}
  </datalist>
  <button type="submit">{lang === 'fil' ? 'Maghanap ng outlet' : 'Find outlets'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>
</form>
{#if error}<p id="landing-crop-error" role="alert" class="mt-3 font-semibold text-white">{lang === 'fil' ? 'Ilagay muna ang pangalan ng ani.' : 'Enter a crop to continue.'}</p>{/if}

<style>
  .landing-search { display: flex; align-items: center; gap: .65rem; padding: .5rem; border-radius: 12px; background: #fffdf8; color: #20251e; box-shadow: 0 18px 45px -18px rgba(8, 17, 5, .55); }
  .landing-search-icon { width: 1.65rem; height: 1.65rem; flex: none; margin-left: 1rem; color: #486320; }
  input { min-width: 0; flex: 1; height: 3.5rem; padding: 0 .75rem; border: 0; background: transparent; color: #20251e; font-size: 1.25rem; outline: none; }
  input::placeholder { color: #535a50; opacity: 1; }
  input:focus-visible { outline: 3px solid #597928; outline-offset: -3px; border-radius: 4px; }
  button { display: inline-flex; min-height: 3.5rem; align-items: center; justify-content: center; gap: .75rem; flex: none; padding: .75rem 1.5rem; border-radius: 8px; background: #486320; color: #fffdf8; font-weight: 700; transition: background .2s ease, transform .2s ease; cursor: pointer; }
  button:hover { background: #354e16; transform: translateY(-1px); }
  button svg { width: 1.2rem; height: 1.2rem; }
  @media (max-width: 640px) { .landing-search { flex-wrap: wrap; gap: 0; } .landing-search-icon { margin-left: .65rem; } input { width: calc(100% - 3rem); font-size: 1rem; } button { width: 100%; } }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
