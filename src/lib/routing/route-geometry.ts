import type { OutletRouteEstimate, RouteGeometry } from './routing-matrix';

const geometryCache = new Map<string, Promise<RouteGeometry | null>>();

export function isRouteGeometry(value: unknown): value is RouteGeometry {
  if (!value || typeof value !== 'object') return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return false;
  if (geometry.coordinates.length < 2) return false;

  return geometry.coordinates.every((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) return false;
    const [lng, lat] = coordinate;
    return (
      typeof lng === 'number' &&
      Number.isFinite(lng) &&
      lng >= -180 &&
      lng <= 180 &&
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90
    );
  });
}

function safeGeometryPath(path: string): boolean {
  return /^\/generated\/routes\/[a-z0-9-]+\/[a-z0-9-]+--[a-z0-9-]+\.geojson$/.test(path);
}

export async function loadRouteGeometry(
  route: OutletRouteEstimate,
  fetchImpl: typeof fetch = fetch
): Promise<RouteGeometry | null> {
  if (isRouteGeometry(route.geometry)) return route.geometry;
  if (
    route.source !== 'road' ||
    route.geometryStatus !== 'ready' ||
    !route.geometryPath ||
    !safeGeometryPath(route.geometryPath)
  ) {
    return null;
  }

  const geometryPath = route.geometryPath;
  const existing = geometryCache.get(geometryPath);
  if (existing) return existing;

  const request = (async () => {
    try {
      const response = await fetchImpl(geometryPath, {
        headers: { Accept: 'application/geo+json, application/json' },
      });
      if (!response.ok) return null;
      const candidate = await response.json();
      return isRouteGeometry(candidate) ? candidate : null;
    } catch {
      return null;
    }
  })();

  geometryCache.set(geometryPath, request);
  const result = await request;
  if (!result) geometryCache.delete(geometryPath);
  return result;
}

export function clearRouteGeometryCache(): void {
  geometryCache.clear();
}
