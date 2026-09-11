import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  LEAD_OUTREACH_DRAFTS_FIELD_ID,
} from '../objects/lead.object';
import {
  OUTREACH_DRAFT_LEAD_FIELD_ID,
  OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/outreach-draft.object';

export default defineField({
  universalIdentifier: LEAD_OUTREACH_DRAFTS_FIELD_ID,
  objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'outreachDrafts',
  label: 'Outreach drafts',
  icon: 'IconMailFast',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: OUTREACH_DRAFT_LEAD_FIELD_ID,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
