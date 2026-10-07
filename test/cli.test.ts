import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { run } from '../src/cli.ts';

function collect() {
  let out = '';
  let err = '';
  return {
    io: {
      out: { write: (s: string) => (out += s) } as NodeJS.WritableStream,
      err: { write: (s: string) => (err += s) } as NodeJS.WritableStream,
    },
    get out() {
      return out;
    },
    get err() {
      return err;
    },
  };
}

describe('cli run', () => {
  it('prints version', async () => {
    const logs = collect();
    const code = await run(['node', 'wringli', '--version'], logs.io);
    expect(code).toBe(0);
    expect(logs.out.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints help', async () => {
    const logs = collect();
    const code = await run(['node', 'wringli', '--help'], logs.io);
    expect(code).toBe(0);
    expect(logs.out).toContain('keep the smallest Brotli output');
    expect(logs.out).toContain('minify');
  });

  it('measures a temp file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wringli-test-'));
    const file = join(dir, 'sample.js');
    writeFileSync(file, 'function add(a, b) { return a + b; }\n');
    const logs = collect();
    const code = await run(['node', 'wringli', 'measure', file], logs.io);
    expect(code).toBe(0);
    expect(logs.err).toMatch(/raw \d+.*gzip \d+.*brotli \d+/);
  });

  it('minifies a temp file and keeps the Brotli winner', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wringli-test-'));
    const input = join(dir, 'sample.js');
    const output = join(dir, 'sample.min.js');
    writeFileSync(input, 'function add(a, b) { return a + b; }\n');
    const logs = collect();
    const code = await run(['node', 'wringli', input, '-o', output], logs.io);
    expect(code).toBe(0);
    const js = readFileSync(output, 'utf8');
    expect(js.length).toBeLessThan(readFileSync(input, 'utf8').length);
    expect(logs.err).toMatch(/winner/);
  });

  it('returns 2 for an unknown option', async () => {
    const logs = collect();
    const code = await run(['node', 'wringli', '--not-a-real-flag'], logs.io);
    expect(code).toBe(2);
    expect(logs.err.length).toBeGreaterThan(0);
  });
});
