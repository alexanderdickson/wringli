import zlib from 'node:zlib';

export function toBuffer(input: string | Buffer): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

export function clampQuality(quality: number | undefined): number {
  const n = Number(quality);
  if (!Number.isFinite(n)) return 11;
  return Math.min(11, Math.max(0, Math.round(n)));
}

export function sizes(
  input: string | Buffer,
  quality = 11,
): { raw: number; gzip: number; brotli: number } {
  const buf = toBuffer(input);
  const q = clampQuality(quality);
  return {
    raw: buf.length,
    gzip: zlib.gzipSync(buf, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buf, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: q,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
      },
    }).length,
  };
}

export function brotliSize(input: string | Buffer, quality = 11): number {
  const buf = toBuffer(input);
  return zlib.brotliCompressSync(buf, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: clampQuality(quality),
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
    },
  }).length;
}

export function fmt(n: number): string {
  return Number(n).toLocaleString('en-US');
}

export function pct(part: number, whole: number): string {
  if (!whole) return '';
  return `${((100 * part) / whole).toFixed(2)}%`;
}

export function deltaPct(next: number, prev: number): string {
  if (!prev) return '';
  const sign = next < prev ? '' : '+';
  return `${sign}${(((next - prev) / prev) * 100).toFixed(2)}%`;
}
