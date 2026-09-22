import type { HarvestQuery } from '../domain/types';
import { normalizeCrop } from '../domain/crops';
import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
import { isValidIsoDate } from '../domain/validation';

export interface ParsedDiscoverQuery {
  harvest: HarvestQuery;
  view: 'list' | 'map';
  selectedPlaceId?: string;
  lang: 'en' | 'fil';
}

export function todayInManila(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseDiscoverQuery(params: URLSearchParams | string): ParsedDiscoverQuery {
  const search = typeof params === 'string' ? new URLSearchParams(params) : params;

  const rawCrop = search.get('crop') || 'tomato';
  const { key: cropKey } = normalizeCrop(rawCrop);
  const finalCrop = cropKey !== 'other' ? cropKey : rawCrop;

  const rawKg = Number(search.get('kg') || 300);
  const finalKg = isNaN(rawKg) || rawKg <= 0 || rawKg > 100000 ? 300 : rawKg;

  const rawOrigin = search.get('origin') || 'los-banos';
  const knownMun = LAGUNA_MUNICIPALITIES.find((m) => m.id === rawOrigin);
  const finalOrigin = knownMun ? knownMun.id : 'los-banos';

  const today = todayInManila();
  const rawDate = search.get('ready') || today;
  const finalDate = isValidIsoDate(rawDate) ? rawDate : today;

  const rawView = search.get('view');
  const finalView: 'list' | 'map' = rawView === 'map' ? 'map' : 'list';

  const rawPlace = search.get('place') || undefined;

  const rawLang = search.get('lang');
  const finalLang: 'en' | 'fil' = rawLang === 'fil' ? 'fil' : 'en';

  const variety = search.get('variety')?.trim() || undefined;
  const grade = search.get('grade')?.trim() || undefined;
  const packaging = search.get('packaging')?.trim() || undefined;
  const details =
    variety || grade || packaging
      ? {
          ...(variety ? { variety } : {}),
          ...(grade ? { grade } : {}),
          ...(packaging ? { packaging } : {}),
        }
      : undefined;

  return {
    harvest: {
      crop: finalCrop,
      quantityKg: finalKg,
      originMunicipality: finalOrigin,
      readyDate: finalDate,
      details,
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
  if (harvest.details?.variety?.trim()) {
    params.set('variety', harvest.details.variety.trim());
  }
  if (harvest.details?.grade?.trim()) {
    params.set('grade', harvest.details.grade.trim());
  }
  if (harvest.details?.packaging?.trim()) {
    params.set('packaging', harvest.details.packaging.trim());
  }
  params.set('view', view);
  if (placeId) {
    params.set('place', placeId);
  }
  params.set('lang', lang);
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
    .slice(0, 3);

  const discover = parseDiscoverQuery(search);

  return {
    placeIds: placeIds.length > 0 ? placeIds : ['demo-cooperative', 'demo-processor', 'demo-market'],
    harvest: discover.harvest,
    lang: discover.lang,
  };
}
