export const MAPLIBRE_VERSION = '6.10.0';
export const MAPLIBRE_ESM_URL =
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
export const MAPLIBRE_CSS_URL =
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

export const ANIWHERE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export const LAGUNA_MAP_CENTER: [number, number] = [121.30, 14.18];
export const LAGUNA_MAP_BOUNDS: [[number, number], [number, number]] = [
  [121.05, 13.98],
  [121.53, 14.37],
];

export const MAP_ATTRIBUTION =
  'OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors';

export function selectedRoutePadding(compact: boolean) {
  return compact
    ? { top: 76, right: 34, bottom: 190, left: 34 }
    : { top: 72, right: 52, bottom: 118, left: 52 };
}
