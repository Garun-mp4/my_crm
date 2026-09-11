import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  LEAD_ACTIVITIES_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/lead.object';
import {
  CRM_ACTIVITY_LEAD_FIELD_ID,
  CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/crm-activity.object';

export default defineField({
  universalIdentifier: LEAD_ACTIVITIES_FIELD_ID,
  objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'activities',
  label: 'Activity history',
  icon: 'IconTimelineEvent',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CRM_ACTIVITY_LEAD_FIELD_ID,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
