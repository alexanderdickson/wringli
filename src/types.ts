export type EngineName = 'terser' | 'swc' | 'oxc' | 'uglify' | 'esbuild';

export interface Sizes {
  raw: number;
  gzip: number;
  brotli: number;
}

export interface MinifyOptions {
  module?: boolean;
  engines?: string;
  quality?: number;
  passes?: number;
}

export type CommandName = 'minify' | 'measure';

export interface Flags {
  out?: string;
  write?: boolean;
  module?: boolean;
  script?: boolean;
  engines?: string;
  quality?: number;
  passes?: number;
  quiet?: boolean;
  json?: boolean;
  suffix?: string;
}

export interface Io {
  out: NodeJS.WritableStream;
  err: NodeJS.WritableStream;
}

export interface EngineCandidate extends Sizes {
  name: EngineName;
  code?: string;
  ms?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface EnsembleResult {
  winner: EngineName;
  code: string;
  sizes: Sizes;
  candidates: EngineCandidate[];
}
