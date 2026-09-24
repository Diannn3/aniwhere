<script lang="ts">
  import { onMount } from 'svelte';
  import {
    BAGSAKAN_STORAGE_KEY, EMPTY_BAGSAKAN_STATE, discardCorruptBagsakanState,
    effectiveDemandStatus, readBagsakanState, writeBagsakanState,
    type BagsakanDemoDemand, type BagsakanDemoProfile, type BagsakanDemoState,
  } from '../../lib/bagsakan/state';
  import { composeLocalBagsakanOutlets } from '../../lib/data/local-bagsakan';
  import { outletDetailHref } from '../../lib/data/outlet-links';
  import { refreshClientMarketOutlets, subscribeClientMarketOutlets } from '../../lib/data/client-market';
  import { todayInManila } from '../../lib/state/url-state';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import ProfileForm from './ProfileForm.svelte';
  import DemandForm from './DemandForm.svelte';
  import NeedCard from './NeedCard.svelte';
  import BagsakanIntro from './BagsakanIntro.svelte';

  let { initialLang = 'en' }: { initialLang?: 'en' | 'fil' } = $props();
  let lang = $state(initialLang);
  let state = $state<BagsakanDemoState>({ ...EMPTY_BAGSAKAN_STATE, demands: [] });
  let loaded = $state(false);
  let corrupt = $state(false);
  let unavailable = $state(false);
  let writeFailed = $state(false);
  let confirmDiscard = $state(false);
  let editingProfile = $state(false);
  let creatingNeed = $state(false);
  let editingNeedId = $state<string | null>(null);
  let notice = $state('');
  let today = $state(todayInManila());
  const isFil = $derived(lang === 'fil');
  const profile = $derived(state.profile);
  const editingNeed = $derived(state.demands.find((item) => item.id === editingNeedId) ?? null);
  const localOutlet = $derived(composeLocalBagsakanOutlets(state, today)[0]);
  const municipality = $derived(LAGUNA_MUNICIPALITIES.find((item) => item.id === profile?.municipalityId));

  onMount(() => {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang === 'en' || urlLang === 'fil') lang = urlLang;
    function load() {
      const result = readBagsakanState();
      state = result.state;
      corrupt = result.error === 'corrupt';
      unavailable = result.error === 'unavailable';
      loaded = true;
      today = todayInManila();
    }
    function onStorage(event: StorageEvent) {
      if (event.key !== BAGSAKAN_STORAGE_KEY) return;
      editingNeedId = null;
      creatingNeed = false;
      editingProfile = false;
      load();
    }
    load();
    const unsubscribe = subscribeClientMarketOutlets(() => { today = todayInManila(); });
    window.addEventListener('storage', onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  });

  function persist(next: BagsakanDemoState, message: string): boolean {
    if (!writeBagsakanState(next)) {
      writeFailed = true;
      notice = isFil ? 'Hindi na-save sa device. Suriin ang browser storage at subukan muli.' : 'Could not save on this device. Check browser storage and try again.';
      return false;
    }
    state = next;
    writeFailed = false;
    notice = message;
    refreshClientMarketOutlets();
    return true;
  }

  function saveProfile(nextProfile: BagsakanDemoProfile) {
    if (persist({ ...state, profile: nextProfile }, isFil ? 'Na-save ang bagsakan sa device na ito.' : 'Bagsakan saved on this device.')) editingProfile = false;
  }
  function saveNeed(nextNeed: BagsakanDemoDemand) {
    const demands = state.demands.some((item) => item.id === nextNeed.id)
      ? state.demands.map((item) => item.id === nextNeed.id ? nextNeed : item)
      : [...state.demands, nextNeed];
    if (persist({ ...state, demands }, isFil ? 'Na-save ang pangangailangan sa device na ito.' : 'Need saved on this device.')) {
      creatingNeed = false;
      editingNeedId = null;
    }
  }
  function updateStatus(demand: BagsakanDemoDemand, target: 'paused' | 'active') {
    if (target === 'active' && (demand.validFrom > todayInManila() || demand.validUntil < todayInManila())) {
      editingNeedId = demand.id;
      creatingNeed = false;
      notice = isFil ? 'Baguhin ang petsa bago ipagpatuloy ang pangangailangan.' : 'Update the buying dates before resuming this need.';
      return;
    }
    saveNeed({ ...demand, status: target, updatedAt: new Date().toISOString() });
  }
  function removeNeed(id: string) {
    if (persist({ ...state, demands: state.demands.filter((item) => item.id !== id) }, isFil ? 'Naalis ang pangangailangan sa device na ito.' : 'Need removed from this device.')) editingNeedId = null;
  }
  function previewHref(demand: BagsakanDemoDemand): string {
    if (!localOutlet || !profile) return '/bagsakan';
    return outletDetailHref(localOutlet, {
      crop: demand.cropKey,
      quantityKg: 300,
      originMunicipality: 'los-banos',
      readyDate: today,
    }, lang);
  }
  function discard() {
    if (!discardCorruptBagsakanState()) {
      writeFailed = true;
      return;
    }
    confirmDiscard = false;
    const result = readBagsakanState();
    state = result.state;
    corrupt = Boolean(result.error);
    refreshClientMarketOutlets();
  }
</script>

<BagsakanIntro {lang} />

<div class="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
  {#if !loaded}<p role="status">{isFil ? 'Binubuksan ang naka-save na datos…' : 'Loading saved data…'}</p>
  {:else if corrupt}
    <div role="alert" class="rounded-xl border border-[#6E3511]/35 bg-[#FCECD8] p-5"><h2 class="text-xl font-bold">{isFil ? 'Hindi mabasa ang naka-save na datos' : 'Saved data cannot be read'}</h2><p class="mt-2">{isFil ? 'Hindi ginalaw ang datos sa browser. Maaari mo itong alisin kung nais magsimulang muli.' : 'The browser data was left untouched. You can discard it to start again.'}</p>{#if !confirmDiscard}<button type="button" onclick={() => { confirmDiscard = true; }} class="mt-4 min-h-11 rounded-lg border border-[#6E3511] px-4 font-semibold">{isFil ? 'Magsimulang muli' : 'Start again'}</button>{:else}<div class="mt-4 flex flex-wrap gap-2"><button type="button" onclick={discard} class="min-h-11 rounded-lg bg-[#6E3511] px-4 font-bold text-white">{isFil ? 'Oo, alisin ang naka-save' : 'Yes, discard saved data'}</button><button type="button" onclick={() => { confirmDiscard = false; }} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold">{isFil ? 'Kanselahin' : 'Cancel'}</button></div>{/if}</div>
  {:else if unavailable}
    <div role="alert" class="rounded-xl border border-[#6E3511]/35 bg-[#FCECD8] p-5"><h2 class="text-xl font-bold">{isFil ? 'Hindi magamit ang browser storage' : 'Browser storage is unavailable'}</h2><p class="mt-2">{isFil ? 'Hindi mase-save ang iyong bagsakan sa device na ito. Payagan ang browser storage at i-reload ang pahina.' : 'Your bagsakan cannot be saved on this device. Enable browser storage and reload the page.'}</p></div>
  {:else}
    {#if notice}<p role={writeFailed ? 'alert' : 'status'} class={`rounded-lg border px-4 py-3 text-sm font-semibold ${writeFailed ? 'border-[#6E3511]/35 bg-[#FCECD8] text-[#6E3511]' : 'border-[#597928]/30 bg-[#EBF3DF] text-[#365118]'}`}>{notice}</p>{/if}
    {#if !profile || editingProfile}
      {#key profile?.id ?? 'new-profile'}<ProfileForm {profile} {lang} onSave={saveProfile} onCancel={profile ? () => { editingProfile = false; } : undefined} />{/key}
    {:else}
      <section class="border-y border-[#20251E]/20 py-5"><div class="flex flex-wrap items-start justify-between gap-4"><div><h2 class="text-2xl font-bold">{profile.name}</h2><p class="mt-1 text-[#4A5245]">{municipality?.name} · {profile.locationBasis === 'exact_pin' ? (isFil ? 'Eksaktong pin' : 'Exact pin') : (isFil ? 'Sentro ng bayan' : 'Municipality center')}</p></div><button type="button" onclick={() => { editingProfile = true; }} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8]">{isFil ? 'I-edit ang bagsakan' : 'Edit bagsakan'}</button></div></section>
      <section aria-labelledby="bag-needs-heading">
        <div class="flex flex-wrap items-end justify-between gap-4"><div><h2 id="bag-needs-heading" class="text-2xl font-bold tracking-tight">{isFil ? 'Kasalukuyang pangangailangan' : 'Current buying needs'}</h2><p class="mt-1 text-[#4A5245]">{isFil ? 'Isang pangangailangan bawat pananim. Baguhin ito kapag nagbago ang kapasidad o petsa.' : 'One need per crop. Edit it when capacity or dates change.'}</p></div>{#if !creatingNeed && !editingNeedId}<button type="button" onclick={() => { creatingNeed = true; }} class="min-h-11 rounded-lg bg-[#486320] px-5 font-bold text-white hover:bg-[#365118]">{isFil ? 'Magdagdag ng pangangailangan' : 'Add buying need'}</button>{/if}</div>
        {#if creatingNeed || editingNeedId}
          <div class="mt-5">{#key editingNeedId ?? 'new-need'}<DemandForm {profile} demands={state.demands} demand={editingNeed} {lang} onSave={saveNeed} onCancel={() => { creatingNeed = false; editingNeedId = null; }} onEditExisting={(id) => { editingNeedId = id; creatingNeed = false; }} />{/key}</div>
        {:else if state.demands.length === 0}
          <p class="mt-5 rounded-xl border border-dashed border-[#20251E]/25 p-6 text-[#4A5245]">{isFil ? 'Wala pang pangangailangan. Magdagdag ng pananim upang makita ang bagsakan sa farmer discovery sa device na ito.' : 'No needs yet. Add a crop to show this bagsakan in farmer discovery on this device.'}</p>
        {:else}
          <div class="mt-5">{#each state.demands as demand (demand.id)}<NeedCard {demand} status={effectiveDemandStatus(demand, today)} previewHref={previewHref(demand)} {lang} onEdit={() => { editingNeedId = demand.id; }} onPause={() => updateStatus(demand, 'paused')} onResume={() => updateStatus(demand, 'active')} onRemove={() => removeNeed(demand.id)} />{/each}</div>
        {/if}
      </section>
    {/if}
  {/if}
</div>
