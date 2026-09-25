import type { FitResult, Outlet } from '../domain/types';
import { distanceForBasis, type OutletRouteEstimate } from '../routing/routing-matrix';

export interface PickerItem {
  outlet: Outlet;
  fit: FitResult;
  distanceKm: number;
  route: OutletRouteEstimate;
  isCompared: boolean;
}

export function capacityLabel(item: PickerItem, lang: 'en' | 'fil'): string {
  if (item.fit.acceptedKg === null) return lang === 'fil' ? 'Kapasidad: kumpirmahin' : 'Capacity: confirm';
  return lang === 'fil'
    ? `Tanggap: ${item.fit.acceptedKg.toLocaleString('en-PH')} kg`
    : `Accepts ${item.fit.acceptedKg.toLocaleString('en-PH')} kg`;
}

export function distanceLabel(item: PickerItem, basis: 'road' | 'straight_line', lang: 'en' | 'fil'): string {
  const value = distanceForBasis(item.route, basis).toFixed(1);
  return basis === 'road'
    ? `${value} km ${lang === 'fil' ? 'sa kalsada' : 'by road'}`
    : `${value} km ${lang === 'fil' ? 'tuwid na layo' : 'straight-line'}`;
}

export function routeSummary(item: PickerItem, lang: 'en' | 'fil'): string {
  if (item.route.source === 'road' && typeof item.route.roadDistanceKm === 'number') {
    const minutes = item.route.roadDurationMinutes;
    return lang === 'fil'
      ? `${item.route.roadDistanceKm.toFixed(1)} km sa kalsada${minutes ? ` · mga ${minutes} min` : ''}`
      : `${item.route.roadDistanceKm.toFixed(1)} km by road${minutes ? ` · about ${minutes} min` : ''}`;
  }
  return lang === 'fil'
    ? `${item.route.straightLineDistanceKm.toFixed(1)} km na tuwid na layo · walang road route`
    : `${item.route.straightLineDistanceKm.toFixed(1)} km straight-line · no road route`;
}

export function confirmationNote(origin: string, lang: 'en' | 'fil', byRoad: boolean): string {
  if (byRoad) return lang === 'fil'
    ? `Tantyang ruta mula sa sentro ng ${origin}, hindi sa eksaktong bukid. Kumpirmahin ang pagtanggap bago bumiyahe.`
    : `Route estimate starts at ${origin} center, not the exact farm. Confirm receiving terms before travel.`;
  return lang === 'fil'
    ? `Tuwid na layo mula sa sentro ng ${origin}; hindi ito direksyon sa kalsada. Kumpirmahin ang pagtanggap bago bumiyahe.`
    : `Straight-line distance starts at ${origin} center; it is not road directions. Confirm receiving terms before travel.`;
}

export function acceptedQuantity(item: PickerItem, lang: 'en' | 'fil'): string {
  const accepted = item.fit.acceptedKg?.toLocaleString('en-PH');
  if (accepted === undefined) return lang === 'fil' ? 'Kapasidad: kumpirmahin' : 'Capacity: confirm';
  const remaining = item.fit.remainingKg?.toLocaleString('en-PH');
  return `${lang === 'fil' ? 'Tanggap' : 'Accepts'} ${accepted} kg${remaining === undefined ? '' : ` · ${lang === 'fil' ? 'Matitira' : 'Remaining'} ${remaining} kg`}`;
}
