<script lang="ts">
  export interface AdvancedTerms {
    minKg: string;
    receivingWeekdays: number[];
    receivingStartTime: string;
    receivingEndTime: string;
    variety: string;
    grade: string;
    packaging: string;
    notes: string;
  }

  let { value, lang = 'en', errors = {}, onChange }: {
    value: AdvancedTerms;
    lang?: 'en' | 'fil';
    errors?: Record<string, string>;
    onChange: (value: AdvancedTerms) => void;
  } = $props();
  let expanded = $state(false);
  $effect(() => {
    if (['minKg', 'receivingWeekdays', 'receivingStartTime', 'receivingEndTime', 'variety', 'grade', 'packaging', 'notes'].some((key) => errors[key])) expanded = true;
  });
  const isFil = $derived(lang === 'fil');
  const days = $derived(isFil
    ? ['Lin', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const keys = [1, 2, 3, 4, 5, 6, 0];

  function update<K extends keyof AdvancedTerms>(key: K, next: AdvancedTerms[K]) {
    onChange({ ...value, [key]: next });
  }
  function toggleDay(day: number) {
    update('receivingWeekdays', value.receivingWeekdays.includes(day)
      ? value.receivingWeekdays.filter((item) => item !== day)
      : [...value.receivingWeekdays, day].sort());
  }
</script>

<details bind:open={expanded} class="rounded-xl border border-[#20251E]/15 bg-[#FFFDF8] p-4">
  <summary class="min-h-11 cursor-pointer py-2 font-bold">{isFil ? 'Mga dagdag na kondisyon' : 'Additional receiving terms'}</summary>
  <div class="mt-4 grid gap-4 sm:grid-cols-2">
    <div>
      <label for="bag-demand-minKg" class="mb-1 block font-semibold">{isFil ? 'Pinakamababang kg (opsyonal)' : 'Minimum kg (optional)'}</label>
      <input id="bag-demand-minKg" type="number" min="0" step="any" value={value.minKg} oninput={(event) => update('minKg', event.currentTarget.value)} aria-invalid={Boolean(errors.minKg)} aria-describedby={errors.minKg ? 'bag-demand-minKg-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3 tabular-nums" />
      {#if errors.minKg}<p id="bag-demand-minKg-error" class="mt-1 text-sm text-[#6E3511]">{errors.minKg}</p>{/if}
    </div>
    <div class="sm:col-span-2">
      <fieldset id="bag-demand-receivingWeekdays" tabindex="-1" aria-invalid={Boolean(errors.receivingWeekdays)} aria-describedby={errors.receivingWeekdays ? 'bag-demand-receivingWeekdays-error' : undefined}>
        <legend class="mb-2 font-semibold">{isFil ? 'Mga araw ng pagtanggap (opsyonal)' : 'Receiving days (optional)'}</legend>
        <div class="flex flex-wrap gap-2">{#each keys as day, index}<label class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#20251E]/25 px-3"><input type="checkbox" checked={value.receivingWeekdays.includes(day)} onchange={() => toggleDay(day)} />{days[index]}</label>{/each}</div>
        {#if errors.receivingWeekdays}<p id="bag-demand-receivingWeekdays-error" class="mt-1 text-sm text-[#6E3511]">{errors.receivingWeekdays}</p>{/if}
      </fieldset>
    </div>
    <div><label for="bag-demand-receivingStartTime" class="mb-1 block font-semibold">{isFil ? 'Simula ng pagtanggap' : 'Receiving starts'}</label><input id="bag-demand-receivingStartTime" type="time" value={value.receivingStartTime} oninput={(event) => update('receivingStartTime', event.currentTarget.value)} aria-invalid={Boolean(errors.receivingStartTime)} aria-describedby={errors.receivingStartTime ? 'bag-demand-receivingStartTime-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.receivingStartTime}<p id="bag-demand-receivingStartTime-error" class="mt-1 text-sm text-[#6E3511]">{errors.receivingStartTime}</p>{/if}</div>
    <div><label for="bag-demand-receivingEndTime" class="mb-1 block font-semibold">{isFil ? 'Pagtatapos ng pagtanggap' : 'Receiving ends'}</label><input id="bag-demand-receivingEndTime" type="time" value={value.receivingEndTime} oninput={(event) => update('receivingEndTime', event.currentTarget.value)} aria-invalid={Boolean(errors.receivingEndTime)} aria-describedby={errors.receivingEndTime ? 'bag-demand-receivingEndTime-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.receivingEndTime}<p id="bag-demand-receivingEndTime-error" class="mt-1 text-sm text-[#6E3511]">{errors.receivingEndTime}</p>{/if}</div>
    <div><label for="bag-demand-variety" class="mb-1 block font-semibold">{isFil ? 'Uri / variety' : 'Variety'}</label><input id="bag-demand-variety" maxlength="500" value={value.variety} oninput={(event) => update('variety', event.currentTarget.value)} aria-invalid={Boolean(errors.variety)} aria-describedby={errors.variety ? 'bag-demand-variety-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.variety}<p id="bag-demand-variety-error" class="mt-1 text-sm text-[#6E3511]">{errors.variety}</p>{/if}</div>
    <div><label for="bag-demand-grade" class="mb-1 block font-semibold">{isFil ? 'Antas / grade' : 'Grade'}</label><input id="bag-demand-grade" maxlength="500" value={value.grade} oninput={(event) => update('grade', event.currentTarget.value)} aria-invalid={Boolean(errors.grade)} aria-describedby={errors.grade ? 'bag-demand-grade-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.grade}<p id="bag-demand-grade-error" class="mt-1 text-sm text-[#6E3511]">{errors.grade}</p>{/if}</div>
    <div class="sm:col-span-2"><label for="bag-demand-packaging" class="mb-1 block font-semibold">{isFil ? 'Balot o lalagyan' : 'Packaging'}</label><input id="bag-demand-packaging" maxlength="500" value={value.packaging} oninput={(event) => update('packaging', event.currentTarget.value)} aria-invalid={Boolean(errors.packaging)} aria-describedby={errors.packaging ? 'bag-demand-packaging-error' : undefined} class="min-h-11 w-full rounded-lg border border-[#20251E]/30 px-3" />{#if errors.packaging}<p id="bag-demand-packaging-error" class="mt-1 text-sm text-[#6E3511]">{errors.packaging}</p>{/if}</div>
    <div class="sm:col-span-2"><label for="bag-demand-notes" class="mb-1 block font-semibold">{isFil ? 'Iba pang kondisyon' : 'Other terms'}</label><textarea id="bag-demand-notes" rows="3" maxlength="500" value={value.notes} oninput={(event) => update('notes', event.currentTarget.value)} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'bag-demand-notes-error' : undefined} class="w-full rounded-lg border border-[#20251E]/30 px-3 py-2"></textarea>{#if errors.notes}<p id="bag-demand-notes-error" class="mt-1 text-sm text-[#6E3511]">{errors.notes}</p>{/if}</div>
  </div>
  <p class="mt-3 text-sm text-[#4A5245]">{isFil ? 'Kailangang kumpirmahin sa bagsakan ang oras ng pagtanggap bago bumiyahe.' : 'Farmers should confirm receiving hours with the bagsakan before travelling.'}</p>
</details>
