import { parseSync, type Program } from '@swc/core';

export function looksLikeModule(code: string): boolean {
  try {
    const ast = parseSync(code, {
      syntax: 'ecmascript',
      target: 'es2022',
      isModule: 'unknown',
    }) as Program;
    return ast.type === 'Module';
  } catch {
    return false;
  }
}
