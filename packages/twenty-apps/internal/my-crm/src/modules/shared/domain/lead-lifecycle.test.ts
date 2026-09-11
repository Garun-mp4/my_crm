import { describe, expect, it } from 'vitest';

import {
  assertLeadTransition,
  canTransitionLead,
  InvalidLeadTransitionError,
} from './lead-lifecycle';

describe('lead lifecycle', () => {
  it('allows the research path to reach a human-contactable lead', () => {
    expect(canTransitionLead('NEW', 'RESEARCHING')).toBe(true);
    expect(assertLeadTransition('RESEARCHING', 'RESEARCHED')).toBe(
      'RESEARCHED',
    );
    expect(assertLeadTransition('RESEARCHED', 'QUALIFIED')).toBe('QUALIFIED');
    expect(assertLeadTransition('QUALIFIED', 'DRAFT_READY')).toBe(
      'DRAFT_READY',
    );
  });

  it('prevents sending a lead directly from new to contacted', () => {
    expect(() => assertLeadTransition('NEW', 'CONTACTED')).toThrow(
      InvalidLeadTransitionError,
    );
  });

  it('makes terminal do-not-contact state irreversible', () => {
    expect(canTransitionLead('DO_NOT_CONTACT', 'DRAFT_READY')).toBe(false);
  });

  it('requires a reply or meeting before a win', () => {
    expect(canTransitionLead('DRAFT_READY', 'WON')).toBe(false);
    expect(canTransitionLead('REPLIED', 'MEETING')).toBe(true);
    expect(canTransitionLead('MEETING', 'WON')).toBe(true);
  });
});
