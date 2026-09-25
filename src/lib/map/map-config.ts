export const MAPLIBRE_VERSION = '6.10.0';
export const MAPLIBRE_ESM_URL =
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
export const MAPLIBRE_CSS_URL =
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

// MapLibre accepts any compatible style JSON URL; set PUBLIC_MAP_STYLE_URL to use a hosted custom style.
export const ANIWHERE_MAP_STYLE = import.meta.env.PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

// Retint the hosted vector style rather than replacing its roads, labels, glyphs or attribution.
export async function loadAniwhereMapStyle() {
  const response = await fetch(ANIWHERE_MAP_STYLE);
  if (!response.ok) throw new Error(`Map style unavailable: ${response.status}`);
  const style = await response.json();
  if (import.meta.env.PUBLIC_MAP_STYLE_URL) return style;
  for (const layer of style.layers) {
    const paint = layer.paint;
    if (!paint) continue;
    const id: string = layer.id;
    if (id === 'background') paint['background-color'] = '#b3c494';
    else if (id === 'water') paint['fill-color'] = '#698f9c';
    else if (id.startsWith('waterway_') && layer.type === 'line') paint['line-color'] = '#698f9c';
    else if (id === 'park' || id.startsWith('landcover_') || id.startsWith('landuse_')) {
      if (paint['fill-color'] !== undefined) paint['fill-color'] = id === 'park' || id === 'landcover_wood' ? '#92aa77' : '#a9bc8c';
      if (paint['fill-opacity'] !== undefined) paint['fill-opacity'] = 0.65;
      if (paint['fill-outline-color'] !== undefined) paint['fill-outline-color'] = '#92aa77';
    } else if (/^(road|bridge|tunnel)_/.test(id) && layer.type === 'line') {
      paint['line-color'] = id.includes('casing') ? '#a9b898' : '#fffdf3';
    } else if (id.startsWith('label_') || id.startsWith('water_name_')) {
      paint['text-color'] = id.startsWith('water_') ? '#244c59' : '#283829';
      paint['text-halo-color'] = id.startsWith('water_') ? '#698f9c' : '#b3c494';
    }
  }
  return style;
}

export const LAGUNA_MAP_CENTER: [number, number] = [121.30, 14.18];
export const LAGUNA_MAP_BOUNDS: [[number, number], [number, number]] = [
  [121.05, 13.98],
  [121.53, 14.37],
];

export const MAP_ATTRIBUTION =
  'OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors';

export function selectedRoutePadding(compact: boolean, mobilePickerInset?: number) {
  if (typeof mobilePickerInset === 'number' && mobilePickerInset > 0) {
    return { top: 76, right: 34, bottom: mobilePickerInset + 24, left: 34 };
  }
  return compact
    ? { top: 76, right: 34, bottom: 190, left: 34 }
    : { top: 72, right: 52, bottom: 118, left: 52 };
}
