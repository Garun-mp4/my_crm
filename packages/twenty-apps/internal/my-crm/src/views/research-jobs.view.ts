import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import {
  RESEARCH_JOB_ATTEMPT_COUNT_FIELD_ID,
  RESEARCH_JOB_LAST_ERROR_FIELD_ID,
  RESEARCH_JOB_NAME_FIELD_ID,
  RESEARCH_JOB_NEXT_RETRY_AT_FIELD_ID,
  RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  RESEARCH_JOB_STATUS_FIELD_ID,
} from '../objects/research-job.object';

export const RESEARCH_JOBS_VIEW_ID = 'e6f78091-a2b3-4c34-8567-7788990011ee';

export default defineView({
  universalIdentifier: RESEARCH_JOBS_VIEW_ID,
  name: 'Research jobs',
  objectUniversalIdentifier: RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconRefresh',
  position: 0,
  fields: [
    {
      universalIdentifier: 'f78091a2-b3c4-4d45-9678-8899001122ff',
      fieldMetadataUniversalIdentifier: RESEARCH_JOB_NAME_FIELD_ID,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: '8091a2b3-c4d5-4e56-8789-990011223300',
      fieldMetadataUniversalIdentifier: RESEARCH_JOB_STATUS_FIELD_ID,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: '91a2b3c4-d5e6-4f67-9890-001122334411',
      fieldMetadataUniversalIdentifier: RESEARCH_JOB_ATTEMPT_COUNT_FIELD_ID,
      position: 2,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: 'a2b3c4d5-e6f7-4090-a123-112233445522',
      fieldMetadataUniversalIdentifier: RESEARCH_JOB_NEXT_RETRY_AT_FIELD_ID,
      position: 3,
      isVisible: true,
      size: 190,
    },
    {
      universalIdentifier: 'b3c4d5e6-f780-4123-b234-223344556633',
      fieldMetadataUniversalIdentifier: RESEARCH_JOB_LAST_ERROR_FIELD_ID,
      position: 4,
      isVisible: true,
      size: 300,
    },
  ],
  filters: [
    {
      universalIdentifier: 'c4d5e6f7-8091-4a12-a345-334455667744',
      fieldMetadataUniversalIdentifier: RESEARCH_JOB_STATUS_FIELD_ID,
      operand: ViewFilterOperand.IS_NOT,
      value: ['CANCELLED'],
    },
  ],
});
