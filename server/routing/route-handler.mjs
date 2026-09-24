import routingPoints from '../../scripts/routing-points.json' with { type: 'json' };
import { createRoutingClient } from '../../scripts/lib/routing-provider.mjs';
import { validateRouteGeometry } from '../../scripts/lib/routing-artifact.mjs';

const PROFILE = 'driving-car';
const ATTRIBUTION =
  'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors';
const BOUNDS = { west: 121.05, east: 121.53, south: 13.98, north: 14.37 };
const origins = new Map(routingPoints.origins.map((point) => [point.id, point]));

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateRuntimeRouteRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'invalid_request' };
  }
  const keys = Object.keys(value);
  if (keys.some((key) => !['originMunicipalityId', 'destination'].includes(key))) {
    return { ok: false, error: 'invalid_request' };
  }
  const origin = origins.get(value.originMunicipalityId);
  const destination = value.destination;
  if (!origin || !destination || typeof destination !== 'object' || Array.isArray(destination)) {
    return { ok: false, error: 'invalid_request' };
  }
  if (Object.keys(destination).some((key) => !['lat', 'lng'].includes(key))) {
    return { ok: false, error: 'invalid_request' };
  }
  const { lat, lng } = destination;
  if (
    !finite(lat) ||
    !finite(lng) ||
    lat < BOUNDS.south ||
    lat > BOUNDS.north ||
    lng < BOUNDS.west ||
    lng > BOUNDS.east
  ) {
    return { ok: false, error: 'destination_out_of_bounds' };
  }
  return { ok: true, origin, destination: { lat, lng } };
}

function sanitizeProviderError(error) {
  const status = Number(error?.status);
  if (status === 429) return { status: 429, error: 'rate_limited' };
  if (status === 401 || status === 403) return { status: 502, error: 'routing_provider_unavailable' };
  return { status: 502, error: 'routing_provider_unavailable' };
}

export async function routeEstimateFromPayload(
  payload,
  {
    apiKey = process.env.ORS_API_KEY,
    baseUrl = process.env.ORS_BASE_URL || 'https://api.heigit.org/openrouteservice/v2',
    fetchImpl = fetch,
  } = {}
) {
  const validated = validateRuntimeRouteRequest(payload);
  if (!validated.ok) return { status: 400, body: { error: validated.error } };
  if (!apiKey) return { status: 503, body: { error: 'routing_not_configured' } };

  const request = createRoutingClient({
    baseUrl,
    apiKey,
    fetchImpl,
    timeoutMs: 12_000,
    maxAttempts: 3,
  });

  try {
    const response = await request(`/directions/${PROFILE}/geojson`, {
      coordinates: [
        [validated.origin.lng, validated.origin.lat],
        [validated.destination.lng, validated.destination.lat],
      ],
      instructions: false,
    });
    const feature = response.features?.[0];
    const geometry = feature?.geometry;
    const summary = feature?.properties?.summary;
    const distanceMeters = summary?.distance;
    const durationSeconds = summary?.duration;
    if (
      !finite(distanceMeters) ||
      distanceMeters < 0 ||
      !finite(durationSeconds) ||
      durationSeconds < 0
    ) {
      return { status: 502, body: { error: 'invalid_routing_response' } };
    }

    const geometryReady = validateRouteGeometry(geometry);
    if (!geometryReady && (distanceMeters !== 0 || durationSeconds !== 0)) {
      return { status: 502, body: { error: 'invalid_routing_response' } };
    }

    return {
      status: 200,
      body: {
        schemaVersion: 1,
        provider: 'openrouteservice',
        profile: PROFILE,
        distanceMeters,
        durationSeconds,
        geometryStatus: geometryReady ? 'ready' : 'unavailable',
        ...(geometryReady ? { geometry } : {}),
        generatedAt: new Date().toISOString(),
        attribution: ATTRIBUTION,
      },
    };
  } catch (error) {
    const safe = sanitizeProviderError(error);
    return { status: safe.status, body: { error: safe.error } };
  }
}

export const runtimeRoutingPolicy = { bounds: BOUNDS, originIds: [...origins.keys()] };
