import { describe, expect, it } from 'vitest';

import { validateResearchSource } from './research-source-policy';

describe('research source policy', () => {
  it('accepts public HTTP(S) sources and normalizes them', () => {
    expect(validateResearchSource(' https://example.ru/path ')).toEqual({
      valid: true,
      normalizedUrl: 'https://example.ru/path',
    });
  });

  it('allows a human fact without a source URL', () => {
    expect(validateResearchSource(undefined)).toEqual({
      valid: true,
      normalizedUrl: null,
    });
  });

  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'http://localhost:3000',
  ])('rejects unsafe source %s', (sourceUrl) => {
    expect(validateResearchSource(sourceUrl).valid).toBe(false);
  });
});
