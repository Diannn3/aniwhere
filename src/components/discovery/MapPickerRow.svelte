<script lang="ts">
  import type { PickerItem } from '../../lib/map/picker';
  import { capacityLabel, distanceLabel } from '../../lib/map/picker';

  let {
    item,
    selectedId,
    lang,
    distanceBasis,
    comparedCount,
    onSelect,
    onCompare,
  }: {
    item: PickerItem;
    selectedId?: string;
    lang: 'en' | 'fil';
    distanceBasis: 'road' | 'straight_line';
    comparedCount: number;
    onSelect: (id: string) => void;
    onCompare: (id: string) => void;
  } = $props();
</script>

<li class={`map-picker__row ${selectedId === item.outlet.id ? 'is-selected' : ''}`} data-outlet-id={item.outlet.id}>
  <button
    type="button"
    class="map-picker__select"
    aria-pressed={selectedId === item.outlet.id}
    aria-label={`${item.outlet.name}. ${lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}. ${capacityLabel(item, lang)}. ${distanceLabel(item, distanceBasis, lang)}`}
    onclick={() => onSelect(item.outlet.id)}
  >
    <span class="map-picker__name">{item.outlet.name}</span>
    <span class={`map-picker__fit status-${item.fit.status}`}>
      {lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}
    </span>
    <span class="map-picker__facts">
      <span>{capacityLabel(item, lang)}</span>
      <span>{distanceLabel(item, distanceBasis, lang)}</span>
    </span>
  </button>
  <button
    type="button"
    class="map-picker__compare"
    aria-pressed={item.isCompared}
    disabled={!item.isCompared && comparedCount >= 3}
    aria-label={item.isCompared
      ? `${lang === 'fil' ? 'Alisin ang' : 'Remove'} ${item.outlet.name} ${lang === 'fil' ? 'sa paghahambing' : 'from compare'}`
      : `${lang === 'fil' ? 'Idagdag ang' : 'Add'} ${item.outlet.name} ${lang === 'fil' ? 'sa paghahambing' : 'to compare'}`}
    onclick={() => onCompare(item.outlet.id)}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
      {#if item.isCompared}<path d="m5 12 4 4L19 6" />{:else}<path d="M12 5v14M5 12h14" />{/if}
    </svg>
    <span>{item.isCompared ? (lang === 'fil' ? 'Napili' : 'Added') : (lang === 'fil' ? 'Ihambing' : 'Compare')}</span>
  </button>
</li>
