import * as swc from '@swc/core';
import * as esbuild from 'esbuild';
import { minifySync } from 'oxc-minify';
import { minify as terserMinify } from 'terser';
import uglify from 'uglify-js';

import type { EngineName, MinifyOptions } from './types.ts';

const ENGINE_ALIASES: Record<string, EngineName> = {
  'oxc-minify': 'oxc',
  'uglify-js': 'uglify',
};

export async function minifyTerser(code: string, opts: MinifyOptions = {}): Promise<string> {
  const result = await terserMinify(code, {
    module: !!opts.module,
    compress: { passes: opts.passes ?? 3 },
    mangle: true,
  });
  if (!result.code) throw new Error('terser produced empty output');
  return result.code;
}

export async function minifySwc(code: string, opts: MinifyOptions = {}): Promise<string> {
  const result = await swc.minify(code, {
    module: !!opts.module,
    compress: { passes: opts.passes ?? 3 },
    mangle: true,
  });
  if (!result.code) throw new Error('swc produced empty output');
  return result.code;
}

export async function minifyUglify(code: string, opts: MinifyOptions = {}): Promise<string | null> {
  if (opts.module) return null;
  const result = uglify.minify(code, {
    compress: { passes: opts.passes ?? 3 },
    mangle: true,
  });
  if (result.error) throw new Error(result.error.message || String(result.error));
  return result.code;
}

export async function minifyEsbuild(code: string, opts: MinifyOptions = {}): Promise<string> {
  const result = await esbuild.transform(code, {
    minify: true,
    format: opts.module ? 'esm' : undefined,
    target: 'es2020',
  });
  return result.code;
}

export async function minifyOxc(code: string, opts: MinifyOptions = {}): Promise<string> {
  const result = minifySync(opts.module ? 'input.mjs' : 'input.js', code, {
    module: !!opts.module,
    compress: true,
    mangle: true,
  });
  const fatal = result.errors.filter((err) => err.severity === 'Error');
  if (fatal.length) throw new Error(fatal[0].message);
  if (!result.code) throw new Error('oxc produced empty output');
  return result.code;
}

export const ENGINES: Record<
  EngineName,
  (code: string, opts?: MinifyOptions) => Promise<string | null>
> = {
  terser: minifyTerser,
  swc: minifySwc,
  oxc: minifyOxc,
  uglify: minifyUglify,
  esbuild: minifyEsbuild,
};

export const DEFAULT_ENGINES: EngineName[] = ['terser', 'swc', 'oxc', 'uglify'];
export const DEFAULT_ENGINES_SPEC = DEFAULT_ENGINES.join(',');

export function parseEngines(spec?: string): EngineName[] {
  if (!spec || spec === 'default') return [...DEFAULT_ENGINES];
  const names = spec
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => ENGINE_ALIASES[s] ?? s);
  const out: EngineName[] = [];
  for (const name of names) {
    if (!(name in ENGINES)) throw new Error(`unknown engine: ${name}`);
    out.push(name as EngineName);
  }
  return out;
}
