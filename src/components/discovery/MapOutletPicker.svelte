<script lang="ts">
  import type { HarvestQuery } from '../../lib/domain/types';
  import type { OutletRouteEstimate } from '../../lib/routing/routing-matrix';
  import type { PickerItem } from '../../lib/map/picker';
  import MapPickerFooter from './MapPickerFooter.svelte';
  import MapPickerHeader from './MapPickerHeader.svelte';
  import MapPickerRow from './MapPickerRow.svelte';
  import MapPickerSelection from './MapPickerSelection.svelte';

  let {
    items,
    harvest,
    selectedId,
    lang,
    distanceBasis,
    comparedCount,
    compareNotice,
    compareHref,
    onSelect,
    onCompare,
    onClearFilter,
    onClearCompare,
    onHeightChange,
    routeOverride = undefined,
    routeRequestState = 'idle',
  }: {
    items: PickerItem[];
    harvest: HarvestQuery;
    selectedId?: string;
    lang: 'en' | 'fil';
    distanceBasis: 'road' | 'straight_line';
    comparedCount: number;
    compareNotice: string;
    compareHref: string;
    onSelect: (id: string) => void;
    onCompare: (id: string) => void;
    onClearFilter: () => void;
    onClearCompare: () => void;
    onHeightChange: (height: number) => void;
    routeOverride?: OutletRouteEstimate;
    routeRequestState?: 'idle' | 'loading' | 'ready' | 'unavailable' | 'not_configured';
  } = $props();

  let picker = $state<HTMLElement>();
  let expanded = $state(false);
  let mobileNavigationInset = $state(0);
  const selectedItem = $derived(items.find((item) => item.outlet.id === selectedId));

  function toggleExpanded() { expanded = !expanded; }
  function toggleCompare(id: string) { expanded = true; onCompare(id); }

  $effect(() => {
    if (selectedId && window.matchMedia('(max-width: 1023px)').matches) expanded = true;
  });

  $effect(() => {
    if (!picker) return;
    const reportHeight = () => {
      const mobile = window.matchMedia('(max-width: 1023px)').matches;
      const navigation = document.querySelector<HTMLElement>(
        'nav[aria-label="Mobile navigation"], nav[aria-label="Nabigasyon sa mobile"]'
      );
      mobileNavigationInset = mobile ? navigation?.getBoundingClientRect().height ?? 0 : 0;
      onHeightChange(mobile ? picker!.getBoundingClientRect().height + mobileNavigationInset : 0);
    };
    const observer = new ResizeObserver(reportHeight);
    observer.observe(picker);
    window.addEventListener('resize', reportHeight);
    reportHeight();
    return () => { observer.disconnect(); window.removeEventListener('resize', reportHeight); };
  });

  $effect(() => {
    if (!selectedId || !picker) return;
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    requestAnimationFrame(() => {
      const row = [...(picker?.querySelectorAll('[data-outlet-id]') ?? [])]
        .find((element) => element.getAttribute('data-outlet-id') === selectedId);
      if (mobile && row) {
        const body = picker?.querySelector<HTMLElement>('#map-picker-list');
        const bounds = body?.getBoundingClientRect();
        const rowBounds = row.getBoundingClientRect();
        if (body && bounds) {
          if (rowBounds.top < bounds.top) body.scrollTop -= bounds.top - rowBounds.top;
          else if (rowBounds.bottom > bounds.bottom) body.scrollTop += rowBounds.bottom - bounds.bottom;
        }
        return;
      }
      row?.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  });
</script>

<aside
  bind:this={picker}
  class="map-picker"
  style={`--mobile-navigation-inset: ${mobileNavigationInset}px`}
  data-expanded={expanded}
  aria-label={lang === 'fil' ? 'Mga posibleng outlet' : 'Potential outlets'}
>
  <MapPickerHeader count={items.length} {lang} {expanded} onToggle={toggleExpanded} />
  {#if selectedItem}
    <MapPickerSelection
      item={selectedItem}
      {harvest}
      {lang}
      {routeOverride}
      {routeRequestState}
    />
  {/if}

  <div id="map-picker-list" class="map-picker__body">
    {#if items.length === 0}
      <div class="map-picker__empty">
        <p>{lang === 'fil' ? 'Walang outlet sa filter na ito.' : 'No outlets match this filter.'}</p>
        <p>{lang === 'fil' ? 'Palitan ang filter upang makita ang ibang opsyon.' : 'Change the filter to see other options.'}</p>
        <button type="button" onclick={onClearFilter}>{lang === 'fil' ? 'I-clear ang filter' : 'Clear filter'}</button>
      </div>
    {:else}
      <ul class="map-picker__rows">
        {#each items as item (item.outlet.id)}
          <MapPickerRow {item} {lang} {distanceBasis} {comparedCount} {selectedId} onSelect={onSelect} onCompare={toggleCompare} />
        {/each}
      </ul>
    {/if}
  </div>

  {#if compareNotice}<p class="map-picker__notice" role="status">{compareNotice}</p>{/if}
  {#if comparedCount > 0}<MapPickerFooter count={comparedCount} {compareHref} {lang} onClear={onClearCompare} />{/if}
</aside>
