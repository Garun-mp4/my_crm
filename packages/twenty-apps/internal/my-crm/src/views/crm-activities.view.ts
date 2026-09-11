import { defineView, ViewType } from 'twenty-sdk/define';

import {
  CRM_ACTIVITY_NAME_FIELD_ID,
  CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/crm-activity.object';

export const CRM_ACTIVITIES_VIEW_ID = 'd4e5f6a7-b8c9-4012-b345-990011223344';

export default defineView({
  universalIdentifier: CRM_ACTIVITIES_VIEW_ID,
  name: 'Activity history',
  objectUniversalIdentifier: CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconTimelineEvent',
  position: 0,
  fields: [
    {
      universalIdentifier: 'e5f6a7b8-c9d0-4123-8456-112233445566',
      fieldMetadataUniversalIdentifier: CRM_ACTIVITY_NAME_FIELD_ID,
      position: 0,
      isVisible: true,
      size: 280,
    },
  ],
});
