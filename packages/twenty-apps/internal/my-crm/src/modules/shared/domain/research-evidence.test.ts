import { describe, expect, it } from 'vitest';

import {
  isEvidenceHashStable,
  validateResearchEvidence,
} from './research-evidence';

describe('research evidence', () => {
  it('requires a source for generated or imported observations', () => {
    expect(
      validateResearchEvidence({
        fact: 'The first screen hides the CTA',
        provenance: 'AI_DRAFT',
      }),
    ).toEqual({ valid: false, reason: 'MISSING_SOURCE' });
  });

  it('requires an observation timestamp for human evidence', () => {
    expect(
      validateResearchEvidence({ fact: 'Rating is 5.0', provenance: 'HUMAN' }),
    ).toEqual({ valid: false, reason: 'MISSING_TIMESTAMP' });
  });

  it('accepts stable SHA-256 evidence identifiers', () => {
    expect(isEvidenceHashStable('a'.repeat(64))).toBe(true);
    expect(isEvidenceHashStable('not-a-hash')).toBe(false);
  });
});
