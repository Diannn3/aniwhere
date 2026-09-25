<script lang="ts">
  let {
    count,
    lang,
    expanded,
    onToggle,
  }: {
    count: number;
    lang: 'en' | 'fil';
    expanded: boolean;
    onToggle: () => void;
  } = $props();
</script>

<header class="map-picker__header">
  <div class="map-picker__heading">
    <h2>{lang === 'fil' ? 'Mga posibleng outlet' : 'Potential outlets'} <span>({count})</span></h2>
    <p>{lang === 'fil' ? 'Pumili ng lugar para makita sa mapa' : 'Choose a place to see it on the map'}</p>
  </div>
  <button type="button" class="map-picker__toggle" aria-expanded={expanded} aria-controls="map-picker-list" onclick={onToggle}>
    <span>{expanded ? (lang === 'fil' ? 'Isara' : 'Collapse') : (lang === 'fil' ? 'Ipakita lahat' : 'Show all')}</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      {#if expanded}<path d="m6 15 6-6 6 6" />{:else}<path d="m6 9 6 6 6-6" />{/if}
    </svg>
  </button>
</header>
