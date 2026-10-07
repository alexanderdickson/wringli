import { Command, CommanderError, InvalidArgumentError } from 'commander';

import { DEFAULT_ENGINES_SPEC } from './engines.ts';
import type { CommandName, Flags, Io } from './types.ts';

export interface ParsedArgs {
  command: CommandName;
  files: string[];
  flags: Flags;
}

function intOption(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new InvalidArgumentError(`expected a number, got ${value}`);
  return n;
}

function addSharedOptions(cmd: Command): Command {
  return cmd
    .option('-o, --out <path>', 'write to a file or directory')
    .option('-q, --quiet', 'only print errors')
    .option('--json', 'machine-readable report')
    .option('--quality <n>', 'brotli quality 0-11 used for scoring', intOption, 11);
}

function flagsFrom(opts: Record<string, unknown>): Flags {
  return {
    out: typeof opts.out === 'string' ? opts.out : undefined,
    write: Boolean(opts.write),
    module: Boolean(opts.module),
    script: Boolean(opts.script),
    engines: typeof opts.engines === 'string' ? opts.engines : undefined,
    quality: typeof opts.quality === 'number' ? opts.quality : undefined,
    passes: typeof opts.passes === 'number' ? opts.passes : undefined,
    quiet: Boolean(opts.quiet),
    json: Boolean(opts.json),
    suffix: typeof opts.suffix === 'string' ? opts.suffix : undefined,
  };
}

function filesFrom(cmd: Command): string[] {
  return cmd.processedArgs.flatMap((arg) => (Array.isArray(arg) ? arg : [arg])) as string[];
}

export function createProgram(
  version: string,
  onCommand: (parsed: ParsedArgs) => void,
  io?: Io,
): Command {
  const program = new Command();
  program
    .name('wringli')
    .description('Run several JS minifiers and keep the smallest Brotli output')
    .version(version, '-v, --version', 'print version')
    .helpOption('-h, --help', 'show this help')
    .showHelpAfterError()
    .exitOverride()
    .addHelpText(
      'after',
      `
Examples:
  wringli dist/app.js -o dist/app.min.js
  wringli --engines terser,swc,oxc,uglify,esbuild src/lib.js
  wringli measure dist/*.js
`,
    );

  if (io) {
    program.configureOutput({
      writeOut: (s) => {
        io.out.write(s);
      },
      writeErr: (s) => {
        io.err.write(s);
      },
    });
  }

  const capture =
    (command: CommandName) =>
    (...args: unknown[]) => {
      const cmd = args[args.length - 1] as Command;
      onCommand({ command, files: filesFrom(cmd), flags: flagsFrom(cmd.opts()) });
    };

  addSharedOptions(
    program
      .command('minify', { isDefault: true })
      .description('run several minifiers, keep the smallest Brotli output')
      .argument('[files...]', 'JS files, or - for stdin')
      .option('-w, --write', 'overwrite the input files')
      .option('-m, --module', 'treat input as ESM (auto-detected if omitted)')
      .option('--script', 'force classic script (disable ESM detection)')
      .option('--engines <list>', 'comma list: terser,swc,oxc,uglify,esbuild', DEFAULT_ENGINES_SPEC)
      .option('--passes <n>', 'compress passes per engine', intOption, 3)
      .option('--suffix <ext>', 'with --out dir, append this')
      .action(capture('minify')),
  );

  addSharedOptions(
    program
      .command('measure')
      .description('print raw, gzip, and Brotli sizes')
      .argument('<files...>', 'files to measure')
      .action(capture('measure')),
  );

  return program;
}

export function parseArgs(argv: string[], version: string, io?: Io): ParsedArgs {
  let parsed: ParsedArgs | undefined;
  const program = createProgram(
    version,
    (next) => {
      parsed = next;
    },
    io,
  );
  program.parse(argv);
  if (!parsed) throw new Error('no command matched');
  return parsed;
}

export function isHelpOrVersion(err: unknown): boolean {
  return (
    err instanceof CommanderError &&
    (err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.help' ||
      err.code === 'commander.version')
  );
}
