import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  LEAD_RESEARCH_JOBS_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/lead.object';
import {
  RESEARCH_JOB_LEAD_FIELD_ID,
  RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/research-job.object';

export default defineField({
  universalIdentifier: RESEARCH_JOB_LEAD_FIELD_ID,
  objectUniversalIdentifier: RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lead',
  label: 'Lead',
  icon: 'IconTargetArrow',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LEAD_RESEARCH_JOBS_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'leadId',
  },
});
