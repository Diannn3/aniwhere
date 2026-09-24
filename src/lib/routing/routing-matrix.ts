import matrixArtifact from '../../generated/routing-matrix.json' with { type: 'json' };

export type RouteCellStatus = 'routed' | 'unavailable';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export type RouteMetricSource = 'matrix' | 'directions';
export type RouteGeometryStatus = 'not_requested' | 'ready' | 'unavailable';

export interface RouteMatrixCell {
  status: RouteCellStatus;
  distanceMeters?: number;
  durationSeconds?: number;
  metricSource?: RouteMetricSource;
  geometryStatus?: RouteGeometryStatus;
  geometryPath?: string;
  geometry?: RouteGeometry;
}

export interface RouteMatrixArtifact {
  schemaVersion: 2;
  generatedAt: string | null;
  provider: 'openrouteservice';
  providerBase: string;
  profile: 'driving-car';
  generationMode: 'not_generated' | 'metrics' | 'metrics_and_geometry';
  status: 'ready' | 'not_generated' | 'partial';
  attribution: string;
  inputFingerprint: string;
  geometryRunId?: string | null;
  note?: string;
  engine?: {
    version?: string;
    buildDate?: string;
    graphDate?: string;
    osmDate?: string;
  };
  origins: Record<string, { name: string; lat: number; lng: number }>;
  outlets: Record<string, { name: string; lat: number; lng: number }>;
  cells: Record<string, Record<string, RouteMatrixCell>>;
}

export type RouteEvidenceSource = 'static_artifact' | 'runtime_endpoint' | 'none';

export interface OutletRouteEstimate {
  source: 'road' | 'straight_line';
  routeEvidence: RouteEvidenceSource;
  straightLineDistanceKm: number;
  roadDistanceKm: number | null;
  roadDurationSeconds: number | null;
  roadDurationMinutes: number | null;
  geometry?: RouteGeometry;
  geometryStatus: RouteGeometryStatus | null;
  geometryPath: string | null;
  metricSource: RouteMetricSource | null;
  provider: 'openrouteservice' | null;
  profile: 'driving-car' | null;
  generatedAt: string | null;
  attribution: string | null;
}

const artifact = matrixArtifact as RouteMatrixArtifact;

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getRoutingMatrixArtifact(): RouteMatrixArtifact {
  return artifact;
}

export function getOutletRouteEstimateFromArtifact(
  artifactInput: RouteMatrixArtifact,
  originId: string,
  outletId: string,
  straightLineDistanceKm: number
): OutletRouteEstimate {
  const cell = artifactInput.cells?.[originId]?.[outletId];

  if (
    artifactInput.status !== 'not_generated' &&
    cell?.status === 'routed' &&
    finitePositive(cell.distanceMeters) &&
    finitePositive(cell.durationSeconds)
  ) {
    return {
      source: 'road',
      routeEvidence: 'static_artifact',
      straightLineDistanceKm,
      roadDistanceKm: Math.round((cell.distanceMeters / 1000) * 10) / 10,
      roadDurationSeconds: cell.durationSeconds,
      roadDurationMinutes: Math.round(cell.durationSeconds / 60),
      geometry: cell.geometry,
      geometryStatus:
        cell.geometryStatus ?? (cell.geometry || cell.geometryPath ? 'ready' : 'not_requested'),
      geometryPath: cell.geometryPath ?? null,
      metricSource: cell.metricSource ?? 'matrix',
      provider: artifactInput.provider,
      profile: artifactInput.profile,
      generatedAt: artifactInput.generatedAt,
      attribution: artifactInput.attribution,
    };
  }

  return {
    source: 'straight_line',
    routeEvidence: 'none',
    straightLineDistanceKm,
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
}

export function getOutletRouteEstimate(
  originId: string,
  outletId: string,
  straightLineDistanceKm: number
): OutletRouteEstimate {
  return getOutletRouteEstimateFromArtifact(artifact, originId, outletId, straightLineDistanceKm);
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

export function formatEstimatedDriveDuration(route: OutletRouteEstimate): string | null {
  const seconds = route.roadDurationSeconds;
  if (seconds === null) return null;
  if (seconds === 0) return '0 min';
  if (seconds < 60) return '<1 min';
  return `~${Math.round(seconds / 60)} min`;
}

export function hasRoadRoutingDataForArtifact(artifactInput: RouteMatrixArtifact): boolean {
  return artifactInput.status === 'ready' || artifactInput.status === 'partial';
}

export function hasRoadRoutingData(): boolean {
  return hasRoadRoutingDataForArtifact(artifact);
}
