import { defineRole } from 'twenty-sdk/define';

import { CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/crm-activity.object';
import { LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead-import-batch.object';
import { LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead.object';
import { OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/outreach-draft.object';
import { RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/research.object';

export const RESEARCH_AGENT_ROLE_UNIVERSAL_IDENTIFIER =
  'a0b1452c-c637-4845-9012-889900112234';

const agentRecordPermissions = {
  canReadObjectRecords: true,
  canUpdateObjectRecords: true,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
};

export default defineRole({
  universalIdentifier: RESEARCH_AGENT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'My CRM research agent',
  description:
    'Scoped agent role for source-backed research and draft preparation. It cannot delete records or approve outreach.',
  icon: 'IconRobot',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: true,
  canBeAssignedToApiKeys: true,
  objectPermissions: [
    {
      objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      ...agentRecordPermissions,
    },
    {
      objectUniversalIdentifier: RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
      ...agentRecordPermissions,
    },
    {
      objectUniversalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
      ...agentRecordPermissions,
    },
    {
      objectUniversalIdentifier: CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
      ...agentRecordPermissions,
    },
    {
      objectUniversalIdentifier: LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
      ...agentRecordPermissions,
    },
  ],
});
