import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isHelpOrVersion, parseArgs } from './args.ts';
import { looksLikeModule } from './detect.ts';
import { deltaPct, fmt, sizes } from './measure.ts';
import { minifyEnsemble } from './minify.ts';
import type { EnsembleResult, Flags, Io, MinifyOptions, Sizes } from './types.ts';

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../package.json');
export const VERSION = (JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string })
  .version;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function readInput(file: string) {
  if (file === '-') return { file: 'stdin.js', code: fs.readFileSync(0, 'utf8') };
  return { file, code: fs.readFileSync(file, 'utf8') };
}

function resolveModule(code: string, flags: Flags): boolean {
  if (flags.script) return false;
  if (flags.module) return true;
  return looksLikeModule(code);
}

interface Job {
  file: string;
  code: string;
  result: WringResult;
}

interface WringResult {
  original: Sizes;
  ensemble: EnsembleResult;
  winner: string;
  code: string;
  sizes: Sizes;
}

function writeOutputs(jobs: Job[], flags: Flags): string[] {
  if (flags.write) {
    for (const job of jobs) fs.writeFileSync(job.file, job.code);
    return jobs.map((j) => j.file);
  }
  if (!flags.out) {
    if (jobs.length !== 1)
      throw new Error('pass --out <dir> or --write when wringing multiple files');
    process.stdout.write(jobs[0].code);
    if (!jobs[0].code.endsWith('\n')) process.stdout.write('\n');
    return ['stdout'];
  }
  const out = flags.out;
  const isDir =
    /[/\\]$/.test(out) || (fs.existsSync(out) && fs.statSync(out).isDirectory()) || jobs.length > 1;
  if (isDir) {
    fs.mkdirSync(out, { recursive: true });
    const written: string[] = [];
    for (const job of jobs) {
      const name = path.basename(job.file) + (flags.suffix || '');
      const dest = path.join(out, name);
      fs.writeFileSync(dest, job.code);
      written.push(dest);
    }
    return written;
  }
  if (jobs.length !== 1) throw new Error('--out file only works with a single input');
  fs.mkdirSync(path.dirname(out) || '.', { recursive: true });
  fs.writeFileSync(out, jobs[0].code);
  return [out];
}

function minifyOpts(flags: Flags, code: string): MinifyOptions {
  return {
    module: resolveModule(code, flags),
    engines: flags.engines,
    quality: flags.quality ?? 11,
    passes: flags.passes ?? 3,
  };
}

async function wringOne(code: string, flags: Flags): Promise<WringResult> {
  const opts = minifyOpts(flags, code);
  const original = sizes(code, opts.quality);
  const ensemble = await minifyEnsemble(code, opts);
  return {
    original,
    ensemble,
    winner: ensemble.winner,
    code: ensemble.code,
    sizes: ensemble.sizes,
  };
}

function printMinifyReport(
  file: string,
  result: WringResult,
  dest: string | undefined,
  flags: Flags,
  err: NodeJS.WritableStream,
): void {
  if (flags.json) return;
  err.write(`${file}\n`);
  err.write(
    `  original  raw ${fmt(result.original.raw).padStart(10)}  gzip ${fmt(result.original.gzip).padStart(9)}  brotli ${fmt(result.original.brotli).padStart(9)}\n`,
  );
  for (const c of result.ensemble.candidates) {
    if (c.skipped) {
      err.write(`  ${c.name.padEnd(9)}  skipped (${c.reason})\n`);
      continue;
    }
    if (c.error) {
      err.write(`  ${c.name.padEnd(9)}  error: ${c.error}\n`);
      continue;
    }
    const mark = c.name === result.winner ? '  kept' : '';
    err.write(
      `  ${c.name.padEnd(9)}  raw ${fmt(c.raw).padStart(10)}  gzip ${fmt(c.gzip).padStart(9)}  brotli ${fmt(c.brotli).padStart(9)}  ${((c.ms ?? 0) / 1000).toFixed(2)}s${mark}\n`,
    );
  }
  err.write(
    `  winner ${result.winner}  brotli ${fmt(result.sizes.brotli)} (${deltaPct(result.sizes.brotli, result.original.brotli)} vs original)\n`,
  );
  if (dest) err.write(`  wrote ${dest}\n`);
}

function summarizeResult(result: WringResult) {
  return {
    winner: result.winner,
    original: result.original,
    sizes: result.sizes,
    engines: result.ensemble.candidates.map((c) => ({
      name: c.name,
      skipped: !!c.skipped,
      error: c.error || null,
      raw: c.raw,
      gzip: c.gzip,
      brotli: c.brotli,
      ms: c.ms,
    })),
  };
}

async function cmdMinify(files: string[], flags: Flags, io: Io): Promise<number> {
  if (!files.length) throw new Error('pass one or more JS files (or - for stdin)');
  const jobs: Job[] = [];
  const reports = [];
  for (const file of files) {
    const input = await readInput(file);
    const result = await wringOne(input.code, flags);
    jobs.push({ file: input.file, code: result.code, result });
    reports.push({ file: input.file, ...summarizeResult(result) });
  }
  const written = writeOutputs(jobs, flags);
  jobs.forEach((job, i) => printMinifyReport(job.file, job.result, written[i], flags, io.err));
  if (flags.json)
    io.out.write(JSON.stringify({ version: VERSION, files: reports, written }, null, 2) + '\n');
  return 0;
}

async function cmdMeasure(files: string[], flags: Flags, io: Io): Promise<number> {
  if (!files.length) throw new Error('measure expects one or more files');
  const rows = [];
  for (const file of files) {
    const input = await readInput(file);
    const s = sizes(input.code, flags.quality ?? 11);
    rows.push({ file: input.file, ...s });
    if (!flags.json && !flags.quiet) {
      io.err.write(
        `${input.file}  raw ${fmt(s.raw)}  gzip ${fmt(s.gzip)}  brotli ${fmt(s.brotli)}\n`,
      );
    }
  }
  if (flags.json) io.out.write(JSON.stringify(rows, null, 2) + '\n');
  return 0;
}

export async function run(
  argv: string[],
  io: Io = { out: process.stdout, err: process.stderr },
): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs(argv, VERSION, io);
  } catch (err) {
    if (isHelpOrVersion(err)) return 0;
    io.err.write(`wringli: ${errorMessage(err)}\n`);
    return 2;
  }
  const { command, files, flags } = parsed;
  try {
    if (command === 'minify') return await cmdMinify(files, flags, io);
    if (command === 'measure') return await cmdMeasure(files, flags, io);
    io.err.write(`wringli: unknown command ${command}\n`);
    return 2;
  } catch (err) {
    io.err.write(`wringli: ${errorMessage(err)}\n`);
    return 1;
  }
}
