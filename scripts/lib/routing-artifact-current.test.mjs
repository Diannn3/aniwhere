import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { validateRoutingArtifact } from './routing-artifact.mjs';

const manifest = JSON.parse(await readFile(new URL('../routing-points.json', import.meta.url), 'utf8'));
const artifact = JSON.parse(
  await readFile(new URL('../../src/generated/routing-matrix.json', import.meta.url), 'utf8')
);

describe('checked-in routing artifact', () => {
  it('matches the complete current routing-point contract', () => {
    const originIds = manifest.origins.map((point) => point.id);
    const outletIds = manifest.outlets.map((point) => point.id);

    expect(() => validateRoutingArtifact(artifact, originIds, outletIds)).not.toThrow();
  });

  it('keeps generated coverage complete whenever road data is bundled', () => {
    if (artifact.status === 'not_generated') {
      expect(artifact.origins).toEqual({});
      expect(artifact.outlets).toEqual({});
      expect(artifact.cells).toEqual({});
      return;
    }

    expect(Object.keys(artifact.origins)).toHaveLength(manifest.origins.length);
    expect(Object.keys(artifact.outlets)).toHaveLength(manifest.outlets.length);
    expect(
      Object.values(artifact.cells).reduce((count, row) => count + Object.keys(row).length, 0)
    ).toBe(manifest.origins.length * manifest.outlets.length);
  });
});
