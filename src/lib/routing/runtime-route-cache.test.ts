import { describe, expect, it } from 'vitest';
import { isCachedRuntimeRoute, runtimeRouteCacheKey } from './runtime-route-cache';

const route = {
  source: 'road',
  routeEvidence: 'runtime_endpoint',
  straightLineDistanceKm: 25.7,
  roadDistanceKm: 30.5,
  roadDurationSeconds: 2280,
  roadDurationMinutes: 38,
  geometry: {
    type: 'LineString',
    coordinates: [[121.241, 14.17], [121.35, 14.22], [121.459, 14.275]],
  },
  geometryStatus: 'ready',
  geometryPath: null,
  metricSource: 'directions',
  provider: 'openrouteservice',
  profile: 'driving-car',
  generatedAt: '2026-09-25T00:00:00Z',
  attribution: 'test',
} as const;

describe('runtime route cache contract', () => {
  it('normalizes the cache key by route inputs', () => {
    expect(runtimeRouteCacheKey('los-banos', 14.2750001, 121.4590001))
      .toBe('los-banos:14.275000:121.459000:driving-car');
  });

  it('accepts complete runtime road evidence', () => {
    expect(isCachedRuntimeRoute(route)).toBe(true);
  });

  it('rejects corrupt or contradictory cached evidence', () => {
    expect(isCachedRuntimeRoute({ ...route, roadDistanceKm: -1 })).toBe(false);
    expect(isCachedRuntimeRoute({ ...route, routeEvidence: 'static_artifact' })).toBe(false);
    expect(isCachedRuntimeRoute({ ...route, roadDurationMinutes: 99 })).toBe(false);
    expect(isCachedRuntimeRoute({ ...route, geometry: undefined })).toBe(false);
    expect(isCachedRuntimeRoute({
      ...route,
      geometryStatus: 'unavailable',
      geometry: undefined,
    })).toBe(true);
  });
});
