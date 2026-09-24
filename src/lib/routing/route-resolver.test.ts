import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_OUTLETS } from '../../content/demo-outlets';
import type { Outlet } from '../domain/types';
import { clearRuntimeRouteCache } from './runtime-route-cache';
import { getImmediateOutletRoute, resolveOutletRoute } from './route-resolver';

const localOutlet: Outlet = {
  id: 'local-bagsakan-test',
  slug: 'local-bagsakan-test',
  name: 'Test Bagsakan',
  category: 'market',
  municipality: 'Pagsanjan',
  lat: 14.275,
  lng: 121.459,
  description: 'Local test',
  descriptionFil: 'Lokal na test',
  sampleOfferDate: '2026-09-25',
  acceptedCrops: {},
  isDemoFixture: true,
  isLocalBagsakan: true,
  localLocationBasis: 'exact_pin',
};

const runtimeResponse = {
  schemaVersion: 1,
  provider: 'openrouteservice',
  profile: 'driving-car',
  distanceMeters: 30500,
  durationSeconds: 2280,
  geometryStatus: 'ready',
  geometry: {
    type: 'LineString',
    coordinates: [[121.241, 14.17], [121.35, 14.22], [121.459, 14.275]],
  },
  generatedAt: '2026-09-25T00:00:00Z',
  attribution: 'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
};

beforeEach(() => clearRuntimeRouteCache());

describe('outlet route resolver', () => {
  it('uses the checked-in artifact for static outlets without a runtime request', async () => {
    const outlet = DEMO_OUTLETS.find((item) => item.id === 'demo-nagcarlan-kitchen')!;
    const fetchImpl = vi.fn();
    const result = await resolveOutletRoute('los-banos', outlet, 19.3, {
      endpoint: '/api/route-estimate',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.state).toBe('static');
    expect(result.route.routeEvidence).toBe('static_artifact');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('keeps a local Bagsakan on immediate straight-line fallback before routing resolves', () => {
    const result = getImmediateOutletRoute('los-banos', localOutlet, 25.7);
    expect(result.state).toBe('fallback');
    expect(result.route.source).toBe('straight_line');
  });

  it('upgrades a local Bagsakan to runtime road evidence', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(runtimeResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const result = await resolveOutletRoute('los-banos', localOutlet, 25.7, {
      endpoint: '/api/route-estimate',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.state).toBe('runtime');
    expect(result.route.source).toBe('road');
    expect(result.route.routeEvidence).toBe('runtime_endpoint');
    expect(result.route.roadDistanceKm).toBe(30.5);
    expect(result.route.geometry?.coordinates).toHaveLength(3);

    const cached = getImmediateOutletRoute('los-banos', localOutlet, 25.7);
    expect(cached.state).toBe('cached');
    expect(cached.route.source).toBe('road');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps Haversine when runtime routing fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 502 }));
    const result = await resolveOutletRoute('los-banos', localOutlet, 25.7, {
      endpoint: '/api/route-estimate',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.state).toBe('fallback');
    expect(result.failureReason).toBe('provider_unavailable');
    expect(result.route.source).toBe('straight_line');
    expect(result.route.roadDistanceKm).toBeNull();
  });

  it('changes cache identity when the pin or origin changes', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(runtimeResponse), { status: 200 })
    );
    await resolveOutletRoute('los-banos', localOutlet, 25.7, {
      endpoint: '/api/route-estimate',
      fetchImpl: fetchImpl as typeof fetch,
    });
    await resolveOutletRoute('calamba', localOutlet, 20, {
      endpoint: '/api/route-estimate',
      fetchImpl: fetchImpl as typeof fetch,
    });
    await resolveOutletRoute('los-banos', { ...localOutlet, lat: 14.276 }, 25.8, {
      endpoint: '/api/route-estimate',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
