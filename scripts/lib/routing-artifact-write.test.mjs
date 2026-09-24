import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonAtomic } from './routing-artifact.mjs';

const created = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('atomic routing artifact writes', () => {
  it('preserves the previous artifact when validation fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aniwhere-routing-'));
    created.push(dir);
    const output = join(dir, 'routing-matrix.json');
    await writeFile(output, '{"kept":true}\n', 'utf8');

    await expect(
      writeJsonAtomic(output, { broken: true }, () => {
        throw new Error('invalid artifact');
      })
    ).rejects.toThrow('invalid artifact');

    await expect(readFile(output, 'utf8')).resolves.toBe('{"kept":true}\n');
    expect((await readdir(dir)).filter((name) => name.includes('.tmp-'))).toEqual([]);
  });

  it('replaces the artifact only after successful re-read and validation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aniwhere-routing-'));
    created.push(dir);
    const output = join(dir, 'routing-matrix.json');
    await writeFile(output, '{"old":true}\n', 'utf8');

    await writeJsonAtomic(output, { ready: true }, (candidate) => {
      expect(candidate).toEqual({ ready: true });
    });

    await expect(readFile(output, 'utf8')).resolves.toBe(
      JSON.stringify({ ready: true }, null, 2) + '\n'
    );
    expect((await readdir(dir)).filter((name) => name.includes('.tmp-'))).toEqual([]);
  });
});
