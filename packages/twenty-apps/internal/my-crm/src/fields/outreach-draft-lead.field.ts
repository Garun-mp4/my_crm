import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  LEAD_OUTREACH_DRAFTS_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/lead.object';
import {
  OUTREACH_DRAFT_LEAD_FIELD_ID,
  OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/outreach-draft.object';

export default defineField({
  universalIdentifier: OUTREACH_DRAFT_LEAD_FIELD_ID,
  objectUniversalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lead',
  label: 'Lead',
  icon: 'IconTargetArrow',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LEAD_OUTREACH_DRAFTS_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'leadId',
  },
});
