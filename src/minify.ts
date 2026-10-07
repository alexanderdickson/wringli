import { ENGINES, parseEngines } from './engines.ts';
import { sizes } from './measure.ts';
import type { EngineCandidate, EngineName, EnsembleResult, MinifyOptions } from './types.ts';

export async function runEngine(
  name: EngineName,
  code: string,
  opts: MinifyOptions,
): Promise<EngineCandidate> {
  const t0 = Date.now();
  try {
    const out = await ENGINES[name](code, opts);
    if (out === null) {
      return {
        name,
        skipped: true,
        reason: name === 'uglify' ? 'no ESM support' : 'skipped',
        raw: 0,
        gzip: 0,
        brotli: 0,
      };
    }
    const measured = sizes(out, opts.quality);
    return { name, code: out, ms: Date.now() - t0, ...measured };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, error: message, ms: Date.now() - t0, raw: 0, gzip: 0, brotli: 0 };
  }
}

export async function minifyEnsemble(
  code: string,
  opts: MinifyOptions = {},
): Promise<EnsembleResult> {
  const names = parseEngines(opts.engines);
  const candidates = await Promise.all(names.map((name) => runEngine(name, code, opts)));
  const usable = candidates.filter((c): c is EngineCandidate & { code: string } => Boolean(c.code));
  if (!usable.length) {
    const detail = candidates
      .map((c) => `${c.name}: ${c.error || c.reason || 'no output'}`)
      .join('; ');
    throw new Error(`no minifier produced output (${detail})`);
  }

  usable.sort((a, b) => a.brotli - b.brotli || a.raw - b.raw || (a.ms ?? 0) - (b.ms ?? 0));
  const winner = usable[0];
  return {
    winner: winner.name,
    code: winner.code,
    sizes: { raw: winner.raw, gzip: winner.gzip, brotli: winner.brotli },
    candidates,
  };
}
