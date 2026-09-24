import { describe, expect, it, vi } from 'vitest';
import {
  routeEstimateFromPayload,
  runtimeRoutingPolicy,
  validateRuntimeRouteRequest,
} from './route-handler.mjs';

const request = {
  originMunicipalityId: 'los-banos',
  destination: { lat: 14.275, lng: 121.459 },
};

const orsResponse = {
  features: [{
    geometry: {
      type: 'LineString',
      coordinates: [[121.241, 14.17], [121.35, 14.22], [121.459, 14.275]],
    },
    properties: { summary: { distance: 30500, duration: 2280 } },
  }],
};

describe('runtime route server handler', () => {
  it('allows only canonical origins and Laguna destinations', () => {
    expect(validateRuntimeRouteRequest(request).ok).toBe(true);
    expect(validateRuntimeRouteRequest({
      ...request,
      originMunicipalityId: 'arbitrary-origin',
    })).toEqual({ ok: false, error: 'invalid_request' });
    expect(validateRuntimeRouteRequest({
      ...request,
      destination: { lat: 15, lng: 121.459 },
    })).toEqual({ ok: false, error: 'destination_out_of_bounds' });
    expect(validateRuntimeRouteRequest({
      ...request,
      destination: { lat: 14.275, lng: Infinity },
    })).toEqual({ ok: false, error: 'destination_out_of_bounds' });
  });

  it('rejects proxy-like extra request fields', () => {
    expect(validateRuntimeRouteRequest({
      ...request,
      providerBase: 'https://evil.example',
    })).toEqual({ ok: false, error: 'invalid_request' });
    expect(validateRuntimeRouteRequest({
      ...request,
      destination: { ...request.destination, profile: 'cycling' },
    })).toEqual({ ok: false, error: 'invalid_request' });
  });

  it('fails closed when the server secret is missing', async () => {
    const result = await routeEstimateFromPayload(request, { apiKey: '' });
    expect(result).toEqual({
      status: 503,
      body: { error: 'routing_not_configured' },
    });
  });

  it('returns sanitized road evidence from a valid ORS response', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(init?.headers).toMatchObject({ Authorization: 'private-test-key' });
      return new Response(JSON.stringify(orsResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const result = await routeEstimateFromPayload(request, {
      apiKey: 'private-test-key',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      schemaVersion: 1,
      provider: 'openrouteservice',
      profile: 'driving-car',
      distanceMeters: 30500,
      durationSeconds: 2280,
      geometryStatus: 'ready',
    });
    expect(JSON.stringify(result.body)).not.toContain('private-test-key');
  });

  it('does not invent a polyline for a valid zero-distance response', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({
        features: [{
          geometry: null,
          properties: { summary: { distance: 0, duration: 0 } },
        }],
      }), { status: 200 })
    );
    const result = await routeEstimateFromPayload(request, {
      apiKey: 'private-test-key',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      distanceMeters: 0,
      durationSeconds: 0,
      geometryStatus: 'unavailable',
    });
    expect(result.body).not.toHaveProperty('geometry');
  });

  it('rejects malformed provider evidence', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({
        features: [{
          geometry: { type: 'LineString', coordinates: [[121.2, 14.1]] },
          properties: { summary: { distance: 10, duration: 3 } },
        }],
      }), { status: 200 })
    );
    const result = await routeEstimateFromPayload(request, {
      apiKey: 'private-test-key',
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result).toEqual({
      status: 502,
      body: { error: 'invalid_routing_response' },
    });
  });

  it('keeps the server policy aligned to ten known origins', () => {
    expect(runtimeRoutingPolicy.originIds).toHaveLength(10);
    expect(runtimeRoutingPolicy.bounds).toEqual({
      west: 121.05, east: 121.53, south: 13.98, north: 14.37,
    });
  });
});
