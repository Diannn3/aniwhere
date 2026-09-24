import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRoutingClient } from './lib/routing-provider.mjs';

const API_KEY = process.env.ORS_API_KEY;
if (!API_KEY) {
  console.error('Missing ORS_API_KEY. Refusing to generate a fake routing matrix.');
  process.exit(1);
}

const BASE = process.env.ORS_BASE_URL || 'https://api.heigit.org/openrouteservice/v2';
const PROFILE = 'driving-car';
const WITH_GEOMETRY = process.argv.includes('--geometry');

const pointsPath = resolve('scripts/routing-points.json');
const routingPoints = JSON.parse(await readFile(pointsPath, 'utf8'));

const origins = routingPoints.origins.map(({ id, name, lat, lng }) => [id, name, lat, lng]);
const outlets = routingPoints.outlets.map(({ id, name, lat, lng }) => [id, name, lat, lng]);

const locations = [...origins, ...outlets].map(([, , lat, lng]) => [lng, lat]);
const sourceIndexes = origins.map((_, index) => index);
const destinationIndexes = outlets.map((_, index) => origins.length + index);

const fingerprintPayload = {
  schemaVersion: 2,
  provider: 'openrouteservice',
  providerBase: BASE,
  profile: PROFILE,
  origins: origins
    .map(([id, , lat, lng]) => ({ id, lat, lng }))
    .sort((a, b) => a.id.localeCompare(b.id)),
  outlets: outlets
    .map(([id, , lat, lng]) => ({ id, lat, lng }))
    .sort((a, b) => a.id.localeCompare(b.id)),
};
const inputFingerprint = createHash('sha256')
  .update(JSON.stringify(fingerprintPayload))
  .digest('hex');

const ors = createRoutingClient({ baseUrl: BASE, apiKey: API_KEY });

const matrix = await ors(`/matrix/${PROFILE}`, {
  locations,
  sources: sourceIndexes,
  destinations: destinationIndexes,
  metrics: ['distance', 'duration'],
  units: 'm',
});

const generatedAt = new Date().toISOString();
const artifact = {
  schemaVersion: 2,
  generatedAt,
  provider: 'openrouteservice',
  providerBase: BASE,
  profile: PROFILE,
  generationMode: WITH_GEOMETRY ? 'metrics_and_geometry' : 'metrics',
  status: 'ready',
  attribution: 'Routing data © openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
  inputFingerprint,
  note: WITH_GEOMETRY
    ? 'Road matrix and route geometries generated from OpenRouteService.'
    : 'Road matrix generated from OpenRouteService. Geometry was not requested.',
  origins: Object.fromEntries(origins.map(([id, name, lat, lng]) => [id, { name, lat, lng }])),
  outlets: Object.fromEntries(outlets.map(([id, name, lat, lng]) => [id, { name, lat, lng }])),
  cells: {},
};

for (let oi = 0; oi < origins.length; oi += 1) {
  const [originId] = origins[oi];
  artifact.cells[originId] = {};
  for (let di = 0; di < outlets.length; di += 1) {
    const [outletId] = outlets[di];
    const distanceMeters = matrix.distances?.[oi]?.[di];
    const durationSeconds = matrix.durations?.[oi]?.[di];

    artifact.cells[originId][outletId] =
      typeof distanceMeters === 'number' && typeof durationSeconds === 'number'
        ? {
            status: 'routed',
            distanceMeters,
            durationSeconds,
            metricSource: 'matrix',
            geometryStatus: WITH_GEOMETRY ? 'unavailable' : 'not_requested',
          }
        : { status: 'unavailable', geometryStatus: WITH_GEOMETRY ? 'unavailable' : 'not_requested' };
  }
}

if (WITH_GEOMETRY) {
  console.log(`Fetching route geometry for ${origins.length * outlets.length} demo origin/outlet pairs at a conservative rate...`);
  for (const [originId, , originLat, originLng] of origins) {
    for (const [outletId, , outletLat, outletLng] of outlets) {
      const cell = artifact.cells[originId][outletId];
      if (cell.status !== 'routed') continue;
      try {
        const geojson = await ors(`/directions/${PROFILE}/geojson`, {
          coordinates: [[originLng, originLat], [outletLng, outletLat]],
          instructions: false,
        });
        const geometry = geojson.features?.[0]?.geometry;
        if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
          cell.geometry = geometry;
          cell.geometryStatus = 'ready';
          const summary = geojson.features?.[0]?.properties?.summary;
          if (
            typeof summary?.distance === 'number' &&
            Number.isFinite(summary.distance) &&
            typeof summary?.duration === 'number' &&
            Number.isFinite(summary.duration)
          ) {
            cell.distanceMeters = summary.distance;
            cell.durationSeconds = summary.duration;
            cell.metricSource = 'directions';
          }
        }
      } catch (error) {
        console.warn(`Geometry unavailable for ${originId} -> ${outletId}: ${error.message}`);
        artifact.status = 'partial';
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1600));
    }
  }
}

const output = resolve('src/generated/routing-matrix.json');
await writeFile(output, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
console.log(`Wrote ${output} (${artifact.status}) at ${generatedAt}`);
