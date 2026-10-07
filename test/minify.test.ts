import { describe, expect, it } from '@jest/globals';

import { sizes } from '../src/measure.ts';
import { minifyEnsemble } from '../src/minify.ts';

const SAMPLE = `
function hello(name) {
  if (name) {
    console.log("Hello, " + name);
  }
  return { x: 10, y: 20 };
}
hello("world");
`;

describe('minifyEnsemble', () => {
  it('returns the smallest brotli candidate and beats the original', async () => {
    const result = await minifyEnsemble(SAMPLE, { engines: 'terser,swc,oxc,uglify' });
    const original = sizes(SAMPLE);
    expect(result.code.length).toBeLessThan(SAMPLE.length);
    expect(result.sizes.brotli).toBeLessThan(original.brotli);
    expect(result.candidates.some((c) => c.code)).toBe(true);
    expect(result.candidates.map((c) => c.name)).toEqual(
      expect.arrayContaining(['terser', 'swc', 'oxc', 'uglify']),
    );
    const winner = result.candidates.find((c) => c.name === result.winner);
    expect(winner?.brotli).toBe(result.sizes.brotli);
  });

  it('minifies with oxc', async () => {
    const result = await minifyEnsemble(SAMPLE, { engines: 'oxc' });
    expect(result.winner).toBe('oxc');
    expect(result.code.length).toBeLessThan(SAMPLE.length);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].error).toBeUndefined();
  });

  it('skips uglify on ESM', async () => {
    const result = await minifyEnsemble('export const n = 1 + 2;\n', {
      module: true,
      engines: 'terser,uglify',
    });
    const uglify = result.candidates.find((c) => c.name === 'uglify');
    expect(uglify?.skipped).toBe(true);
    expect(result.winner).toBe('terser');
    expect(result.code).toContain('export');
  });
});
