<script lang="ts">
  let { lang = 'en' }: { lang?: 'en' | 'fil' } = $props();
  const isFil = $derived(lang === 'fil');
</script>

<section class="border-b border-[#20251E]/15 bg-[#FFFDF8] px-4 py-6 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-5xl">
    <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">{isFil ? 'Iyong bagsakan' : 'Your bagsakan'}</h1>
    <p class="mt-2 max-w-2xl leading-relaxed text-[#4A5245]">{isFil ? 'Ilagay ang lokasyon at mga pananim na maaari mong tanggapin.' : 'Add your location and the crops you can receive.'}</p>
    <p class="mt-3 inline-block rounded-lg bg-[#FCECD8] px-3 py-2 text-sm font-semibold text-[#6E3511]">{isFil ? 'Demo lamang sa device na ito — hindi ito live na anunsyo.' : 'Demo on this device only — this is not a live listing.'}</p>
    <div><a href={isFil ? '/?lang=fil' : '/'} data-route-href="/" class="mt-3 inline-flex min-h-11 items-center font-semibold text-[#365118] underline underline-offset-4">{isFil ? 'Bumalik sa paghahanap ng ani' : 'Back to harvest search'}</a></div>
  </div>
</section>
