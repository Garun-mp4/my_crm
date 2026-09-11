import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import {
  RESEARCH_NAME_FIELD_ID,
  RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
  RESEARCH_STATUS_FIELD_ID,
} from '../objects/research.object';

export const RESEARCH_QUEUE_VIEW_ID = 'b2c3d4e5-f6a7-4890-9123-667788990011';

export default defineView({
  universalIdentifier: RESEARCH_QUEUE_VIEW_ID,
  name: 'Research queue',
  objectUniversalIdentifier: RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMicroscope',
  position: 0,
  fields: [
    {
      universalIdentifier: 'c3d4e5f6-a7b8-4901-a234-778899001123',
      fieldMetadataUniversalIdentifier: RESEARCH_NAME_FIELD_ID,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: 'd4e5f6a7-b8c9-4012-b345-889900112233',
      fieldMetadataUniversalIdentifier: RESEARCH_STATUS_FIELD_ID,
      position: 1,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: 'e5f6a7b8-c9d0-4123-8456-990011223344',
      fieldMetadataUniversalIdentifier: RESEARCH_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['REVIEW_REQUIRED'],
    },
  ],
});
