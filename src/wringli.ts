#!/usr/bin/env node
import { run } from './cli.ts';

run(process.argv).then(
  (code) => {
    process.exitCode = code;
    return code;
  },
  (err: unknown) => {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    process.stderr.write(`wringli: ${message}\n`);
    process.exitCode = 1;
    return 1;
  },
);
