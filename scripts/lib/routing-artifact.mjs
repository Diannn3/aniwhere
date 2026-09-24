import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function assertRoutingPoints(origins, outlets) {
  for (const [label, points] of [['origin', origins], ['outlet', outlets]]) {
    if (!Array.isArray(points) || points.length === 0) {
      throw new Error(`Routing ${label} points are missing.`);
    }
    const seen = new Set();
    for (const point of points) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(point?.id || '')) {
        throw new Error(`Routing ${label} ID is not safe: ${point?.id ?? 'missing'}`);
      }
      if (seen.has(point.id)) throw new Error(`Duplicate routing ${label} ID: ${point.id}`);
      seen.add(point.id);
      if (
        typeof point.name !== 'string' ||
        !Number.isFinite(point.lat) ||
        point.lat < -90 ||
        point.lat > 90 ||
        !Number.isFinite(point.lng) ||
        point.lng < -180 ||
        point.lng > 180
      ) {
        throw new Error(`Routing ${label} point is invalid: ${point.id}`);
      }
    }
  }
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

export function extractEngineMetadata(payload) {
  const engine = payload?.metadata?.engine;
  if (!engine || typeof engine !== 'object') return undefined;

  const candidate = {
    version: typeof engine.version === 'string' ? engine.version : undefined,
    buildDate: typeof engine.build_date === 'string' ? engine.build_date : undefined,
    graphDate: typeof engine.graph_date === 'string' ? engine.graph_date : undefined,
    osmDate: typeof engine.osm_date === 'string' ? engine.osm_date : undefined,
  };

  return Object.values(candidate).some(Boolean) ? candidate : undefined;
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
  if (artifact.provider !== 'openrouteservice') {
    throw new Error('Routing artifact has an unsupported provider.');
  }
  if (typeof artifact.providerBase !== 'string' || !/^https?:\/\//.test(artifact.providerBase)) {
    throw new Error('Routing artifact has an invalid provider base URL.');
  }
  if (artifact.profile !== 'driving-car') {
    throw new Error('Routing artifact has an unsupported routing profile.');
  }
  if (!['ready', 'partial', 'not_generated'].includes(artifact.status)) {
    throw new Error('Routing artifact has an invalid status.');
  }
  if (!['metrics', 'metrics_and_geometry', 'not_generated'].includes(artifact.generationMode)) {
    throw new Error('Routing artifact has an invalid generation mode.');
  }
  if (typeof artifact.attribution !== 'string' || artifact.attribution.trim().length === 0) {
    throw new Error('Routing artifact is missing routing attribution.');
  }
  if (typeof artifact.inputFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(artifact.inputFingerprint)) {
    throw new Error('Routing artifact is missing a SHA-256 input fingerprint.');
  }

  const generated = artifact.status !== 'not_generated';
  if (!generated) {
    if (
      artifact.generationMode !== 'not_generated' ||
      artifact.generatedAt !== null ||
      artifact.geometryRunId != null ||
      Object.keys(artifact.origins || {}).length > 0 ||
      Object.keys(artifact.outlets || {}).length > 0 ||
      Object.keys(artifact.cells || {}).length > 0
    ) {
      throw new Error('Not-generated routing artifact contains generated route state.');
    }
    return artifact;
  }

  if (!Number.isFinite(Date.parse(artifact.generatedAt))) {
    throw new Error('Generated routing artifact has an invalid generatedAt timestamp.');
  }
  if (artifact.generationMode === 'not_generated') {
    throw new Error('Generated routing artifact cannot use not_generated generation mode.');
  }
  if (artifact.status === 'partial' && artifact.generationMode !== 'metrics_and_geometry') {
    throw new Error('Partial routing artifacts are reserved for incomplete geometry generation.');
  }
  if (artifact.generationMode === 'metrics') {
    if (artifact.geometryRunId != null) {
      throw new Error('Metrics-only routing artifact must not expose a geometry run ID.');
    }
  } else if (
    typeof artifact.geometryRunId !== 'string' ||
    !/^[a-z0-9-]+$/.test(artifact.geometryRunId)
  ) {
    throw new Error('Geometry-enabled routing artifact has an invalid geometry run ID.');
  }

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
        if (!['matrix', 'directions'].includes(cell.metricSource)) {
          throw new Error(`Routed cell ${originId} -> ${outletId} has no metric provenance.`);
        }
        if (!['not_requested', 'ready', 'unavailable'].includes(cell.geometryStatus)) {
          throw new Error(`Routed cell ${originId} -> ${outletId} has invalid geometry state.`);
        }
        if (artifact.generationMode === 'metrics' && cell.geometryStatus !== 'not_requested') {
          throw new Error(`Metrics-only cell ${originId} -> ${outletId} has unexpected geometry state.`);
        }
        if (
          artifact.generationMode === 'metrics_and_geometry' &&
          cell.geometryStatus === 'not_requested'
        ) {
          throw new Error(`Geometry-enabled cell ${originId} -> ${outletId} was not evaluated for geometry.`);
        }
        if (cell.geometryStatus === 'ready') {
          if (
            artifact.generationMode !== 'metrics_and_geometry' ||
            cell.metricSource !== 'directions' ||
            typeof cell.geometryPath !== 'string' ||
            !/^\/generated\/routes\/[a-z0-9-]+\/[a-z0-9-]+--[a-z0-9-]+\.geojson$/.test(cell.geometryPath)
          ) {
            throw new Error(`Routed cell ${originId} -> ${outletId} has inconsistent geometry provenance.`);
          }
        } else if (cell.geometryPath) {
          throw new Error(`Routed cell ${originId} -> ${outletId} exposes an unvalidated geometry path.`);
        }
        if (artifact.status === 'ready' && artifact.generationMode === 'metrics_and_geometry' && cell.geometryStatus === 'unavailable') {
          throw new Error(`Ready geometry artifact contains unavailable geometry for ${originId} -> ${outletId}.`);
        }
      } else if (cell?.status === 'unavailable') {
        if (cell.distanceMeters !== undefined || cell.durationSeconds !== undefined || cell.geometryPath) {
          throw new Error(`Unavailable cell ${originId} -> ${outletId} contains routed evidence.`);
        }
        const expectedGeometryStatus =
          artifact.generationMode === 'metrics_and_geometry' ? 'unavailable' : 'not_requested';
        if (cell.geometryStatus !== expectedGeometryStatus) {
          throw new Error(`Unavailable cell ${originId} -> ${outletId} has inconsistent geometry state.`);
        }
      } else {
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
