import { describe, expect, it } from '@jest/globals';

import { isHelpOrVersion, parseArgs } from '../src/args.ts';

function argv(...rest: string[]): string[] {
  return ['node', 'wringli', ...rest];
}

describe('parseArgs', () => {
  it('defaults to minify', () => {
    const parsed = parseArgs(argv('app.js', '-o', 'out.js'), '0.0.0');
    expect(parsed.command).toBe('minify');
    expect(parsed.files).toEqual(['app.js']);
    expect(parsed.flags.out).toBe('out.js');
  });

  it('parses measure and typed flags', () => {
    const parsed = parseArgs(argv('measure', 'app.js', '--quality', '9'), '0.0.0');
    expect(parsed.command).toBe('measure');
    expect(parsed.files).toEqual(['app.js']);
    expect(parsed.flags.quality).toBe(9);
  });

  it('parses engine and pass flags', () => {
    const parsed = parseArgs(argv('--engines', 'terser,swc', '--passes', '2', 'x.js'), '0.0.0');
    expect(parsed.command).toBe('minify');
    expect(parsed.flags.engines).toBe('terser,swc');
    expect(parsed.flags.passes).toBe(2);
  });

  it('throws a help-or-version error for --help', () => {
    const sink = { write: () => undefined } as unknown as NodeJS.WritableStream;
    try {
      parseArgs(argv('--help'), '0.0.0', { out: sink, err: sink });
      throw new Error('expected help to throw');
    } catch (err) {
      expect(isHelpOrVersion(err)).toBe(true);
    }
  });
});
