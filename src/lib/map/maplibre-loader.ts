import { MAPLIBRE_CSS_URL, MAPLIBRE_ESM_URL } from './map-config';

type MapLibreModule = {
  Map: new (options: Record<string, unknown>) => any;
  Marker: new (options?: Record<string, unknown>) => any;
  NavigationControl: new (options?: Record<string, unknown>) => any;
  LngLatBounds: new () => any;
};

let modulePromise: Promise<MapLibreModule> | undefined;

function ensureCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-aniwhere-maplibre]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MAPLIBRE_CSS_URL;
  link.dataset.aniwhereMaplibre = 'true';
  document.head.appendChild(link);
}

export async function loadMapLibre(): Promise<MapLibreModule> {
  if (typeof window === 'undefined') {
    throw new Error('MapLibre can only load in a browser.');
  }

  ensureCss();

  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ MAPLIBRE_ESM_URL) as Promise<MapLibreModule>;
  }

  return modulePromise;
}
