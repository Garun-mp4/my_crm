import { describe, expect, it } from 'vitest';

import { toResourcePath } from '@/cli/utilities/file/to-resource-path';

describe('toResourcePath', () => {
  it('normalizes Windows separators for portable manifest paths', () => {
    expect(toResourcePath('BuiltLogicFunction\\src\\create-lead.mjs')).toBe(
      'BuiltLogicFunction/src/create-lead.mjs',
    );
  });

  it('keeps POSIX separators unchanged', () => {
    expect(toResourcePath('BuiltLogicFunction/src/create-lead.mjs')).toBe(
      'BuiltLogicFunction/src/create-lead.mjs',
    );
  });
});
