import { describe, expect, it } from 'vitest';
import {
  distanceForBasis,
  distanceForSorting,
  getOutletRouteEstimate,
  getOutletRouteEstimateFromArtifact,
  getRoutingMatrixArtifact,
  hasRoadRoutingData,
  hasRoadRoutingDataForArtifact,
  sharedDistanceBasis,
  type OutletRouteEstimate,
  type RouteMatrixArtifact,
} from './routing-matrix';

describe('routing matrix trust boundary', () => {
  it('fails closed when the checked-in road matrix has not been generated', () => {
    const artifact = getRoutingMatrixArtifact();
    expect(artifact.status).toBe('not_generated');
    expect(hasRoadRoutingData()).toBe(false);
  });

  it('keeps Haversine fallback explicitly separate from road routing', () => {
    const route = getOutletRouteEstimate('los-banos', 'demo-cooperative', 22.4);
    expect(route.source).toBe('straight_line');
    expect(route.straightLineDistanceKm).toBe(22.4);
    expect(route.roadDistanceKm).toBeNull();
    expect(route.roadDurationMinutes).toBeNull();
    expect(route.provider).toBeNull();
  });


  it('reads validated road evidence from an injected ready artifact', () => {
    const ready: RouteMatrixArtifact = {
      schemaVersion: 2,
      generatedAt: '2026-09-25T00:00:00Z',
      provider: 'openrouteservice',
      providerBase: 'https://api.heigit.org/openrouteservice/v2',
      profile: 'driving-car',
      generationMode: 'metrics',
      status: 'ready',
      attribution: 'Routing data test attribution',
      inputFingerprint: 'test-fingerprint',
      origins: { 'los-banos': { name: 'Los Baños, Laguna', lat: 14.17, lng: 121.241 } },
      outlets: { 'demo-market': { name: 'Market', lat: 14.18, lng: 121.243 } },
      cells: {
        'los-banos': {
          'demo-market': { status: 'routed', distanceMeters: 1750, durationSeconds: 420 },
        },
      },
    };

    const route = getOutletRouteEstimateFromArtifact(ready, 'los-banos', 'demo-market', 1.1);
    expect(hasRoadRoutingDataForArtifact(ready)).toBe(true);
    expect(route.source).toBe('road');
    expect(route.roadDistanceKm).toBe(1.8);
    expect(route.roadDurationSeconds).toBe(420);
    expect(route.roadDurationMinutes).toBe(7);
  });

  it('does not invent a minimum one-minute drive for zero-duration evidence', () => {
    const ready: RouteMatrixArtifact = {
      schemaVersion: 2,
      generatedAt: '2026-09-25T00:00:00Z',
      provider: 'openrouteservice',
      providerBase: 'https://api.heigit.org/openrouteservice/v2',
      profile: 'driving-car',
      generationMode: 'metrics',
      status: 'ready',
      attribution: 'Routing data test attribution',
      inputFingerprint: 'test-fingerprint',
      origins: {},
      outlets: {},
      cells: {
        'santa-cruz': {
          'demo-cooperative': { status: 'routed', distanceMeters: 0, durationSeconds: 0 },
        },
      },
    };

    const route = getOutletRouteEstimateFromArtifact(ready, 'santa-cruz', 'demo-cooperative', 0);
    expect(route.source).toBe('road');
    expect(route.roadDurationSeconds).toBe(0);
    expect(route.roadDurationMinutes).toBe(0);
  });

  it('keeps an unavailable cell on straight-line fallback even in a partial artifact', () => {
    const partial: RouteMatrixArtifact = {
      schemaVersion: 2,
      generatedAt: '2026-09-25T00:00:00Z',
      provider: 'openrouteservice',
      providerBase: 'https://api.heigit.org/openrouteservice/v2',
      profile: 'driving-car',
      generationMode: 'metrics_and_geometry',
      status: 'partial',
      attribution: 'Routing data test attribution',
      inputFingerprint: 'test-fingerprint',
      origins: {},
      outlets: {},
      cells: { 'los-banos': { 'demo-market': { status: 'unavailable' } } },
    };

    const route = getOutletRouteEstimateFromArtifact(partial, 'los-banos', 'demo-market', 1.1);
    expect(route.source).toBe('straight_line');
    expect(route.roadDistanceKm).toBeNull();
    expect(route.roadDurationMinutes).toBeNull();
  });

  it('sorts by the only supported distance when road routing is unavailable', () => {
    const route = getOutletRouteEstimate('los-banos', 'demo-market', 1.1);
    expect(distanceForSorting(route)).toBe(1.1);
  });



  it('uses road distance only when every ranked route has road evidence', () => {
    const roadA: OutletRouteEstimate = {
      source: 'road',
      straightLineDistanceKm: 5,
      roadDistanceKm: 7,
      roadDurationSeconds: 840,
      roadDurationMinutes: 14,
      geometryStatus: 'ready',
      geometryPath: '/generated/routes/a.geojson',
      metricSource: 'directions',
      provider: 'openrouteservice',
      profile: 'driving-car',
      generatedAt: '2026-09-22T00:00:00Z',
      attribution: 'Routing data test attribution',
    };
    const roadB: OutletRouteEstimate = {
      source: 'road',
      straightLineDistanceKm: 6,
      roadDistanceKm: 8,
      roadDurationSeconds: 960,
      roadDurationMinutes: 16,
      geometryStatus: 'ready',
      geometryPath: '/generated/routes/b.geojson',
      metricSource: 'directions',
      provider: 'openrouteservice',
      profile: 'driving-car',
      generatedAt: '2026-09-22T00:00:00Z',
      attribution: 'Routing data test attribution',
    };

    const basis = sharedDistanceBasis([roadA, roadB]);
    expect(basis).toBe('road');
    expect(distanceForBasis(roadA, basis)).toBe(7);
    expect(distanceForBasis(roadB, basis)).toBe(8);
  });

  it('falls back the whole ranking to straight-line distance when routing is partial', () => {
    const routed: OutletRouteEstimate = {
      source: 'road',
      straightLineDistanceKm: 12,
      roadDistanceKm: 18,
      roadDurationSeconds: 1860,
      roadDurationMinutes: 31,
      geometryStatus: 'not_requested',
      geometryPath: null,
      metricSource: 'matrix',
      provider: 'openrouteservice',
      profile: 'driving-car',
      generatedAt: '2026-09-22T00:00:00Z',
      attribution: 'Routing data test attribution',
    };
    const fallback: OutletRouteEstimate = {
      source: 'straight_line',
      straightLineDistanceKm: 13,
      roadDistanceKm: null,
      roadDurationSeconds: null,
      roadDurationMinutes: null,
      geometryStatus: null,
      geometryPath: null,
      metricSource: null,
      provider: null,
      profile: null,
      generatedAt: null,
      attribution: null,
    };

    const basis = sharedDistanceBasis([routed, fallback]);
    expect(basis).toBe('straight_line');
    expect(distanceForBasis(routed, basis)).toBe(12);
    expect(distanceForBasis(fallback, basis)).toBe(13);
  });

  it('does not expose an ORS secret through the routing artifact', () => {
    const serialized = JSON.stringify(getRoutingMatrixArtifact());
    expect(serialized).not.toMatch(/api[_-]?key/i);
    expect(serialized).not.toMatch(/authorization/i);
  });
});
