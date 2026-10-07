import { describe, expect, it } from '@jest/globals';

import { DEFAULT_ENGINES, parseEngines } from '../src/engines.ts';

describe('parseEngines', () => {
  it('returns the default set', () => {
    expect(parseEngines()).toEqual(DEFAULT_ENGINES);
    expect(parseEngines('default')).toEqual(['terser', 'swc', 'oxc', 'uglify']);
  });

  it('parses a list and aliases uglify-js and oxc-minify', () => {
    expect(parseEngines('terser, uglify-js ,esbuild,oxc-minify')).toEqual([
      'terser',
      'uglify',
      'esbuild',
      'oxc',
    ]);
  });

  it('rejects unknown names', () => {
    expect(() => parseEngines('terser,nope')).toThrow(/unknown engine: nope/);
  });
});
