import { describe, expect, it } from 'vitest';
import {
  distanceForBasis,
  distanceForSorting,
  getOutletRouteEstimate,
  getRoutingMatrixArtifact,
  hasRoadRoutingData,
  sharedDistanceBasis,
  type OutletRouteEstimate,
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

  it('sorts by the only supported distance when road routing is unavailable', () => {
    const route = getOutletRouteEstimate('los-banos', 'demo-market', 1.1);
    expect(distanceForSorting(route)).toBe(1.1);
  });



  it('uses road distance only when every ranked route has road evidence', () => {
    const roadA: OutletRouteEstimate = {
      source: 'road',
      straightLineDistanceKm: 5,
      roadDistanceKm: 7,
      roadDurationMinutes: 14,
      provider: 'openrouteservice',
      profile: 'driving-car',
      generatedAt: '2026-09-22T00:00:00Z',
    };
    const roadB: OutletRouteEstimate = {
      source: 'road',
      straightLineDistanceKm: 6,
      roadDistanceKm: 8,
      roadDurationMinutes: 16,
      provider: 'openrouteservice',
      profile: 'driving-car',
      generatedAt: '2026-09-22T00:00:00Z',
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
      roadDurationMinutes: 31,
      provider: 'openrouteservice',
      profile: 'driving-car',
      generatedAt: '2026-09-22T00:00:00Z',
    };
    const fallback: OutletRouteEstimate = {
      source: 'straight_line',
      straightLineDistanceKm: 13,
      roadDistanceKm: null,
      roadDurationMinutes: null,
      provider: null,
      profile: null,
      generatedAt: null,
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
