import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve('dist');
const SOURCE_ROOTS = ['api', 'server', 'src', 'scripts'].map((directory) => resolve(directory));
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.svelte', '.astro', '.html', '.css', '.json', '.map', '.txt']);
const FORBIDDEN = [
  { label: 'ORS_API_KEY', pattern: /ORS_API_KEY/i },
  { label: 'PUBLIC_ORS_*', pattern: /PUBLIC_ORS(?:_|[A-Z])/i },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const privateKey = process.env.ORS_API_KEY?.trim();
if (privateKey) {
  FORBIDDEN.push({
    label: 'literal ORS_API_KEY value',
    pattern: new RegExp(escapeRegExp(privateKey)),
  });
}

const SOURCE_FORBIDDEN = [
  {
    label: 'hard-coded Authorization credential',
    pattern: /Authorization\s*:\s*['"`]\s*(?:Bearer\s+)?[A-Za-z0-9._~+/=-]{20,}\s*['"`]/i,
  },
  {
    label: 'ORS-like encoded credential literal',
    pattern: /['"`]eyJ[A-Za-z0-9+/_=-]{40,}['"`]/,
  },
];

if (privateKey) {
  SOURCE_FORBIDDEN.push({
    label: 'literal configured ORS_API_KEY value',
    pattern: new RegExp(escapeRegExp(privateKey)),
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
      violations.push(`${rule.label}: dist/${file.slice(ROOT.length + 1)}`);
    }
  }
}

for (const root of SOURCE_ROOTS) {
  for (const file of await walk(root)) {
    const relative = file.slice(resolve('.').length + 1);
    if (/\.test\.[cm]?[jt]sx?$/.test(file) || relative.includes('/tests/')) continue;
    const content = await readFile(file, 'utf8');
    for (const rule of SOURCE_FORBIDDEN) {
      if (rule.pattern.test(content)) {
        violations.push(`${rule.label}: ${relative}`);
      }
    }
  }
}

if (violations.length) {
  console.error('Routing secret markers were found in the production bundle:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('Routing secret scan passed: no ORS secret markers are bundled and no credential-like literals were found in routing source.');
