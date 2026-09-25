import type { Outlet } from '../domain/types';
import {
  getOutletRouteEstimate,
  type OutletRouteEstimate,
} from './routing-matrix';
import {
  configuredRuntimeRouteEndpoint,
  requestRuntimeRoute,
  type RuntimeRouteFailureReason,
} from './runtime-route-client';
import {
  getCachedRuntimeRoute,
  runtimeRouteCacheKey,
  setCachedRuntimeRoute,
} from './runtime-route-cache';

export type RouteResolutionState = 'static' | 'cached' | 'runtime' | 'fallback';

export interface RouteResolution {
  route: OutletRouteEstimate;
  state: RouteResolutionState;
  failureReason?: RuntimeRouteFailureReason;
}

function runtimeEstimate(
  straightLineDistanceKm: number,
  result: Extract<Awaited<ReturnType<typeof requestRuntimeRoute>>, { ok: true }>
): OutletRouteEstimate {
  return {
    source: 'road',
    routeEvidence: 'runtime_endpoint',
    straightLineDistanceKm,
    roadDistanceKm: Math.round((result.distanceMeters / 1000) * 10) / 10,
    roadDurationSeconds: result.durationSeconds,
    roadDurationMinutes: Math.round(result.durationSeconds / 60),
    geometry: result.geometry,
    geometryStatus: result.geometryStatus,
    geometryPath: null,
    metricSource: 'directions',
    provider: 'openrouteservice',
    profile: 'driving-car',
    generatedAt: result.generatedAt,
    attribution: result.attribution,
  };
}

export function getImmediateOutletRoute(
  originMunicipalityId: string,
  outlet: Outlet,
  straightLineDistanceKm: number
): RouteResolution {
  const staticRoute = getOutletRouteEstimate(
    originMunicipalityId,
    outlet.id,
    straightLineDistanceKm
  );
  if (staticRoute.source === 'road' || !outlet.isLocalBagsakan) {
    return {
      route: staticRoute,
      state: staticRoute.source === 'road' ? 'static' : 'fallback',
    };
  }

  const key = runtimeRouteCacheKey(originMunicipalityId, outlet.lat, outlet.lng);
  const cached = getCachedRuntimeRoute(key);
  if (cached) return { route: cached, state: 'cached' };
  return { route: staticRoute, state: 'fallback' };
}

export async function resolveOutletRoute(
  originMunicipalityId: string,
  outlet: Outlet,
  straightLineDistanceKm: number,
  options: {
    endpoint?: string | null;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
  } = {}
): Promise<RouteResolution> {
  const immediate = getImmediateOutletRoute(
    originMunicipalityId,
    outlet,
    straightLineDistanceKm
  );
  if (
    immediate.state === 'static' ||
    immediate.state === 'cached' ||
    !outlet.isLocalBagsakan
  ) {
    return immediate;
  }

  const result = await requestRuntimeRoute(
    {
      originMunicipalityId,
      destination: { lat: outlet.lat, lng: outlet.lng },
    },
    {
      endpoint:
        options.endpoint === undefined
          ? configuredRuntimeRouteEndpoint()
          : options.endpoint,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
    }
  );

  if (!result.ok) {
    return {
      route: immediate.route,
      state: 'fallback',
      failureReason: result.reason,
    };
  }

  const route = runtimeEstimate(straightLineDistanceKm, result);
  const key = runtimeRouteCacheKey(originMunicipalityId, outlet.lat, outlet.lng);
  setCachedRuntimeRoute(key, route);
  return { route, state: 'runtime' };
}
