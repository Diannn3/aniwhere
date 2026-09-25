import { isRouteGeometry } from './route-geometry';
import type { RouteGeometry } from './routing-matrix';

export type RuntimeRouteFailureReason =
  | 'not_configured'
  | 'offline'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'invalid_response'
  | 'aborted';

export interface RuntimeRouteSuccess {
  ok: true;
  distanceMeters: number;
  durationSeconds: number;
  geometryStatus: 'ready' | 'unavailable';
  geometry?: RouteGeometry;
  generatedAt: string;
  attribution: string;
}

export interface RuntimeRouteFailure {
  ok: false;
  reason: RuntimeRouteFailureReason;
}

export type RuntimeRouteResult = RuntimeRouteSuccess | RuntimeRouteFailure;

interface RequestArgs {
  originMunicipalityId: string;
  destination: { lat: number; lng: number };
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function validateRuntimeRouteResponse(value: unknown): RuntimeRouteSuccess | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    item.schemaVersion !== 1 ||
    item.provider !== 'openrouteservice' ||
    item.profile !== 'driving-car' ||
    !finiteNonNegative(item.distanceMeters) ||
    !finiteNonNegative(item.durationSeconds) ||
    (item.geometryStatus !== 'ready' && item.geometryStatus !== 'unavailable') ||
    typeof item.generatedAt !== 'string' ||
    Number.isNaN(Date.parse(item.generatedAt)) ||
    typeof item.attribution !== 'string'
  ) {
    return null;
  }
  const geometry = item.geometry;
  if (item.geometryStatus === 'ready' && !isRouteGeometry(geometry)) return null;
  if (item.geometryStatus === 'unavailable' && geometry !== undefined) return null;
  return {
    ok: true,
    distanceMeters: item.distanceMeters,
    durationSeconds: item.durationSeconds,
    geometryStatus: item.geometryStatus,
    ...(item.geometryStatus === 'ready' ? { geometry: geometry as RouteGeometry } : {}),
    generatedAt: item.generatedAt,
    attribution: item.attribution,
  };
}

function reasonForStatus(
  status: number,
  errorCode?: string
): RuntimeRouteFailureReason {
  if (status === 429) return 'rate_limited';
  if (status === 503 && errorCode === 'routing_not_configured') return 'not_configured';
  return 'provider_unavailable';
}

export async function requestRuntimeRoute(
  args: RequestArgs,
  options: {
    endpoint: string | null;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
  }
): Promise<RuntimeRouteResult> {
  if (!options.endpoint) return { ok: false, reason: 'not_configured' };
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(options.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(args),
      signal: options.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      let errorCode: string | undefined;
      try {
        const errorBody: unknown = await response.json();
        if (
          errorBody &&
          typeof errorBody === 'object' &&
          'error' in errorBody &&
          typeof errorBody.error === 'string'
        ) {
          errorCode = errorBody.error;
        }
      } catch {
        // Status remains authoritative when the error body is absent or malformed.
      }
      return {
        ok: false,
        reason: reasonForStatus(response.status, errorCode),
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, reason: 'invalid_response' };
    }

    const parsed = validateRuntimeRouteResponse(body);
    return parsed ?? { ok: false, reason: 'invalid_response' };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      return { ok: false, reason: 'aborted' };
    }
    return { ok: false, reason: 'offline' };
  }
}

export function configuredRuntimeRouteEndpoint(): string | null {
  const configured = import.meta.env.PUBLIC_RUNTIME_ROUTING_ENDPOINT?.trim();
  if (configured) return configured;
  return import.meta.env.DEV ? '/api/route-estimate' : null;
}
