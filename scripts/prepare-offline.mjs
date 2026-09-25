import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const assets = (await readdir('dist/_astro'))
  .filter((name) => /\.(?:js|css|woff2)$/.test(name))
  .map((name) => `/_astro/${name}`)
  .sort();
if (!assets.length) throw new Error('No built assets found for offline cache');

const path = 'dist/sw.js';
const source = await readFile(path, 'utf8');
const marker = 'const CORE_ASSETS = [];';
const versionMarker = '__BUILD_CACHE_VERSION__';
if (!source.includes(marker) || !source.includes(versionMarker)) {
  throw new Error('Service worker build markers are missing');
}
const version = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 12);
await writeFile(path, source
  .replace(marker, `const CORE_ASSETS = ${JSON.stringify(assets)};`)
  .replace(versionMarker, version));
