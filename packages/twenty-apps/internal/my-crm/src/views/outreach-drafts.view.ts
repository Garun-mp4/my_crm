import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import {
  OUTREACH_DRAFT_NAME_FIELD_ID,
  OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
  OUTREACH_DRAFT_STATUS_FIELD_ID,
} from '../objects/outreach-draft.object';

export const OUTREACH_DRAFTS_VIEW_ID = 'c3d4e5f6-a7b8-4901-a234-778899001122';

export default defineView({
  universalIdentifier: OUTREACH_DRAFTS_VIEW_ID,
  name: 'Outreach drafts',
  objectUniversalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconMailFast',
  position: 0,
  fields: [
    {
      universalIdentifier: 'd4e5f6a7-b8c9-4012-b345-990011223345',
      fieldMetadataUniversalIdentifier: OUTREACH_DRAFT_NAME_FIELD_ID,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: 'e5f6a7b8-c9d0-4123-8456-001122334455',
      fieldMetadataUniversalIdentifier: OUTREACH_DRAFT_STATUS_FIELD_ID,
      position: 1,
      isVisible: true,
      size: 180,
    },
  ],
  filters: [
    {
      universalIdentifier: 'f6a7b8c9-d0e1-4234-9567-112233445566',
      fieldMetadataUniversalIdentifier: OUTREACH_DRAFT_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS,
      value: ['NEEDS_REVIEW'],
    },
  ],
});
