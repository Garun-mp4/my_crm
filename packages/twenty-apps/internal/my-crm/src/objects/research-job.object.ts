import { defineObject, FieldType } from 'twenty-sdk/define';

export const RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER =
  'c8d9e0f1-2a3b-4c56-8d70-112233445577';
export const RESEARCH_JOB_NAME_FIELD_ID =
  'd9e0f1a2-3b4c-4d67-9e81-223344556688';
export const RESEARCH_JOB_STATUS_FIELD_ID =
  'e0f1a2b3-4c5d-4e78-8f92-334455667799';
export const RESEARCH_JOB_ATTEMPT_COUNT_FIELD_ID =
  'f78091a2-b3c4-4567-8789-001122334466';
export const RESEARCH_JOB_LAST_ERROR_FIELD_ID =
  'c4d5e6f7-8091-4a12-a345-5566778899bb';
export const RESEARCH_JOB_NEXT_RETRY_AT_FIELD_ID =
  'd5e6f780-91a2-4b23-b456-6677889900cc';
export const RESEARCH_JOB_LEAD_FIELD_ID =
  'a6c7d8e9-f012-4a34-8567-889900112244';

const option = (
  id: string,
  value: string,
  label: string,
  position: number,
  color: string,
) => ({ id, value, label, position, color });

export const ResearchJobStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export default defineObject({
  universalIdentifier: RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'researchJob',
  namePlural: 'researchJobs',
  labelSingular: 'Research job',
  labelPlural: 'Research jobs',
  description:
    'A retryable, auditable local or provider-backed research execution.',
  icon: 'IconRefresh',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: RESEARCH_JOB_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: RESEARCH_JOB_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Job name',
      icon: 'IconFileSearch',
      defaultValue: "''",
    },
    {
      universalIdentifier: RESEARCH_JOB_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Job status',
      icon: 'IconProgressCheck',
      defaultValue: `'${ResearchJobStatus.QUEUED}'`,
      options: [
        option(
          'f1a2b3c4-5d6e-4f89-9012-4455667788aa',
          'QUEUED',
          'Queued',
          0,
          'blue',
        ),
        option(
          'a2b3c4d5-6e7f-4090-a123-5566778899bb',
          'RUNNING',
          'Running',
          1,
          'purple',
        ),
        option(
          'b3c4d5e6-7f80-4123-b234-6677889900cc',
          'SUCCEEDED',
          'Succeeded',
          2,
          'green',
        ),
        option(
          'c4d5e6f7-8091-4234-8345-7788990011dd',
          'FAILED',
          'Failed',
          3,
          'red',
        ),
        option(
          'd5e6f780-91a2-4345-8456-8899001122ee',
          'CANCELLED',
          'Cancelled',
          4,
          'gray',
        ),
      ],
    },
    {
      universalIdentifier: 'e6f78091-a2b3-4456-9567-9900112233ff',
      type: FieldType.TEXT,
      name: 'provider',
      label: 'Provider',
      icon: 'IconPlugConnected',
      defaultValue: "'LOCAL_FIXTURE'",
    },
    {
      universalIdentifier: 'f78091a2-b3c4-4567-8789-001122334466',
      type: FieldType.NUMBER,
      name: 'attemptCount',
      label: 'Attempts',
      icon: 'IconRepeat',
      defaultValue: 0,
    },
    {
      universalIdentifier: '8091a2b3-c4d5-4678-9890-112233445577',
      type: FieldType.NUMBER,
      name: 'maxAttempts',
      label: 'Maximum attempts',
      icon: 'IconTimelineEventExclamation',
      defaultValue: 3,
    },
    {
      universalIdentifier: '91a2b3c4-d5e6-4789-a012-223344556688',
      type: FieldType.BOOLEAN,
      name: 'retryable',
      label: 'Retryable',
      icon: 'IconRotateClockwise',
      defaultValue: true,
    },
    {
      universalIdentifier: 'a2b3c4d5-e6f7-4890-b123-334455667799',
      type: FieldType.LINKS,
      name: 'sourceUrl',
      label: 'Source URL',
      icon: 'IconExternalLink',
      isNullable: true,
    },
    {
      universalIdentifier: 'b3c4d5e6-f780-4901-9345-4455667788aa',
      type: FieldType.RAW_JSON,
      name: 'inputPayload',
      label: 'Adapter input',
      icon: 'IconBraces',
      isNullable: true,
    },
    {
      universalIdentifier: 'c4d5e6f7-8091-4a12-a345-5566778899bb',
      type: FieldType.RICH_TEXT,
      name: 'lastError',
      label: 'Last error',
      icon: 'IconAlertTriangle',
      isNullable: true,
    },
    {
      universalIdentifier: 'd5e6f780-91a2-4b23-b456-6677889900cc',
      type: FieldType.DATE_TIME,
      name: 'nextRetryAt',
      label: 'Next retry at',
      icon: 'IconClockPause',
      isNullable: true,
    },
    {
      universalIdentifier: 'e6f78091-a2b3-4c34-8567-7788990011dd',
      type: FieldType.TEXT,
      name: 'correlationId',
      label: 'Correlation ID',
      icon: 'IconFingerprint',
      isNullable: true,
    },
    {
      universalIdentifier: 'f78091a2-b3c4-4d45-9678-8899001122ee',
      type: FieldType.TEXT,
      name: 'idempotencyKey',
      label: 'Idempotency key',
      icon: 'IconKey',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: '8091a2b3-c4d5-4e56-8789-9900112233ff',
      type: FieldType.TEXT,
      name: 'resultResearchId',
      label: 'Result research ID',
      icon: 'IconLink',
      isNullable: true,
    },
    {
      universalIdentifier: '91a2b3c4-d5e6-4f67-9890-001122334400',
      type: FieldType.DATE_TIME,
      name: 'queuedAt',
      label: 'Queued at',
      icon: 'IconClockPlus',
      isNullable: true,
    },
    {
      universalIdentifier: 'a2b3c4d5-e6f7-4090-a123-112233445511',
      type: FieldType.DATE_TIME,
      name: 'startedAt',
      label: 'Started at',
      icon: 'IconPlayerPlay',
      isNullable: true,
    },
    {
      universalIdentifier: 'b3c4d5e6-f780-4123-b234-223344556622',
      type: FieldType.DATE_TIME,
      name: 'completedAt',
      label: 'Completed at',
      icon: 'IconCircleCheck',
      isNullable: true,
    },
  ],
});
