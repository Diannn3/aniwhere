import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutletRouteEstimate } from './routing-matrix';
import { clearRouteGeometryCache, loadRouteGeometry } from './route-geometry';

function road(overrides: Partial<OutletRouteEstimate> = {}): OutletRouteEstimate {
  return {
    source: 'road',
    straightLineDistanceKm: 10,
    roadDistanceKm: 14,
    roadDurationSeconds: 1200,
    roadDurationMinutes: 20,
    geometryStatus: 'ready',
    geometryPath: '/generated/routes/20260925-abcdef123456/los-banos--demo-market.geojson',
    metricSource: 'directions',
    provider: 'openrouteservice',
    profile: 'driving-car',
    generatedAt: '2026-09-25T00:00:00Z',
    attribution: 'test',
    ...overrides,
  };
}

beforeEach(() => clearRouteGeometryCache());

describe('route geometry loader', () => {
  it('loads and caches a same-origin generated LineString', async () => {
    const geometry = {
      type: 'LineString' as const,
      coordinates: [
        [121.241, 14.17],
        [121.243, 14.18],
      ] as Array<[number, number]>,
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => geometry,
    })) as unknown as typeof fetch;

    await expect(loadRouteGeometry(road(), fetchImpl)).resolves.toEqual(geometry);
    await expect(loadRouteGeometry(road(), fetchImpl)).resolves.toEqual(geometry);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects external or malformed geometry paths without fetching', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(
      loadRouteGeometry(road({ geometryPath: 'https://example.com/route.geojson' }), fetchImpl)
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed on malformed geometry and allows a later retry', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ type: 'Point', coordinates: [121.2, 14.2] }),
    })) as unknown as typeof fetch;

    await expect(loadRouteGeometry(road(), fetchImpl)).resolves.toBeNull();
    await expect(loadRouteGeometry(road(), fetchImpl)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('uses already bundled geometry without a network request', async () => {
    const geometry = {
      type: 'LineString' as const,
      coordinates: [
        [121.241, 14.17],
        [121.243, 14.18],
      ] as Array<[number, number]>,
    };
    const fetchImpl = vi.fn() as unknown as typeof fetch;

    await expect(loadRouteGeometry(road({ geometry }), fetchImpl)).resolves.toEqual(geometry);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
