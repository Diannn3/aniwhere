<script lang="ts">
  import { onMount } from 'svelte';
  import { SUPPORTED_CROPS } from '../../lib/domain/crops';

  let { lang: initialLang = 'en' }: { lang?: 'en' | 'fil' } = $props();
  let lang = $state<'en' | 'fil'>(initialLang);
  let crop = $state('');
  let error = $state(false);
  let focused = $state(false);
  let active = $state(-1);
  const suggestions = $derived(crop.trim()
    ? SUPPORTED_CROPS.filter((item) =>
        [item.labelEn, item.labelFil, ...item.aliases].some((name) => name.toLowerCase().includes(crop.trim().toLowerCase()))
      ).slice(0, 5)
    : []);
  const showSuggestions = $derived(focused && suggestions.length > 0);

  function choose(index: number) {
    crop = lang === 'fil' ? suggestions[index].labelFil : suggestions[index].labelEn;
    focused = false;
    active = -1;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      focused = false;
      active = -1;
    } else if (showSuggestions && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      active = (active + (event.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length;
    } else if (showSuggestions && event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(active);
    }
  }
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
  <div class="crop-field" onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focused = false; }}>
    <input id="landing-crop" bind:value={crop} oninput={() => { error = false; focused = true; active = -1; }} onfocus={() => (focused = true)} onkeydown={handleKeydown} aria-invalid={error} aria-describedby={error ? 'landing-crop-error' : undefined} aria-autocomplete="list" aria-controls="landing-crop-suggestions" aria-expanded={showSuggestions} aria-activedescendant={showSuggestions && active >= 0 ? `landing-suggestion-${active}` : undefined} role="combobox" maxlength="80" autocomplete="off" placeholder={lang === 'fil' ? 'Anong ani ang ibebenta mo?' : 'What are you harvesting?'} />
    {#if showSuggestions}
      <ul id="landing-crop-suggestions" role="listbox" aria-label={lang === 'fil' ? 'Mga mungkahing ani' : 'Suggested crops'}>
        {#each suggestions as suggestion, index (suggestion.key)}
          <li id={`landing-suggestion-${index}`} role="option" aria-selected={active === index}>
            <button class="suggestion" type="button" onmousedown={(event) => event.preventDefault()} onclick={() => choose(index)}>{lang === 'fil' ? suggestion.labelFil : suggestion.labelEn}</button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <button type="submit">{lang === 'fil' ? 'Maghanap ng outlet' : 'Find outlets'} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>
</form>
{#if error}<p id="landing-crop-error" role="alert" class="mt-3 font-semibold text-white">{lang === 'fil' ? 'Ilagay muna ang pangalan ng ani.' : 'Enter a crop to continue.'}</p>{/if}

<style>
  .landing-search { display: flex; align-items: center; gap: .65rem; padding: .5rem; border-radius: 12px; background: #fffdf8; color: #20251e; box-shadow: 0 18px 45px -18px rgba(8, 17, 5, .55); }
  .landing-search-icon { width: 1.65rem; height: 1.65rem; flex: none; margin-left: 1rem; color: #486320; }
  .crop-field { position: relative; min-width: 0; flex: 1; }
  input { width: 100%; height: 3.5rem; padding: 0 .75rem; border: 0; background: transparent; color: #20251e; font-size: 1.25rem; outline: none; }
  input::placeholder { color: #535a50; opacity: 1; }
  input:focus-visible { outline: 3px solid #597928; outline-offset: -3px; border-radius: 4px; }
  ul { position: absolute; z-index: 10; top: calc(100% + .75rem); left: 0; right: 0; margin: 0; padding: .35rem; list-style: none; border: 1px solid var(--color-border-subtle); border-radius: 12px; background: #fffdf8; color: #20251e; box-shadow: 0 10px 25px -5px rgba(32, 37, 30, .18); text-align: left; }
  button { display: inline-flex; min-height: 3.5rem; align-items: center; justify-content: center; gap: .75rem; flex: none; padding: .75rem 1.5rem; border-radius: 8px; background: #486320; color: #fffdf8; font-weight: 700; transition: background .2s ease, transform .2s ease; cursor: pointer; }
  button:hover { background: #354e16; transform: translateY(-1px); }
  button svg { width: 1.2rem; height: 1.2rem; }
  .suggestion { display: block; width: 100%; min-height: 44px; padding: .6rem 1rem; border-radius: 8px; background: transparent; color: inherit; text-align: left; font-weight: 500; transition: none; }
  .suggestion:hover, li[aria-selected="true"] .suggestion { background: #fcecd8; transform: none; }
  .suggestion:focus-visible { outline: 2px solid #597928; outline-offset: -2px; }
  @media (max-width: 640px) { .landing-search { position: relative; flex-wrap: wrap; gap: 0; } .landing-search-icon { margin-left: .65rem; } .crop-field { position: static; width: calc(100% - 3rem); flex: none; } input { font-size: 1rem; } button[type="submit"] { width: 100%; } ul { top: calc(100% + .5rem); left: .5rem; right: .5rem; } }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
</style>
