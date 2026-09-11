import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  LEAD_RESEARCH_JOBS_FIELD_ID,
} from '../objects/lead.object';
import {
  RESEARCH_JOB_LEAD_FIELD_ID,
  RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/research-job.object';

export default defineField({
  universalIdentifier: LEAD_RESEARCH_JOBS_FIELD_ID,
  objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'researchJobs',
  label: 'Research jobs',
  icon: 'IconRefresh',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: RESEARCH_JOB_LEAD_FIELD_ID,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
