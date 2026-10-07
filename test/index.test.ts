import { describe, expect, it } from '@jest/globals';

import {
  brotliSize,
  looksLikeModule,
  minifyEnsemble,
  parseEngines,
  sizes,
  type EngineCandidate,
  type EngineName,
  type EnsembleResult,
  type MinifyOptions,
  type Sizes,
} from '../src/index.ts';

describe('public api', () => {
  it('exports the library entry used by consumers', async () => {
    const opts: MinifyOptions = { engines: 'terser' };
    const result: EnsembleResult = await minifyEnsemble('const n = 1 + 2;\n', opts);
    const measured: Sizes = sizes(result.code);
    const winner: EngineName = result.winner;
    const candidate: EngineCandidate | undefined = result.candidates[0];

    expect(looksLikeModule('export const a = 1;\n')).toBe(true);
    expect(parseEngines('terser,oxc-minify')).toEqual(['terser', 'oxc']);
    expect(winner).toBe('terser');
    expect(candidate?.name).toBe('terser');
    expect(measured.brotli).toBe(result.sizes.brotli);
    expect(brotliSize(result.code)).toBe(result.sizes.brotli);
  });
});
