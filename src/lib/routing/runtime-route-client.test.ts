import { describe, expect, it, vi } from 'vitest';
import {
  requestRuntimeRoute,
  validateRuntimeRouteResponse,
} from './runtime-route-client';

const valid = {
  schemaVersion: 1,
  provider: 'openrouteservice',
  profile: 'driving-car',
  distanceMeters: 12500,
  durationSeconds: 900,
  geometryStatus: 'ready',
  geometry: {
    type: 'LineString',
    coordinates: [[121.241, 14.17], [121.3, 14.2], [121.459, 14.275]],
  },
  generatedAt: '2026-09-25T00:00:00Z',
  attribution: 'Routing © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
};

describe('runtime route client', () => {
  it('accepts a valid Directions-style runtime response', () => {
    const parsed = validateRuntimeRouteResponse(valid);
    expect(parsed?.ok).toBe(true);
    expect(parsed?.geometry?.coordinates).toHaveLength(3);
  });

  it('rejects malformed or contradictory geometry evidence', () => {
    expect(validateRuntimeRouteResponse({ ...valid, distanceMeters: -1 })).toBeNull();
    expect(validateRuntimeRouteResponse({ ...valid, geometry: undefined })).toBeNull();
    expect(
      validateRuntimeRouteResponse({ ...valid, geometryStatus: 'unavailable' })
    ).toBeNull();
  });

  it('fails closed when no endpoint is configured', async () => {
    await expect(
      requestRuntimeRoute(
        { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
        { endpoint: null }
      )
    ).resolves.toEqual({ ok: false, reason: 'not_configured' });
  });

  it('posts coordinates without exposing routing credentials', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(init?.method).toBe('POST');
      expect(init?.headers).not.toHaveProperty('Authorization');
      expect(String(init?.body)).toContain('"originMunicipalityId":"los-banos"');
      return new Response(JSON.stringify(valid), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const result = await requestRuntimeRoute(
      { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
      { endpoint: '/api/route-estimate', fetchImpl: fetchImpl as typeof fetch }
    );
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('maps provider and rate-limit failures to safe client states', async () => {
    for (const [status, reason] of [[429, 'rate_limited'], [502, 'provider_unavailable'], [503, 'provider_unavailable']] as const) {
      const fetchImpl = vi.fn(async () => new Response('{}', { status }));
      const result = await requestRuntimeRoute(
        { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
        { endpoint: '/api/route-estimate', fetchImpl: fetchImpl as typeof fetch }
      );
      expect(result).toEqual({ ok: false, reason });
    }
  });

  it('uses not-configured only for the endpoint's explicit configuration error', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'routing_not_configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(
      requestRuntimeRoute(
        { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
        { endpoint: '/api/route-estimate', fetchImpl: fetchImpl as typeof fetch }
      )
    ).resolves.toEqual({ ok: false, reason: 'not_configured' });
  });

  it('treats malformed successful JSON as an invalid response, not offline', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response('{not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(
      requestRuntimeRoute(
        { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
        { endpoint: '/api/route-estimate', fetchImpl: fetchImpl as typeof fetch }
      )
    ).resolves.toEqual({ ok: false, reason: 'invalid_response' });
  });

  it('recognizes abort-shaped errors without relying on DOMException', async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error('request aborted');
      error.name = 'AbortError';
      throw error;
    });
    await expect(
      requestRuntimeRoute(
        { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
        { endpoint: '/api/route-estimate', fetchImpl: fetchImpl as typeof fetch }
      )
    ).resolves.toEqual({ ok: false, reason: 'aborted' });
  });

  it('treats network errors as offline fallback', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('network failed');
    });
    await expect(
      requestRuntimeRoute(
        { originMunicipalityId: 'los-banos', destination: { lat: 14.275, lng: 121.459 } },
        { endpoint: '/api/route-estimate', fetchImpl: fetchImpl as typeof fetch }
      )
    ).resolves.toEqual({ ok: false, reason: 'offline' });
  });
});
