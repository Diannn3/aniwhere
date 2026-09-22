import { describe, expect, it } from 'vitest';
import {
  distanceForSorting,
  getOutletRouteEstimate,
  getRoutingMatrixArtifact,
  hasRoadRoutingData,
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

  it('does not expose an ORS secret through the routing artifact', () => {
    const serialized = JSON.stringify(getRoutingMatrixArtifact());
    expect(serialized).not.toMatch(/api[_-]?key/i);
    expect(serialized).not.toMatch(/authorization/i);
  });
});
