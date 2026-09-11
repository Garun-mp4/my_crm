import { describe, expect, it } from 'vitest';

import researchAgentRole from './research-agent.role';
import {
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  LEAD_SENSITIVE_CONTACT_FIELD_IDS,
} from '../objects/lead.object';

describe('research agent role', () => {
  it('denies direct access to sensitive contact fields', () => {
    expect(researchAgentRole.success).toBe(true);

    for (const fieldUniversalIdentifier of LEAD_SENSITIVE_CONTACT_FIELD_IDS) {
      expect(researchAgentRole.config?.fieldPermissions).toContainEqual({
        objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
        fieldUniversalIdentifier,
        canReadFieldValue: false,
        canUpdateFieldValue: false,
      });
    }
  });
});
