import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  LEAD_ACTIVITIES_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/lead.object';
import {
  CRM_ACTIVITY_LEAD_FIELD_ID,
  CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/crm-activity.object';

export default defineField({
  universalIdentifier: CRM_ACTIVITY_LEAD_FIELD_ID,
  objectUniversalIdentifier: CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lead',
  label: 'Lead',
  icon: 'IconTargetArrow',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LEAD_ACTIVITIES_FIELD_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'leadId',
  },
});
