import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function createInputFingerprint({ provider, providerBase, profile, origins, outlets }) {
  const compact = (points) =>
    points
      .map(({ id, lat, lng }) => ({ id, lat, lng }))
      .sort((a, b) => a.id.localeCompare(b.id));

  return createHash('sha256')
    .update(
      JSON.stringify({
        schemaVersion: 2,
        provider,
        providerBase,
        profile,
        origins: compact(origins),
        outlets: compact(outlets),
      })
    )
    .digest('hex');
}

export function assertMatrixResponse(matrix, originCount, outletCount) {
  if (!Array.isArray(matrix?.distances) || !Array.isArray(matrix?.durations)) {
    throw new Error('Routing matrix response is missing distances or durations.');
  }
  if (matrix.distances.length !== originCount || matrix.durations.length !== originCount) {
    throw new Error('Routing matrix response has an unexpected origin count.');
  }

  for (let oi = 0; oi < originCount; oi += 1) {
    const distances = matrix.distances[oi];
    const durations = matrix.durations[oi];
    if (
      !Array.isArray(distances) ||
      !Array.isArray(durations) ||
      distances.length !== outletCount ||
      durations.length !== outletCount
    ) {
      throw new Error(`Routing matrix row ${oi} has an unexpected destination count.`);
    }

    for (let di = 0; di < outletCount; di += 1) {
      const distance = distances[di];
      const duration = durations[di];
      const routed = finiteNonNegative(distance) && finiteNonNegative(duration);
      const unavailable = distance === null && duration === null;
      if (!routed && !unavailable) {
        throw new Error(`Routing matrix cell ${oi},${di} has inconsistent metrics.`);
      }
    }
  }
}

export function validateRouteGeometry(geometry) {
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return false;
  if (geometry.coordinates.length < 2) return false;

  return geometry.coordinates.every(
    (coordinate) =>
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      typeof coordinate[0] === 'number' &&
      Number.isFinite(coordinate[0]) &&
      coordinate[0] >= -180 &&
      coordinate[0] <= 180 &&
      typeof coordinate[1] === 'number' &&
      Number.isFinite(coordinate[1]) &&
      coordinate[1] >= -90 &&
      coordinate[1] <= 90
  );
}

export function validateRoutingArtifact(artifact, expectedOrigins, expectedOutlets) {
  if (artifact?.schemaVersion !== 2) throw new Error('Routing artifact schema must be version 2.');
  if (!['ready', 'partial', 'not_generated'].includes(artifact.status)) {
    throw new Error('Routing artifact has an invalid status.');
  }
  if (typeof artifact.inputFingerprint !== 'string' || artifact.inputFingerprint.length !== 64) {
    throw new Error('Routing artifact is missing a SHA-256 input fingerprint.');
  }

  if (artifact.status === 'not_generated') return artifact;

  const originIds = Object.keys(artifact.origins || {}).sort();
  const outletIds = Object.keys(artifact.outlets || {}).sort();
  if (JSON.stringify(originIds) !== JSON.stringify([...expectedOrigins].sort())) {
    throw new Error('Routing artifact origin coverage does not match the generation input.');
  }
  if (JSON.stringify(outletIds) !== JSON.stringify([...expectedOutlets].sort())) {
    throw new Error('Routing artifact outlet coverage does not match the generation input.');
  }

  for (const originId of expectedOrigins) {
    const row = artifact.cells?.[originId];
    if (!row) throw new Error(`Routing artifact is missing row ${originId}.`);
    if (JSON.stringify(Object.keys(row).sort()) !== JSON.stringify([...expectedOutlets].sort())) {
      throw new Error(`Routing artifact row ${originId} has incomplete outlet coverage.`);
    }
    for (const outletId of expectedOutlets) {
      const cell = row[outletId];
      if (cell?.status === 'routed') {
        if (!finiteNonNegative(cell.distanceMeters) || !finiteNonNegative(cell.durationSeconds)) {
          throw new Error(`Routed cell ${originId} -> ${outletId} has invalid metrics.`);
        }
      } else if (cell?.status !== 'unavailable') {
        throw new Error(`Cell ${originId} -> ${outletId} has an invalid status.`);
      }
    }
  }

  return artifact;
}

export async function writeJsonAtomic(outputPath, value, validate) {
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  const serialized = JSON.stringify(value, null, 2) + '\n';

  try {
    await writeFile(temporaryPath, serialized, 'utf8');
    const parsed = JSON.parse(await readFile(temporaryPath, 'utf8'));
    validate(parsed);
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
