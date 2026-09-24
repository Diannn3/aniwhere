<script lang="ts">
  import { validateProfile, type BagsakanDemoProfile } from '../../lib/bagsakan/state';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import PinPicker from './PinPicker.svelte';

  let { profile = null, lang = 'en', onSave, onCancel }: {
    profile?: BagsakanDemoProfile | null;
    lang?: 'en' | 'fil';
    onSave: (profile: BagsakanDemoProfile) => void;
    onCancel?: () => void;
  } = $props();

  let name = $state(profile?.name ?? '');
  let municipalityId = $state(profile?.municipalityId ?? '');
  let latInput = $state(profile ? String(profile.lat) : '');
  let lngInput = $state(profile ? String(profile.lng) : '');
  let locationBasis = $state<'municipality_center' | 'exact_pin'>(profile?.locationBasis ?? 'municipality_center');
  let errors = $state<Record<string, string>>({});
  const isFil = $derived(lang === 'fil');
  const municipality = $derived(LAGUNA_MUNICIPALITIES.find((item) => item.id === municipalityId));
  const errorsFil: Record<string, string> = {
    name: 'Maglagay ng pangalan ng bagsakan na hanggang 100 karakter.',
    municipalityId: 'Pumili ng bayan o lungsod sa Laguna.',
    lat: 'Maglagay ng latitude sa loob ng mapa ng Laguna.',
    lng: 'Maglagay ng longitude sa loob ng mapa ng Laguna.',
    locationBasis: 'Ibalik ang pin sa sentro ng napiling bayan.',
  };

  function chooseMunicipality() {
    const selected = LAGUNA_MUNICIPALITIES.find((item) => item.id === municipalityId);
    latInput = selected ? String(selected.lat) : '';
    lngInput = selected ? String(selected.lng) : '';
    locationBasis = 'municipality_center';
    errors = {};
  }

  function setPin(lat: number, lng: number) {
    latInput = String(lat);
    lngInput = String(lng);
    locationBasis = 'exact_pin';
    errors = {};
  }

  function save(event: SubmitEvent) {
    event.preventDefault();
    const candidate: BagsakanDemoProfile = {
      id: profile?.id ?? crypto.randomUUID(),
      name: name.trim(),
      municipalityId,
      lat: String(latInput).trim() === '' ? NaN : Number(latInput),
      lng: String(lngInput).trim() === '' ? NaN : Number(lngInput),
      locationBasis,
      updatedAt: new Date().toISOString(),
    };
    errors = validateProfile(candidate);
    if (isFil) errors = Object.fromEntries(Object.entries(errors).map(([key, message]) => [key, errorsFil[key] ?? message]));
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      document.getElementById(`bag-profile-${first === 'locationBasis' ? 'lat' : first}`)?.focus();
      return;
    }
    onSave(candidate);
  }
</script>

<form onsubmit={save} novalidate class="space-y-6 rounded-xl border border-[#20251E]/15 bg-white p-4 sm:p-6">
  <div>
    <h2 class="text-2xl font-bold tracking-tight">{profile ? (isFil ? 'I-edit ang bagsakan' : 'Edit your bagsakan') : (isFil ? 'Ipakilala ang bagsakan' : 'Set up your bagsakan')}</h2>
    <p class="mt-2 text-[#4A5245]">{isFil ? 'Ilagay ang pangalan at lokasyon na makikita sa farmer preview sa device na ito.' : 'Enter the name and location shown in the farmer preview on this device.'}</p>
  </div>
  {#if Object.keys(errors).length}
    <div role="alert" class="rounded-lg border border-[#6E3511]/40 bg-[#FCECD8] p-3 text-[#6E3511]">
      <p class="font-semibold">{isFil ? 'Ayusin ang mga field na may error.' : 'Fix the fields marked below.'}</p>
      <ul class="mt-1 list-disc pl-5 text-sm">{#each Object.values(errors) as error}<li>{error}</li>{/each}</ul>
    </div>
  {/if}
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <label for="bag-profile-name" class="mb-1 block font-semibold">{isFil ? 'Pangalan ng bagsakan' : 'Bagsakan name'} *</label>
      <input id="bag-profile-name" bind:value={name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'bag-profile-name-error' : undefined} autocomplete="organization" class="min-h-11 w-full rounded-lg border border-[#20251E]/30 bg-[#FFFDF8] px-3 focus-visible:outline-2 focus-visible:outline-[#597928]" />
      {#if errors.name}<p id="bag-profile-name-error" class="mt-1 text-sm text-[#6E3511]">{errors.name}</p>{/if}
    </div>
    <div>
      <label for="bag-profile-municipalityId" class="mb-1 block font-semibold">{isFil ? 'Bayan o lungsod' : 'Municipality or city'} *</label>
      <select id="bag-profile-municipalityId" bind:value={municipalityId} onchange={chooseMunicipality} aria-invalid={Boolean(errors.municipalityId)} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 bg-[#FFFDF8] px-3 focus-visible:outline-2 focus-visible:outline-[#597928]">
        <option value="">{isFil ? 'Pumili ng lokasyon' : 'Choose a location'}</option>
        {#each LAGUNA_MUNICIPALITIES as item}<option value={item.id}>{item.name}</option>{/each}
      </select>
      {#if errors.municipalityId}<p class="mt-1 text-sm text-[#6E3511]">{errors.municipalityId}</p>{/if}
    </div>
  </div>
  {#if municipality}
    <div class="space-y-3">
      <p class="font-semibold">{isFil ? 'Pin sa mapa (opsyonal)' : 'Map pin (optional)'}</p>
      <p class="text-sm text-[#4A5245]">{isFil ? 'Nagsisimula ito sa sentro ng bayan. Gamitin lamang ang eksaktong pin kung alam ang lokasyon.' : 'This starts at the municipality center. Set an exact pin only if you know the location.'}</p>
      <PinPicker lat={Number(latInput)} lng={Number(lngInput)} {lang} onPick={setPin} />
      <div class="grid gap-4 sm:grid-cols-2">
        <div><label for="bag-profile-lat" class="mb-1 block font-semibold">{isFil ? 'Latitude ng pin' : 'Pin latitude'}</label><input id="bag-profile-lat" type="number" step="any" bind:value={latInput} oninput={() => { locationBasis = 'exact_pin'; }} aria-invalid={Boolean(errors.lat)} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 bg-[#FFFDF8] px-3 tabular-nums focus-visible:outline-2 focus-visible:outline-[#597928]" />{#if errors.lat}<p class="mt-1 text-sm text-[#6E3511]">{errors.lat}</p>{/if}</div>
        <div><label for="bag-profile-lng" class="mb-1 block font-semibold">{isFil ? 'Longitude ng pin' : 'Pin longitude'}</label><input id="bag-profile-lng" type="number" step="any" bind:value={lngInput} oninput={() => { locationBasis = 'exact_pin'; }} aria-invalid={Boolean(errors.lng)} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 bg-[#FFFDF8] px-3 tabular-nums focus-visible:outline-2 focus-visible:outline-[#597928]" />{#if errors.lng}<p class="mt-1 text-sm text-[#6E3511]">{errors.lng}</p>{/if}</div>
      </div>
      <div class="flex flex-wrap items-center gap-3"><button type="button" onclick={chooseMunicipality} class="min-h-11 rounded-lg border border-[#20251E]/30 px-4 font-semibold hover:bg-[#FCECD8] focus-visible:outline-2 focus-visible:outline-[#597928]">{isFil ? 'Ibalik sa sentro ng bayan' : 'Reset to municipality center'}</button><span class="text-sm text-[#4A5245]">{locationBasis === 'municipality_center' ? (isFil ? 'Sentro ng bayan ang pin' : 'Municipality center pin') : (isFil ? 'Eksaktong pin ang gagamitin' : 'Exact pin selected')}</span></div>
    </div>
  {/if}
  <div class="flex flex-wrap gap-3">
    <button type="submit" class="min-h-11 rounded-lg bg-[#486320] px-5 font-bold text-white hover:bg-[#365118] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#486320]">{profile ? (isFil ? 'I-save ang pagbabago' : 'Save changes') : (isFil ? 'I-save ang bagsakan' : 'Save bagsakan')}</button>
    {#if onCancel}<button type="button" onclick={onCancel} class="min-h-11 rounded-lg border border-[#20251E]/30 px-5 font-semibold hover:bg-[#FCECD8]">{isFil ? 'Kanselahin' : 'Cancel'}</button>{/if}
  </div>
</form>
