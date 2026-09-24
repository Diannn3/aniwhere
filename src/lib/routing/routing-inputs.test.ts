import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAGUNA_MUNICIPALITIES } from '../../content/municipalities';
import { DEMO_PLACES } from '../../content/demo-places';

interface RoutingPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface RoutingPointsManifest {
  origins: RoutingPoint[];
  outlets: RoutingPoint[];
}

const manifest = JSON.parse(
  readFileSync(new URL('../../../scripts/routing-points.json', import.meta.url), 'utf8')
) as RoutingPointsManifest;
const artifact = JSON.parse(
  readFileSync(new URL('../../generated/routing-matrix.json', import.meta.url), 'utf8')
) as {
  schemaVersion: number;
  provider: string;
  providerBase: string;
  profile: string;
  inputFingerprint: string;
};

function compact(points: RoutingPoint[]) {
  return points
    .map(({ id, lat, lng }) => ({ id, lat, lng }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

describe('routing generation inputs', () => {
  it('covers every canonical municipality exactly', () => {
    expect(compact(manifest.origins)).toEqual(compact(LAGUNA_MUNICIPALITIES));
  });

  it('covers every current demo outlet exactly', () => {
    expect(compact(manifest.outlets)).toEqual(compact(DEMO_PLACES));
  });

  it('keeps the checked-in artifact fingerprint aligned with current routing inputs', () => {
    const payload = {
      schemaVersion: artifact.schemaVersion,
      provider: artifact.provider,
      providerBase: artifact.providerBase,
      profile: artifact.profile,
      origins: compact(manifest.origins),
      outlets: compact(manifest.outlets),
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    expect(artifact.inputFingerprint).toBe(fingerprint);
  });

  it('contains no duplicate routing IDs', () => {
    for (const points of [manifest.origins, manifest.outlets]) {
      const ids = points.map((point) => point.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('keeps finite coordinates in geographic bounds', () => {
    for (const point of [...manifest.origins, ...manifest.outlets]) {
      expect(Number.isFinite(point.lat)).toBe(true);
      expect(Number.isFinite(point.lng)).toBe(true);
      expect(point.lat).toBeGreaterThanOrEqual(-90);
      expect(point.lat).toBeLessThanOrEqual(90);
      expect(point.lng).toBeGreaterThanOrEqual(-180);
      expect(point.lng).toBeLessThanOrEqual(180);
    }
  });
});
