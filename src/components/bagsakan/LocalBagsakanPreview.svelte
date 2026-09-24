<script lang="ts">
  import { onMount } from 'svelte';
  import OutletDetailExperience from '../places/OutletDetailExperience.svelte';
  import { getClientMarketOutlets, subscribeClientMarketOutlets } from '../../lib/data/client-market';
  import { parseDiscoverQuery, serializeDiscoverQuery } from '../../lib/state/url-state';
  import type { Outlet } from '../../lib/domain/types';

  let { initialLang = 'en' }: { initialLang?: 'en' | 'fil' } = $props();
  let lang = $state<'en' | 'fil'>(initialLang);
  let placeId = $state<string | undefined>();
  let outlets = $state<Outlet[]>([]);
  let ready = $state(false);
  let backHref = $state('/discover');

  onMount(() => {
    const parsed = parseDiscoverQuery(window.location.search);
    lang = parsed.lang;
    placeId = parsed.selectedPlaceId;
    backHref = `/discover?${serializeDiscoverQuery(parsed.harvest, 'list', undefined, parsed.lang)}`;
    outlets = getClientMarketOutlets();
    ready = true;
    return subscribeClientMarketOutlets((next) => { outlets = next; });
  });

  const outlet = $derived(outlets.find((item) => item.isLocalBagsakan && item.id === placeId));
</script>

{#if !ready}
  <div class="mx-auto max-w-3xl px-4 py-12 text-[#4A5245]" role="status">{initialLang === 'fil' ? 'Binubuksan ang preview…' : 'Opening preview…'}</div>
{:else if outlet}
  <OutletDetailExperience {outlet} initialLang={lang} />
{:else}
  <section class="mx-auto max-w-3xl px-4 py-12 sm:py-20" aria-labelledby="local-preview-missing-title">
    <h1 id="local-preview-missing-title" class="font-serif text-3xl font-bold text-[#20251E]">{lang === 'fil' ? 'Hindi available ang lokal na Bagsakan entry' : 'Local Bagsakan entry unavailable'}</h1>
    <p class="mt-4 max-w-2xl text-base leading-relaxed text-[#4A5245]">{lang === 'fil' ? 'Ang demo entry na ito ay nasa browser kung saan ito ginawa. Maaaring nabura ito o ibang device ang gamit mo. Hindi ito naka-publish sa live buyer network.' : 'This demo entry lives in the browser where it was created. It may have been removed, or you may be using another device. It is not published to a live buyer network.'}</p>
    <a href={backHref} class="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#486320] px-5 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#597928]">{lang === 'fil' ? 'Bumalik sa paghahanap' : 'Back to discovery'}</a>
  </section>
{/if}
