import { defineRole } from 'twenty-sdk/define';

import { CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/crm-activity.object';
import { LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead-import-batch.object';
import { LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead.object';
import { OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/outreach-draft.object';
import { RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/research.object';
import { RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/research-job.object';

export const RESEARCHER_ROLE_UNIVERSAL_IDENTIFIER =
  '9fa0341b-b526-4734-8901-778899001123';

const readWrite = {
  canReadObjectRecords: true,
  canUpdateObjectRecords: true,
  canSoftDeleteObjectRecords: true,
  canDestroyObjectRecords: false,
};

export default defineRole({
  universalIdentifier: RESEARCHER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Lead researcher',
  description:
    'Can research leads and edit drafts, but cannot destroy CRM records.',
  icon: 'IconMicroscope',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    {
      objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readWrite,
    },
    {
      objectUniversalIdentifier: RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readWrite,
    },
    {
      objectUniversalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readWrite,
    },
    {
      objectUniversalIdentifier: CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readWrite,
    },
    {
      objectUniversalIdentifier: LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readWrite,
    },
    {
      objectUniversalIdentifier: RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
      ...readWrite,
    },
  ],
});
