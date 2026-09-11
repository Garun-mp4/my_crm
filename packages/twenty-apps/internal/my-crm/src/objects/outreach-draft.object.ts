import { defineObject, FieldType } from 'twenty-sdk/define';

export const OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER =
  '2a4d9e63-8b17-4c52-a6f0-3d7e1b9c5a28';
export const OUTREACH_DRAFT_NAME_FIELD_ID =
  '1789ab2c-3d4e-4f56-8012-223344556677';
export const OUTREACH_DRAFT_STATUS_FIELD_ID =
  '289abc3d-4e5f-4067-9123-334455667788';
export const OUTREACH_DRAFT_LEAD_FIELD_ID =
  'd3e4785f-f960-4178-8345-112233445566';

const option = (
  id: string,
  value: string,
  label: string,
  position: number,
  color: string,
) => ({ id, value, label, position, color });

export const OutreachDraftStatus = {
  DRAFT: 'DRAFT',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENT: 'SENT',
} as const;

export default defineObject({
  universalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'outreachDraft',
  namePlural: 'outreachDrafts',
  labelSingular: 'Outreach draft',
  labelPlural: 'Outreach drafts',
  description:
    'A human-reviewed message draft. Sending is always external and manual.',
  icon: 'IconMailFast',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: OUTREACH_DRAFT_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: OUTREACH_DRAFT_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Draft name',
      icon: 'IconFileText',
      defaultValue: "''",
    },
    {
      universalIdentifier: '39abcd4e-5f60-4178-a234-445566778899',
      type: FieldType.SELECT,
      name: 'channel',
      label: 'Channel',
      icon: 'IconSend',
      isNullable: true,
      options: [
        option(
          '4abcd5ef-6071-4289-b345-556677889900',
          'EMAIL',
          'Email',
          0,
          'blue',
        ),
        option(
          '5bcde6f0-7182-4390-8456-667788990011',
          'TELEGRAM',
          'Telegram',
          1,
          'blue',
        ),
        option(
          '6cdef701-8293-4401-9567-778899001122',
          'WHATSAPP',
          'WhatsApp',
          2,
          'green',
        ),
        option('7def8129-9304-4512-a678-889900112233', 'VK', 'VK', 3, 'purple'),
        option(
          '8ef9230a-a415-4623-b789-990011223344',
          'OTHER',
          'Other',
          4,
          'gray',
        ),
      ],
    },
    {
      universalIdentifier: '9fa0341b-b526-4734-8901-001122334455',
      type: FieldType.TEXT,
      name: 'subject',
      label: 'Subject',
      icon: 'IconTag',
      isNullable: true,
    },
    {
      universalIdentifier: 'a0b1452c-c637-4845-9012-112233445566',
      type: FieldType.RICH_TEXT,
      name: 'body',
      label: 'Message',
      icon: 'IconMessage',
      isNullable: true,
    },
    {
      universalIdentifier: OUTREACH_DRAFT_STATUS_FIELD_ID,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Approval status',
      icon: 'IconShieldCheck',
      defaultValue: `'${OutreachDraftStatus.DRAFT}'`,
      options: [
        option(
          'b1c2563d-d748-4956-a123-223344556677',
          'DRAFT',
          'Draft',
          0,
          'gray',
        ),
        option(
          'c2d3674e-e859-4067-b234-334455667788',
          'NEEDS_REVIEW',
          'Needs review',
          1,
          'orange',
        ),
        option(
          'd3e4785f-f960-4178-8345-445566778899',
          'APPROVED',
          'Approved',
          2,
          'green',
        ),
        option(
          'e4f58960-a071-4289-9456-556677889900',
          'REJECTED',
          'Rejected',
          3,
          'red',
        ),
        option(
          'f5069a71-b182-4390-9567-667788990011',
          'SENT',
          'Sent',
          4,
          'blue',
        ),
      ],
    },
    {
      universalIdentifier: '0671ab82-c293-4401-8678-778899001122',
      type: FieldType.DATE_TIME,
      name: 'generatedAt',
      label: 'Generated at',
      icon: 'IconSparkles',
      isNullable: true,
    },
    {
      universalIdentifier: '1782bc93-d304-4512-8789-889900112233',
      type: FieldType.DATE_TIME,
      name: 'approvedAt',
      label: 'Approved at',
      icon: 'IconClockCheck',
      isNullable: true,
    },
    {
      universalIdentifier: '2893cd04-e415-4623-9890-990011223344',
      type: FieldType.TEXT,
      name: 'approvedBy',
      label: 'Approved by',
      icon: 'IconUserCheck',
      isNullable: true,
    },
    {
      universalIdentifier: '39a4de15-f526-4734-a012-001122334455',
      type: FieldType.RICH_TEXT,
      name: 'sourceFacts',
      label: 'Source facts used',
      icon: 'IconNotes',
      isNullable: true,
    },
    {
      universalIdentifier: '4ab5ef26-0637-4845-b123-112233445566',
      type: FieldType.TEXT,
      name: 'idempotencyKey',
      label: 'Idempotency key',
      icon: 'IconFingerprint',
      isNullable: true,
    },
    {
      universalIdentifier: '5bc6f037-1748-4956-8234-223344556677',
      type: FieldType.DATE_TIME,
      name: 'sentAt',
      label: 'Sent at',
      icon: 'IconSend',
      isNullable: true,
    },
    {
      universalIdentifier: '6cd70148-2859-4067-9345-334455667788',
      type: FieldType.TEXT,
      name: 'failureReason',
      label: 'Failure reason',
      icon: 'IconAlertTriangle',
      isNullable: true,
    },
  ],
});
