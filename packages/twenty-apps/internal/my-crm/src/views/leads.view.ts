import { defineView, ViewType } from 'twenty-sdk/define';

import {
  LEAD_NAME_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  LEAD_PRIORITY_FIELD_ID,
  LEAD_RESEARCH_STATUS_FIELD_ID,
  LEAD_SOURCE_FIELD_ID,
  LEAD_STATUS_FIELD_ID,
} from '../objects/lead.object';

export const LEADS_VIEW_ID = 'a1b2c3d4-e5f6-4789-8012-445566778899';

const viewField = (
  universalIdentifier: string,
  fieldMetadataUniversalIdentifier: string,
  position: number,
  size: number,
) => ({
  universalIdentifier,
  fieldMetadataUniversalIdentifier,
  position,
  isVisible: true,
  size,
});

export default defineView({
  universalIdentifier: LEADS_VIEW_ID,
  name: 'Lead desk',
  objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconTargetArrow',
  position: 0,
  fields: [
    viewField(
      'b2c3d4e5-f6a7-4890-9123-556677889900',
      LEAD_NAME_FIELD_ID,
      0,
      240,
    ),
    viewField(
      'c3d4e5f6-a7b8-4901-a234-667788990011',
      LEAD_STATUS_FIELD_ID,
      1,
      160,
    ),
    viewField(
      'd4e5f6a7-b8c9-4012-b345-778899001122',
      LEAD_PRIORITY_FIELD_ID,
      2,
      120,
    ),
    viewField(
      'e5f6a7b8-c9d0-4123-8456-889900112233',
      LEAD_SOURCE_FIELD_ID,
      3,
      140,
    ),
    viewField(
      'f6a7b8c9-d0e1-4234-9567-990011223344',
      LEAD_RESEARCH_STATUS_FIELD_ID,
      4,
      180,
    ),
  ],
});
