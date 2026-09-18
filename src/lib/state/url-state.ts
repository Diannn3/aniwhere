import type { HarvestQuery } from '../domain/types';
import { normalizeCrop } from '../domain/crops';
import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';

export interface ParsedDiscoverQuery {
  harvest: HarvestQuery;
  view: 'list' | 'map';
  selectedPlaceId?: string;
  lang: 'en' | 'fil';
}

export function parseDiscoverQuery(params: URLSearchParams | string): ParsedDiscoverQuery {
  const search = typeof params === 'string' ? new URLSearchParams(params) : params;

  // 1. Crop validation
  const rawCrop = search.get('crop') || 'tomato';
  const { key: cropKey } = normalizeCrop(rawCrop);
  const finalCrop = cropKey !== 'other' ? cropKey : rawCrop;

  // 2. Quantity validation
  const rawKg = Number(search.get('kg') || 300);
  const finalKg = isNaN(rawKg) || rawKg <= 0 || rawKg > 100000 ? 300 : rawKg;

  // 3. Origin validation
  const rawOrigin = search.get('origin') || 'los-banos';
  const knownMun = LAGUNA_MUNICIPALITIES.find((m) => m.id === rawOrigin);
  const finalOrigin = knownMun ? knownMun.id : 'los-banos';

  // 4. Ready Date validation
  const rawDate = search.get('ready') || '2026-09-17';
  const finalDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '2026-09-17';

  // 5. View mode validation
  const rawView = search.get('view');
  const finalView: 'list' | 'map' = rawView === 'map' ? 'map' : 'list';

  // 6. Selected place
  const rawPlace = search.get('place') || undefined;

  // 7. Lang
  const rawLang = search.get('lang');
  const finalLang: 'en' | 'fil' = rawLang === 'fil' ? 'fil' : 'en';

  return {
    harvest: {
      crop: finalCrop,
      quantityKg: finalKg,
      originMunicipality: finalOrigin,
      readyDate: finalDate,
    },
    view: finalView,
    selectedPlaceId: rawPlace,
    lang: finalLang,
  };
}

export function serializeDiscoverQuery(
  harvest: HarvestQuery,
  view: 'list' | 'map' = 'list',
  placeId?: string,
  lang: 'en' | 'fil' = 'en'
): string {
  const params = new URLSearchParams();
  params.set('crop', harvest.crop);
  params.set('kg', harvest.quantityKg.toString());
  params.set('origin', harvest.originMunicipality);
  if (harvest.readyDate) {
    params.set('ready', harvest.readyDate);
  }
  if (view === 'map') {
    params.set('view', 'map');
  }
  if (placeId) {
    params.set('place', placeId);
  }
  if (lang === 'fil') {
    params.set('lang', 'fil');
  }
  return params.toString();
}

export function parseCompareQuery(params: URLSearchParams | string): {
  placeIds: string[];
  harvest: HarvestQuery;
  lang: 'en' | 'fil';
} {
  const search = typeof params === 'string' ? new URLSearchParams(params) : params;
  const rawPlaces = search.get('places') || '';
  const placeIds = rawPlaces
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3); // Max 3 per contract

  const discover = parseDiscoverQuery(search);

  return {
    placeIds: placeIds.length > 0 ? placeIds : ['demo-cooperative', 'demo-processor', 'demo-market'],
    harvest: discover.harvest,
    lang: discover.lang,
  };
}
