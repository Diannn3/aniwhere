import matrixArtifact from '../../generated/routing-matrix.json';

export type RouteCellStatus = 'routed' | 'unavailable';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface RouteMatrixCell {
  status: RouteCellStatus;
  distanceMeters?: number;
  durationSeconds?: number;
  geometry?: RouteGeometry;
}

export interface RouteMatrixArtifact {
  schemaVersion: 1;
  generatedAt: string | null;
  provider: 'openrouteservice';
  providerBase: string;
  profile: 'driving-car';
  status: 'ready' | 'not_generated' | 'partial';
  note?: string;
  origins: Record<string, { name: string; lat: number; lng: number }>;
  outlets: Record<string, { name: string; lat: number; lng: number }>;
  cells: Record<string, Record<string, RouteMatrixCell>>;
}

export interface OutletRouteEstimate {
  source: 'road' | 'straight_line';
  straightLineDistanceKm: number;
  roadDistanceKm: number | null;
  roadDurationMinutes: number | null;
  geometry?: RouteGeometry;
  provider: 'openrouteservice' | null;
  profile: 'driving-car' | null;
  generatedAt: string | null;
}

const artifact = matrixArtifact as RouteMatrixArtifact;

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getRoutingMatrixArtifact(): RouteMatrixArtifact {
  return artifact;
}

export function getOutletRouteEstimate(
  originId: string,
  outletId: string,
  straightLineDistanceKm: number
): OutletRouteEstimate {
  const cell = artifact.cells?.[originId]?.[outletId];

  if (
    artifact.status !== 'not_generated' &&
    cell?.status === 'routed' &&
    finitePositive(cell.distanceMeters) &&
    finitePositive(cell.durationSeconds)
  ) {
    return {
      source: 'road',
      straightLineDistanceKm,
      roadDistanceKm: Math.round((cell.distanceMeters / 1000) * 10) / 10,
      roadDurationMinutes: Math.max(1, Math.round(cell.durationSeconds / 60)),
      geometry: cell.geometry,
      provider: artifact.provider,
      profile: artifact.profile,
      generatedAt: artifact.generatedAt,
    };
  }

  return {
    source: 'straight_line',
    straightLineDistanceKm,
    roadDistanceKm: null,
    roadDurationMinutes: null,
    provider: null,
    profile: null,
    generatedAt: null,
  };
}

export type RouteDistanceBasis = 'road' | 'straight_line';

export function sharedDistanceBasis(routes: OutletRouteEstimate[]): RouteDistanceBasis {
  if (
    routes.length > 0 &&
    routes.every((route) => route.source === 'road' && route.roadDistanceKm !== null)
  ) {
    return 'road';
  }

  return 'straight_line';
}

export function distanceForBasis(
  route: OutletRouteEstimate,
  basis: RouteDistanceBasis
): number {
  if (basis === 'road' && route.roadDistanceKm !== null) {
    return route.roadDistanceKm;
  }

  return route.straightLineDistanceKm;
}

/**
 * Prefer sharedDistanceBasis + distanceForBasis when ordering multiple outlets.
 * This one-route helper remains for display/single-route callers only.
 */
export function distanceForSorting(route: OutletRouteEstimate): number {
  return route.roadDistanceKm ?? route.straightLineDistanceKm;
}

export function hasRoadRoutingData(): boolean {
  return artifact.status === 'ready' || artifact.status === 'partial';
}
