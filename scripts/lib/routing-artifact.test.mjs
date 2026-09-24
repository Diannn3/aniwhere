import { describe, expect, it } from 'vitest';
import {
  assertMatrixResponse,
  assertRoutingPoints,
  createInputFingerprint,
  validateRouteGeometry,
  validateRoutingArtifact,
} from './routing-artifact.mjs';

const points = {
  origins: [{ id: 'los-banos', name: 'Los Baños', lat: 14.17, lng: 121.241 }],
  outlets: [{ id: 'demo-market', name: 'Market', lat: 14.18, lng: 121.243 }],
};

function artifact() {
  return {
    schemaVersion: 2,
    generatedAt: '2026-09-25T00:00:00Z',
    provider: 'openrouteservice',
    providerBase: 'https://api.heigit.org/openrouteservice/v2',
    profile: 'driving-car',
    generationMode: 'metrics',
    status: 'ready',
    attribution: 'test',
    inputFingerprint: 'a'.repeat(64),
    origins: {
      'los-banos': { name: 'Los Baños', lat: 14.17, lng: 121.241 },
    },
    outlets: {
      'demo-market': { name: 'Market', lat: 14.18, lng: 121.243 },
    },
    cells: {
      'los-banos': {
        'demo-market': {
          status: 'routed',
          distanceMeters: 1500,
          durationSeconds: 300,
          metricSource: 'matrix',
          geometryStatus: 'not_requested',
        },
      },
    },
  };
}

describe('routing artifact validation', () => {
  it('accepts canonical route-safe IDs and coordinates', () => {
    expect(() => assertRoutingPoints(points.origins, points.outlets)).not.toThrow();
  });

  it('rejects unsafe IDs before they can become generated file paths', () => {
    expect(() =>
      assertRoutingPoints(
        [{ id: '../escape', name: 'Bad', lat: 14, lng: 121 }],
        points.outlets
      )
    ).toThrow('not safe');
  });

  it('fingerprints routing points independently of input ordering', () => {
    const args = {
      provider: 'openrouteservice',
      providerBase: 'https://api.heigit.org/openrouteservice/v2',
      profile: 'driving-car',
      origins: [
        { id: 'b', lat: 2, lng: 2 },
        { id: 'a', lat: 1, lng: 1 },
      ],
      outlets: [
        { id: 'd', lat: 4, lng: 4 },
        { id: 'c', lat: 3, lng: 3 },
      ],
    };
    const reversed = {
      ...args,
      origins: [...args.origins].reverse(),
      outlets: [...args.outlets].reverse(),
    };

    expect(createInputFingerprint(args)).toBe(createInputFingerprint(reversed));
    expect(createInputFingerprint(args)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('accepts routed and explicitly unavailable matrix cells', () => {
    expect(() =>
      assertMatrixResponse(
        { distances: [[1200, null]], durations: [[300, null]] },
        1,
        2
      )
    ).not.toThrow();
  });

  it('rejects inconsistent matrix cells and dimensions', () => {
    expect(() =>
      assertMatrixResponse({ distances: [[1200]], durations: [[null]] }, 1, 1)
    ).toThrow('inconsistent metrics');
    expect(() =>
      assertMatrixResponse({ distances: [[]], durations: [[]] }, 1, 1)
    ).toThrow('destination count');
  });

  it('accepts only finite LineString coordinates', () => {
    expect(
      validateRouteGeometry({
        type: 'LineString',
        coordinates: [
          [121.241, 14.17],
          [121.243, 14.18],
        ],
      })
    ).toBe(true);
    expect(validateRouteGeometry({ type: 'Point', coordinates: [121, 14] })).toBe(false);
    expect(
      validateRouteGeometry({
        type: 'LineString',
        coordinates: [[999, 14], [121, 14]],
      })
    ).toBe(false);
  });

  it('requires complete expected route coverage', () => {
    expect(() =>
      validateRoutingArtifact(artifact(), ['los-banos'], ['demo-market'])
    ).not.toThrow();

    const missing = artifact();
    delete missing.cells['los-banos']['demo-market'];
    expect(() =>
      validateRoutingArtifact(missing, ['los-banos'], ['demo-market'])
    ).toThrow('incomplete outlet coverage');
  });

  it('rejects a ready geometry path without Directions metric provenance', () => {
    const inconsistent = artifact();
    const cell = inconsistent.cells['los-banos']['demo-market'];
    cell.geometryStatus = 'ready';
    cell.geometryPath =
      '/generated/routes/20260925-abcdef123456/los-banos--demo-market.geojson';
    expect(() =>
      validateRoutingArtifact(inconsistent, ['los-banos'], ['demo-market'])
    ).toThrow('unexpected geometry state');
  });

  it('rejects not-generated artifacts that contain generated route state', () => {
    const placeholder = {
      ...artifact(),
      status: 'not_generated',
      generationMode: 'not_generated',
      generatedAt: null,
      geometryRunId: null,
      origins: {},
      outlets: {},
      cells: {
        'los-banos': {
          'demo-market': {
            status: 'routed',
            distanceMeters: 1,
            durationSeconds: 1,
            metricSource: 'matrix',
            geometryStatus: 'not_requested',
          },
        },
      },
    };

    expect(() =>
      validateRoutingArtifact(placeholder, ['los-banos'], ['demo-market'])
    ).toThrow('contains generated route state');
  });

  it('rejects geometry state that disagrees with generation mode', () => {
    const inconsistent = artifact();
    inconsistent.cells['los-banos']['demo-market'].geometryStatus = 'ready';
    inconsistent.cells['los-banos']['demo-market'].metricSource = 'directions';
    inconsistent.cells['los-banos']['demo-market'].geometryPath =
      '/generated/routes/run/los-banos--demo-market.geojson';

    expect(() =>
      validateRoutingArtifact(inconsistent, ['los-banos'], ['demo-market'])
    ).toThrow('unexpected geometry state');
  });

  it('requires partial status when requested road geometry is unavailable', () => {
    const inconsistent = artifact();
    inconsistent.generationMode = 'metrics_and_geometry';
    inconsistent.geometryRunId = 'run';
    inconsistent.cells['los-banos']['demo-market'].geometryStatus = 'unavailable';

    expect(() =>
      validateRoutingArtifact(inconsistent, ['los-banos'], ['demo-market'])
    ).toThrow('Ready geometry artifact contains unavailable geometry');
  });

  it('allows a not-generated placeholder without fabricated cells', () => {
    const placeholder = {
      ...artifact(),
      status: 'not_generated',
      generationMode: 'not_generated',
      generatedAt: null,
      geometryRunId: null,
      origins: {},
      outlets: {},
      cells: {},
    };
    expect(validateRoutingArtifact(placeholder, ['los-banos'], ['demo-market'])).toBe(placeholder);
  });
});
