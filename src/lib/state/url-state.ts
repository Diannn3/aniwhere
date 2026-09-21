import type { HarvestQuery } from '../domain/types';
import { normalizeCrop } from '../domain/crops';
import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
import { isValidIsoDate } from '../domain/validation';

export interface ParsedDiscoverQuery {
  harvest: HarvestQuery;
  view: 'list' | 'map';
  selectedPlaceId?: string;
  lang: 'en' | 'fil';
  issues: string[];
}

export function preferredLanguage(params: URLSearchParams): 'en' | 'fil' {
  const explicit = params.get('lang');
  if (explicit === 'en' || explicit === 'fil') return explicit;
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('aniwhere_language') : null;
    if (saved === 'en' || saved === 'fil') return saved;
  } catch {
    // Private browsing can deny storage; Filipino remains usable.
  }
  return 'fil';
}

export function comparisonIds(value: string | null): string[] {
  return [...new Set((value ?? '').split(',').map((id) => id.trim()).filter(Boolean))].slice(0, 3);
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
  const issues: string[] = [];

  const rawCrop = search.get('crop') || 'tomato';
  const { key: cropKey } = normalizeCrop(rawCrop);
  const finalCrop = cropKey !== 'other' ? cropKey : rawCrop;

  const rawKg = search.has('kg') ? Number(search.get('kg')) : 300;
  const invalidKg = search.get('kg')?.trim() === '' || !Number.isFinite(rawKg) || rawKg <= 0 || rawKg > 100000;
  if (search.has('kg') && invalidKg) issues.push('quantity');
  const finalKg = invalidKg ? 300 : rawKg;

  const rawOrigin = search.get('origin') ?? 'los-banos';
  const knownMun = LAGUNA_MUNICIPALITIES.find((m) => m.id === rawOrigin);
  if (search.has('origin') && !knownMun) issues.push('origin');
  const finalOrigin = knownMun ? knownMun.id : 'los-banos';

  const today = todayInManila();
  const rawDate = search.get('ready') ?? today;
  if (search.has('ready') && !isValidIsoDate(rawDate)) issues.push('ready date');
  const finalDate = isValidIsoDate(rawDate) ? rawDate : today;

  const rawView = search.get('view');
  const finalView: 'list' | 'map' = rawView === 'map' ? 'map' : 'list';

  const rawPlace = search.get('place') || undefined;

  const finalLang = preferredLanguage(search);

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
    issues,
  };
}

export function serializeDiscoverQuery(
  harvest: HarvestQuery,
  view: 'list' | 'map' = 'list',
  placeId?: string,
  lang: 'en' | 'fil' = 'fil'
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
  if (view === 'map') {
    params.set('view', 'map');
  }
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
  const placeIds = comparisonIds(rawPlaces);

  const discover = parseDiscoverQuery(search);

  return {
    placeIds: search.has('places') ? placeIds : ['demo-cooperative', 'demo-processor', 'demo-market'],
    harvest: discover.harvest,
    lang: discover.lang,
  };
}
