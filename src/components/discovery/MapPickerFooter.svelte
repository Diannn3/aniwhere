<script lang="ts">
  let {
    count,
    compareHref,
    lang,
    onClear,
  }: { count: number; compareHref: string; lang: 'en' | 'fil'; onClear: () => void } = $props();
</script>

<footer class="map-picker__footer" aria-label={lang === 'fil' ? 'Paghahambing' : 'Comparison'}>
  <p>{lang === 'fil' ? `${count} sa 3 lugar ang napili` : `${count} of 3 places selected`}</p>
  {#if count >= 3}
    <span class="map-picker__limit">{lang === 'fil' ? 'Alisin muna ang isa para pumili ng iba.' : 'Remove one to choose another.'}</span>
  {/if}
  <button type="button" onclick={onClear}>{lang === 'fil' ? 'Alisin lahat' : 'Clear'}</button>
  <a href={compareHref}>{lang === 'fil' ? 'Ihambing' : 'Compare'}</a>
</footer>
