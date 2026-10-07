import { describe, expect, it } from '@jest/globals';

import { brotliSize, clampQuality, deltaPct, fmt, pct, sizes, toBuffer } from '../src/measure.ts';

describe('measure', () => {
  it('clamps brotli quality to 0-11', () => {
    expect(clampQuality(undefined)).toBe(11);
    expect(clampQuality(Number.NaN)).toBe(11);
    expect(clampQuality(-3)).toBe(0);
    expect(clampQuality(20)).toBe(11);
    expect(clampQuality(5.4)).toBe(5);
  });

  it('reports raw, gzip, and brotli, each no larger than the last step', () => {
    const text = 'hello world '.repeat(80);
    const s = sizes(text);
    expect(s.raw).toBe(Buffer.byteLength(text));
    expect(s.gzip).toBeLessThan(s.raw);
    expect(s.brotli).toBeLessThanOrEqual(s.gzip);
    expect(brotliSize(text)).toBe(s.brotli);
  });

  it('accepts a Buffer', () => {
    const buf = toBuffer('abc');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(sizes(buf).raw).toBe(3);
  });

  it('formats percents', () => {
    expect(fmt(1234567)).toMatch(/1,234,567/);
    expect(pct(25, 100)).toBe('25.00%');
    expect(pct(1, 0)).toBe('');
    expect(deltaPct(90, 100)).toBe('-10.00%');
    expect(deltaPct(110, 100)).toBe('+10.00%');
    expect(deltaPct(1, 0)).toBe('');
  });
});
