<script lang="ts">
  import { onMount } from 'svelte';
  import type { FitResult, HarvestQuery, Outlet } from '../../lib/domain/types';
  import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
  import { getOutletRouteEstimate } from '../../lib/routing/routing-matrix';
  import type { OutletRouteEstimate } from '../../lib/routing/routing-matrix';
  import { loadMapLibre } from '../../lib/map/maplibre-loader';
  import {
    ANIWHERE_MAP_STYLE,
    LAGUNA_MAP_BOUNDS,
    LAGUNA_MAP_CENTER,
    MAP_ATTRIBUTION,
    selectedRoutePadding,
  } from '../../lib/map/map-config';
  import ResilientLagunaMap from './ResilientLagunaMap.svelte';

  interface OutletWithFit {
    outlet: Outlet;
    fit: FitResult;
    distanceKm: number;
  }

  let {
    items = [],
    harvest,
    selectedId = undefined,
    lang = 'en',
    onSelect = () => {},
  }: {
    items?: OutletWithFit[];
    harvest: HarvestQuery;
    selectedId?: string;
    lang?: 'en' | 'fil';
    onSelect?: (id: string) => void;
  } = $props();

  let mapContainer: HTMLDivElement;
  let liveReady = $state(false);
  let liveFailed = $state(false);
  let slowLoading = $state(false);
  let map: any;
  let maplibre: any;
  let originMarker: any;
  let outletMarkers: any[] = [];

  const origin = $derived(
    LAGUNA_MUNICIPALITIES.find((item) => item.id === harvest.originMunicipality) ??
      LAGUNA_MUNICIPALITIES[0]
  );

  const selectedItem = $derived(items.find((item) => item.outlet.id === selectedId));
  const selectedRoute = $derived<OutletRouteEstimate | undefined>(
    selectedItem
      ? getOutletRouteEstimate(
          harvest.originMunicipality,
          selectedItem.outlet.id,
          selectedItem.distanceKm
        )
      : undefined
  );

  function routeCoordinates(): Array<[number, number]> {
    if (!selectedItem) return [];
    if (selectedRoute?.geometry?.coordinates?.length) {
      return selectedRoute.geometry.coordinates;
    }
    return [
      [origin.lng, origin.lat],
      [selectedItem.outlet.lng, selectedItem.outlet.lat],
    ];
  }

  function routeGeoJson() {
    return {
      type: 'Feature',
      properties: {
        routeKind: selectedRoute?.source === 'road' && selectedRoute.geometry ? 'road' : 'straight_line',
      },
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates(),
      },
    };
  }

  function clearMarkers() {
    originMarker?.remove?.();
    originMarker = undefined;
    outletMarkers.forEach((marker) => marker.remove?.());
    outletMarkers = [];
  }

  function syncMarkers() {
    if (!map || !maplibre || !liveReady) return;
    clearMarkers();

    const originElement = document.createElement('div');
    originElement.className = 'aniwhere-origin-marker';
    originElement.textContent = 'A';
    originElement.setAttribute(
      'aria-label',
      `${lang === 'fil' ? 'Batayang lokasyon' : 'Reference point'}: ${origin.name}${lang === 'fil' ? ', sentro ng munisipyo' : ' municipality center'}`
    );
    originMarker = new maplibre.Marker({ element: originElement, anchor: 'center' })
      .setLngLat([origin.lng, origin.lat])
      .addTo(map);

    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `aniwhere-outlet-marker status-${item.fit.status}`;
      if (item.outlet.id === selectedId) button.classList.add('is-selected');
      button.textContent = String(index + 1);
      button.setAttribute(
        'aria-label',
        `${item.outlet.name}, ${lang === 'fil' ? item.fit.statusLabelFil : item.fit.statusLabel}, ${item.distanceKm.toFixed(1)} km ${lang === 'fil' ? 'tuwid na layo' : 'straight-line distance'}`
      );
      button.setAttribute('aria-pressed', item.outlet.id === selectedId ? 'true' : 'false');
      button.addEventListener('click', () => onSelect(item.outlet.id));

      const marker = new maplibre.Marker({ element: button, anchor: 'center' })
        .setLngLat([item.outlet.lng, item.outlet.lat])
        .addTo(map);
      outletMarkers.push(marker);
    });
  }

  function syncRoute() {
    if (!map || !liveReady || !map.isStyleLoaded?.()) return;

    const existingSource = map.getSource('aniwhere-selected-route');
    if (!selectedItem) {
      existingSource?.setData?.({ type: 'FeatureCollection', features: [] });
      return;
    }

    const data = routeGeoJson();
    const source = existingSource;
    if (source?.setData) {
      source.setData(data);
    } else {
      map.addSource('aniwhere-selected-route', { type: 'geojson', data });
      map.addLayer({
        id: 'aniwhere-selected-route-line',
        type: 'line',
        source: 'aniwhere-selected-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#4E7380',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });
    }

    const actualRoad = selectedRoute?.source === 'road' && Boolean(selectedRoute.geometry);
    map.setPaintProperty(
      'aniwhere-selected-route-line',
      'line-dasharray',
      actualRoad ? [1, 0] : [1.5, 1.5]
    );

    const coordinates = routeCoordinates();
    if (coordinates.length < 2 || !maplibre) return;
    const bounds = new maplibre.LngLatBounds();
    coordinates.forEach((coordinate) => bounds.extend(coordinate));
    const compact = window.matchMedia('(max-width: 767px)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.fitBounds(bounds, {
      padding: selectedRoutePadding(compact),
      maxZoom: 13,
      animate: !reduceMotion,
      duration: reduceMotion ? 0 : 420,
    });
  }

  function syncMap() {
    syncMarkers();
    syncRoute();
  }

  $effect(() => {
    items;
    selectedId;
    harvest.originMunicipality;
    selectedRoute;
    if (liveReady) syncMap();
  });

  onMount(() => {
    let destroyed = false;
    const slowTimer = window.setTimeout(() => {
      if (!liveReady && !destroyed) slowLoading = true;
    }, 2500);
    const timeout = window.setTimeout(() => {
      if (!liveReady && !destroyed) liveFailed = true;
    }, 7000);

    (async () => {
      try {
        maplibre = await loadMapLibre();
        if (destroyed) return;

        map = new maplibre.Map({
          container: mapContainer,
          style: ANIWHERE_MAP_STYLE,
          center: LAGUNA_MAP_CENTER,
          zoom: 9.2,
          maxBounds: LAGUNA_MAP_BOUNDS,
          cooperativeGestures: true,
          renderWorldCopies: false,
          attributionControl: true,
          reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        });

        map.addControl(
          new maplibre.NavigationControl({ showCompass: false, showZoom: true }),
          'bottom-right'
        );

        map.on('load', () => {
          if (destroyed) return;
          window.clearTimeout(slowTimer);
          window.clearTimeout(timeout);
          slowLoading = false;
          liveReady = true;
          syncMap();
        });

        map.on('error', () => {
          if (!liveReady && !destroyed) {
            liveFailed = true;
          }
        });
      } catch {
        if (!destroyed) liveFailed = true;
      }
    })();

    return () => {
      destroyed = true;
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeout);
      clearMarkers();
      map?.remove?.();
    };
  });
</script>

{#if liveFailed}
  <div class="map-fallback-shell">
    <div class="map-fallback-note" role="status">
      <strong>{lang === 'fil' ? 'Offline na mapa' : 'Offline map'}</strong>
      <span>{lang === 'fil' ? 'Hindi nag-load ang interaktibong mapa. Gamit muna ang ligtas na guhit-mapa.' : 'The interactive map did not load. Using the resilient map instead.'}</span>
    </div>
    <ResilientLagunaMap {items} {harvest} {selectedId} {lang} {onSelect} />
  </div>
{:else}
  <div class="live-map-shell" class:is-ready={liveReady}>
    <div
      bind:this={mapContainer}
      class="live-map"
      role="region"
      aria-label={lang === 'fil' ? 'Interaktibong mapa ng mga pamilihan sa Laguna' : 'Interactive map of Laguna market outlets'}
    ></div>

    <div class="map-status-bar">
      <div>
        <strong>{lang === 'fil' ? 'Interaktibong mapa' : 'Interactive map'}</strong>
        <span>
          {liveReady
            ? (lang === 'fil' ? 'Pumili ng lugar upang makita ang ruta.' : 'Select an outlet to inspect the route.')
            : slowLoading
              ? (lang === 'fil' ? 'Medyo matagal ang mapa. Maaari mong gamitin ang listahan habang naghihintay.' : 'The map is taking longer. You can keep using the list while it loads.')
              : (lang === 'fil' ? 'Naglo-load…' : 'Loading…')}
        </span>
      </div>
      <span class="map-source">{MAP_ATTRIBUTION}</span>
    </div>

    {#if selectedItem && selectedRoute}
      <aside class="route-card" aria-live="polite">
        <div class="route-card__title">
          <span>{lang === 'fil' ? 'Ruta papunta sa' : 'Route to'}</span>
          <strong>{selectedItem.outlet.name}</strong>
          <span class="route-origin">
            {lang === 'fil'
              ? `Batayang lokasyon: sentro ng ${origin.name}`
              : `Reference point: ${origin.name} municipality center`}
          </span>
        </div>
        <div class={`route-card__fit fit-${selectedItem.fit.status}`}>
          <strong>{lang === 'fil' ? selectedItem.fit.statusLabelFil : selectedItem.fit.statusLabel}</strong>
          {#if selectedItem.fit.acceptedKg !== null && selectedItem.fit.remainingKg !== null}
            <span>
              {lang === 'fil'
                ? `Kayang tanggapin ${selectedItem.fit.acceptedKg.toLocaleString('en-PH')} kg · Matitira ${selectedItem.fit.remainingKg.toLocaleString('en-PH')} kg`
                : `Can accept ${selectedItem.fit.acceptedKg.toLocaleString('en-PH')} kg · ${selectedItem.fit.remainingKg.toLocaleString('en-PH')} kg remaining`}
            </span>
          {:else}
            <span>{lang === 'fil' ? 'Hindi pa alam ang kapasidad — kumpirmahin muna.' : 'Capacity is still unknown — confirm first.'}</span>
          {/if}
        </div>
        {#if selectedRoute.source === 'road'}
          <dl>
            <div>
              <dt>{lang === 'fil' ? 'Distansya sa kalsada' : 'Road distance'}</dt>
              <dd>{selectedRoute.roadDistanceKm?.toFixed(1)} km</dd>
            </div>
            <div>
              <dt>{lang === 'fil' ? 'Tinatayang biyahe' : 'Estimated drive'}</dt>
              <dd>~{selectedRoute.roadDurationMinutes} min</dd>
            </div>
          </dl>
          <p>{lang === 'fil' ? 'Tantya ng OpenRouteService mula sa reference point ng munisipyo, hindi sa eksaktong bukid. Kumpirmahin ang iskedyul bago bumiyahe.' : 'OpenRouteService estimate from the municipality reference point, not the exact farm. Confirm the receiving schedule before travel.'}</p>
        {:else}
          <dl>
            <div>
              <dt>{lang === 'fil' ? 'Tuwid na distansya' : 'Straight-line distance'}</dt>
              <dd>{selectedRoute.straightLineDistanceKm.toFixed(1)} km</dd>
            </div>
            <div>
              <dt>{lang === 'fil' ? 'Ruta sa kalsada' : 'Road route'}</dt>
              <dd>{lang === 'fil' ? 'Hindi available' : 'Unavailable'}</dd>
            </div>
          </dl>
          <p>{lang === 'fil' ? 'Mula ito sa reference point ng munisipyo. Ang putol-putol na linya ay konteksto lamang, hindi direksyon sa kalsada.' : 'This starts from the municipality reference point. The dashed line is geographic context only, not road directions.'}</p>
        {/if}
      </aside>
    {/if}
  </div>
{/if}

<style>
  .live-map-shell,
  .map-fallback-shell {
    position: relative;
    min-height: min(68vh, 46rem);
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: #b3c494 url("/plates/map-plate.png") center / cover;
  }

  .live-map {
    position: absolute;
    inset: 0;
    min-height: min(68vh, 46rem);
    background: #b3c494 url("/plates/map-plate.png") center / cover;
  }

  .map-status-bar {
    position: absolute;
    z-index: 5;
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    pointer-events: none;
  }

  .map-status-bar > div,
  .map-source {
    border: 1px solid rgb(32 37 30 / 0.22);
    border-radius: 0.5rem;
    background: rgb(255 253 248 / 0.96);
    box-shadow: 0 8px 20px -18px rgb(32 37 30 / 0.42);
  }

  .map-status-bar > div {
    display: grid;
    gap: 0.1rem;
    padding: 0.55rem 0.7rem;
  }

  .map-status-bar strong {
    color: #20251e;
    font-size: 0.76rem;
  }

  .map-status-bar span {
    color: #4a5245;
    font-size: 0.66rem;
  }

  .map-source {
    max-width: 13rem;
    padding: 0.42rem 0.55rem;
    text-align: right;
    font-size: 0.58rem !important;
  }

  .route-card {
    position: absolute;
    z-index: 6;
    right: 0.75rem;
    bottom: 2.2rem;
    left: 0.75rem;
    max-width: 32rem;
    padding: 0.8rem;
    border: 1px solid rgb(32 37 30 / 0.24);
    border-radius: 0.75rem;
    background: rgb(255 253 248 / 0.98);
    box-shadow: 0 16px 30px -24px rgb(32 37 30 / 0.5);
  }

  .route-card__title {
    display: grid;
    gap: 0.08rem;
    margin-bottom: 0.55rem;
  }

  .route-card__title span,
  .route-card dt {
    color: #596052;
    font-size: 0.65rem;
    font-weight: 700;
  }

  .route-card__title strong {
    color: #20251e;
    font-size: 0.92rem;
  }

  .route-card__title .route-origin {
    margin-top: 0.18rem;
    color: #596052;
    font-size: 0.62rem;
    font-weight: 600;
  }

  .route-card__fit {
    display: grid;
    gap: 0.08rem;
    margin: 0 0 0.55rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid rgb(32 37 30 / 0.12);
    border-radius: 0.75rem;
    background: #fffdf8;
  }

  .route-card__fit strong { font-size: 0.72rem; }
  .route-card__fit span { color: #596052; font-size: 0.64rem; line-height: 1.35; }
  .route-card__fit.fit-match { border-color: rgb(89 121 40 / 0.3); background: rgb(234 243 222 / 0.8); }
  .route-card__fit.fit-partial { border-color: rgb(184 106 43 / 0.28); background: rgb(252 236 216 / 0.8); }
  .route-card__fit.fit-confirm { border-color: rgb(78 115 128 / 0.28); background: rgb(235 242 245 / 0.86); }
  .route-card__fit.fit-no_match { border-color: rgb(107 113 103 / 0.25); background: rgb(240 242 238 / 0.9); }

  .route-card dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    margin: 0;
  }

  .route-card dl > div {
    padding: 0.55rem 0.65rem;
    border-radius: 0.75rem;
    background: #fcecd8;
  }

  .route-card dd {
    margin: 0.1rem 0 0;
    color: #20251e;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .route-card p {
    margin: 0.55rem 0 0;
    color: #596052;
    font-size: 0.66rem;
    line-height: 1.35;
  }

  .map-fallback-note {
    position: absolute;
    z-index: 20;
    top: 0.75rem;
    right: 0.75rem;
    display: grid;
    max-width: 14rem;
    gap: 0.08rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid rgb(32 37 30 / 0.12);
    border-radius: 0.75rem;
    background: rgb(255 253 248 / 0.96);
    color: #20251e;
    box-shadow: 0 8px 24px -18px rgb(32 37 30 / 0.48);
  }

  .map-fallback-note strong { font-size: 0.72rem; }
  .map-fallback-note span { color: #596052; font-size: 0.62rem; }

  :global(.aniwhere-origin-marker),
  :global(.aniwhere-outlet-marker) {
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    place-items: center;
    border: 2px solid #fffdf8;
    border-radius: 999px;
    box-shadow: 0 5px 14px rgb(32 37 30 / 0.24);
    font: 800 0.72rem/1 'Atkinson Hyperlegible Next', sans-serif;
  }

  :global(.aniwhere-origin-marker) {
    background: #20251e;
    color: #fffdf8;
  }

  :global(.aniwhere-outlet-marker) {
    cursor: pointer;
    color: #fffdf8;
  }

  :global(.aniwhere-outlet-marker.status-match) { background: #597928; }
  :global(.aniwhere-outlet-marker.status-partial) { background: #B86A2B; }
  :global(.aniwhere-outlet-marker.status-confirm) { background: #4E7380; }
  :global(.aniwhere-outlet-marker.status-no_match) { background: #6B7167; }

  :global(.aniwhere-outlet-marker:hover),
  :global(.aniwhere-outlet-marker:focus-visible),
  :global(.aniwhere-outlet-marker.is-selected) {
    outline: 3px solid #fcecd8;
    outline-offset: 2px;
    transform: scale(1.08);
  }

  :global(.maplibregl-ctrl-attrib) {
    font-size: 10px;
  }

  @media (max-width: 767px) {
    .live-map-shell,
    .map-fallback-shell,
    .live-map {
      min-height: 56vh;
    }
    .map-status-bar {
      right: 3.4rem;
    }
    .map-source {
      display: none;
    }
    .route-card {
      bottom: 1.8rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.aniwhere-outlet-marker) {
      transition: none !important;
    }
  }

  @media (forced-colors: active) {
    .route-card,
    .map-status-bar > div,
    .map-fallback-note,
    :global(.aniwhere-origin-marker),
    :global(.aniwhere-outlet-marker) {
      border: 1px solid CanvasText;
    }
  }
</style>
