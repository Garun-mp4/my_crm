import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  LEAD_RESEARCHES_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/lead.object';
import {
  RESEARCH_LEAD_FIELD_ID,
  RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/research.object';

export default defineField({
  universalIdentifier: RESEARCH_LEAD_FIELD_ID,
  objectUniversalIdentifier: RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lead',
  label: 'Lead',
  icon: 'IconTargetArrow',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LEAD_RESEARCHES_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'leadId',
  },
});
