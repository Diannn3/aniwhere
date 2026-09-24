<script lang="ts">
  let { lang = 'en' }: { lang?: 'en' | 'fil' } = $props();
  const isFil = $derived(lang === 'fil');
</script>

<section class="border-b border-[#20251E]/15 bg-[#FFFDF8] px-4 py-8 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-5xl">
    <h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{isFil ? 'Iyong bagsakan' : 'Your bagsakan'}</h1>
    <p class="mt-3 max-w-2xl text-lg leading-relaxed text-[#4A5245]">{isFil ? 'Itala ang lokasyon at kasalukuyang pangangailangan sa pagbili. Makikita ang resulta sa farmer discovery sa browser na ito.' : 'Record your location and current buying needs. See the result in farmer discovery in this browser.'}</p>
    <p class="mt-4 inline-block rounded-lg border border-[#6E3511]/30 bg-[#FCECD8] px-3 py-2 text-sm font-semibold text-[#6E3511]">{isFil ? 'Demo — halimbawang datos. Sa device na ito lamang; hindi inilalathala sa live buyer network.' : 'Demo — sample data. This device only; nothing is published to a live buyer network.'}</p>
  </div>
</section>
