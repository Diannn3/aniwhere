<script lang="ts">
  import { onMount } from 'svelte';
  import { loadMapLibre } from '../../lib/map/maplibre-loader';
  import { loadAniwhereMapStyle, LAGUNA_MAP_BOUNDS, MAP_ATTRIBUTION } from '../../lib/map/map-config';

  let { lat, lng, lang = 'en', recenterRequest, onPick }: {
    lat: number;
    lng: number;
    lang?: 'en' | 'fil';
    recenterRequest?: { version: number; lat: number; lng: number };
    onPick: (lat: number, lng: number) => void;
  } = $props();

  let container: HTMLDivElement;
  let state = $state<'loading' | 'ready' | 'failed'>('loading');
  let map: any;
  let marker: any;
  // The map constructor already uses the initial pin coordinates. A recenter
  // request that predates mount is therefore already represented by the camera.
  let handledRecenterVersion = recenterRequest?.version ?? 0;

  onMount(() => {
    let disposed = false;
    async function start() {
      try {
        const [maplibre, style] = await Promise.all([loadMapLibre(), loadAniwhereMapStyle()]);
        if (disposed) return;
        map = new maplibre.Map({
          container,
          style,
          center: [lng, lat],
          zoom: 12,
          minZoom: 9,
          maxBounds: LAGUNA_MAP_BOUNDS,
          attributionControl: true,
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        map.on('load', () => {
          if (disposed) return;
          marker = new maplibre.Marker({ color: '#6E3511' }).setLngLat([lng, lat]).addTo(map);
          state = 'ready';
        });
        map.on('click', (event: { lngLat: { lat: number; lng: number } }) => {
          onPick(Number(event.lngLat.lat.toFixed(6)), Number(event.lngLat.lng.toFixed(6)));
        });
        map.on('error', () => { if (state !== 'ready') state = 'failed'; });
      } catch {
        if (!disposed) state = 'failed';
      }
    }
    void start();
    return () => {
      disposed = true;
      marker?.remove?.();
      map?.remove?.();
    };
  });

  $effect(() => {
    if (marker && Number.isFinite(lat) && Number.isFinite(lng)) {
      marker.setLngLat([lng, lat]);
    }
  });

  // Moving the pin and moving the camera are separate interactions.
  // Map clicks/manual coordinate edits update only the marker. Municipality
  // changes/resets send an explicit camera target so a delayed recenter can
  // never accidentally follow a newer map click.
  $effect(() => {
    const request = recenterRequest;
    if (!request || request.version === handledRecenterVersion) return;
    if (!map || state !== 'ready') return;
    if (!Number.isFinite(request.lat) || !Number.isFinite(request.lng)) return;

    handledRecenterVersion = request.version;
    map.easeTo({ center: [request.lng, request.lat], duration: 0 });
  });
</script>

<div class="overflow-hidden rounded-xl border border-[#20251E]/20 bg-[#FCECD8]/45">
  <div bind:this={container} data-bagsakan-pin-map class="h-56 w-full sm:h-64" aria-label={lang === 'fil' ? 'Mapa para pumili ng lokasyon' : 'Map for choosing a location'}></div>
  {#if state === 'loading'}
    <p class="px-4 py-2 text-sm text-[#4A5245]">{lang === 'fil' ? 'Binubuksan ang mapa…' : 'Loading map…'}</p>
  {:else if state === 'failed'}
    <p class="px-4 py-2 text-sm text-[#6E3511]">{lang === 'fil' ? 'Hindi mabuksan ang mapa. Maaari pa ring gamitin ang mga coordinate sa ibaba.' : 'Map unavailable. You can still use the coordinates below.'}</p>
  {:else}
    <p class="px-4 py-2 text-sm text-[#4A5245]">{lang === 'fil' ? 'Pindutin ang mapa upang ilagay ang pin. Maaari ring gamitin ang mga coordinate sa ibaba.' : 'Click or tap the map to place the pin. You can also use the coordinates below.'}</p>
  {/if}
  <p class="sr-only">{MAP_ATTRIBUTION}</p>
</div>
