import { describe, expect, it } from 'vitest';
import { routeSummary, type PickerItem } from './picker';
import type { OutletRouteEstimate } from '../routing/routing-matrix';

function item(route: OutletRouteEstimate): PickerItem {
  return {
    outlet: {} as PickerItem['outlet'],
    fit: {} as PickerItem['fit'],
    distanceKm: route.straightLineDistanceKm,
    route,
    isCompared: false,
  };
}

const baseRoad: OutletRouteEstimate = {
  source: 'road',
  routeEvidence: 'runtime_endpoint',
  straightLineDistanceKm: 1,
  roadDistanceKm: 1.2,
  roadDurationSeconds: 0,
  roadDurationMinutes: 0,
  geometryStatus: 'unavailable',
  geometryPath: null,
  metricSource: 'directions',
  provider: 'openrouteservice',
  profile: 'driving-car',
  generatedAt: '2026-09-25T00:00:00Z',
  attribution: 'test',
};

describe('map picker routeSummary', () => {
  it('preserves zero and sub-minute duration truth', () => {
    expect(routeSummary(item(baseRoad), 'en')).toContain('0 min');
    expect(routeSummary(item({ ...baseRoad, roadDurationSeconds: 30 }), 'en')).toContain('<1 min');
  });

  it('describes fallback as unavailable evidence, not proof that no road exists', () => {
    const fallback: OutletRouteEstimate = {
      ...baseRoad,
      source: 'straight_line',
      routeEvidence: 'none',
      roadDistanceKm: null,
      roadDurationSeconds: null,
      roadDurationMinutes: null,
      geometryStatus: null,
      metricSource: null,
      provider: null,
      profile: null,
      generatedAt: null,
      attribution: null,
    };
    expect(routeSummary(item(fallback), 'en')).toContain('road route unavailable');
  });
});
