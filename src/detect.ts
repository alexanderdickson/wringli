import { parseSync, type ParseOptions, type Program } from '@swc/core';

const DETECT_PARSE: ParseOptions & { isModule: 'unknown' } = {
  syntax: 'ecmascript',
  target: 'es2022',
  isModule: 'unknown',
};

export function looksLikeModule(code: string): boolean {
  try {
    const ast = parseSync(code, DETECT_PARSE) as Program;
    return ast.type === 'Module';
  } catch {
    return false;
  }
}
