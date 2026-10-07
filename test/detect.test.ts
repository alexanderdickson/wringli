import { describe, expect, it } from '@jest/globals';

import { looksLikeModule } from '../src/detect.ts';

describe('detect', () => {
  it('detects ESM from import and export declarations', () => {
    expect(looksLikeModule('import x from "y";\n')).toBe(true);
    expect(looksLikeModule('import{x}from"y";\n')).toBe(true);
    expect(looksLikeModule('export const a = 1;\n')).toBe(true);
    expect(looksLikeModule('export default 1;\n')).toBe(true);
    expect(looksLikeModule('export { x };\n')).toBe(true);
    expect(looksLikeModule('export * from "y";\n')).toBe(true);
    expect(looksLikeModule('const a = 1;\n')).toBe(false);
  });

  it('ignores import and export text in comments and strings', () => {
    expect(looksLikeModule('// import x from "y"\nconst a = 1;\n')).toBe(false);
    expect(looksLikeModule('/* export const a = 1; */\nconst a = 1;\n')).toBe(false);
    expect(looksLikeModule('const s = "export const a = 1";\n')).toBe(false);
  });

  it('treats import.meta and top-level await as modules', () => {
    expect(looksLikeModule('console.log(import.meta.url);\n')).toBe(true);
    expect(looksLikeModule('await 1;\n')).toBe(true);
  });

  it('does not treat dynamic import as a module', () => {
    expect(looksLikeModule('import("x");\n')).toBe(false);
  });

  it('returns false when the source does not parse', () => {
    expect(looksLikeModule('const export = 1;')).toBe(false);
  });
});
