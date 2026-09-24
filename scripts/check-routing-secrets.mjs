import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve('dist');
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.html', '.css', '.json', '.map', '.txt']);
const FORBIDDEN = [
  { label: 'ORS_API_KEY', pattern: /ORS_API_KEY/i },
  { label: 'PUBLIC_ORS_*', pattern: /PUBLIC_ORS(?:_|[A-Z])/i },
];

const privateKey = process.env.ORS_API_KEY?.trim();
if (privateKey) {
  FORBIDDEN.push({
    label: 'literal ORS_API_KEY value',
    pattern: new RegExp(privateKey.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\const FORBIDDEN = [
  { label: 'ORS_API_KEY', pattern: /ORS_API_KEY/i },
  { label: 'PUBLIC_ORS_*', pattern: /PUBLIC_ORS(?:_|[A-Z])/i },
];')),
  });
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (TEXT_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of await walk(ROOT)) {
  const content = await readFile(file, 'utf8');
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(content)) {
      violations.push(`${rule.label}: ${file.slice(ROOT.length + 1)}`);
    }
  }
}

if (violations.length) {
  console.error('Routing secret markers were found in the production bundle:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Routing secret scan passed: no ORS secret markers or configured key value are bundled.');
