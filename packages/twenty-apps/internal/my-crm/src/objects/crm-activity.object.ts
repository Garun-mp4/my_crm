import { defineObject, FieldType } from 'twenty-sdk/define';

export const CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER =
  '3b5eaf74-9c28-4d63-b701-6e2f8a4c1d95';
export const CRM_ACTIVITY_NAME_FIELD_ID =
  '7de81296-3a04-4517-8689-990011223344';
export const CRM_ACTIVITY_LEAD_FIELD_ID =
  'f5069a71-b182-4390-8567-334455667788';

const option = (
  id: string,
  value: string,
  label: string,
  position: number,
  color: string,
) => ({ id, value, label, position, color });

export default defineObject({
  universalIdentifier: CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmActivity',
  namePlural: 'crmActivities',
  labelSingular: 'CRM activity',
  labelPlural: 'CRM activities',
  description: 'An auditable event in the lead research and outreach workflow.',
  icon: 'IconTimelineEvent',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: CRM_ACTIVITY_NAME_FIELD_ID,
  fields: [
    {
      universalIdentifier: CRM_ACTIVITY_NAME_FIELD_ID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Activity',
      icon: 'IconActivity',
      defaultValue: "''",
    },
    {
      universalIdentifier: '8ef9230a-a415-4623-b789-001122334455',
      type: FieldType.SELECT,
      name: 'type',
      label: 'Type',
      icon: 'IconCategory',
      isNullable: true,
      options: [
        option(
          '9fa0341b-b526-4734-8901-112233445566',
          'RESEARCH_CAPTURED',
          'Research captured',
          0,
          'blue',
        ),
        option(
          'a0b1452c-c637-4845-9012-223344556677',
          'DRAFT_CREATED',
          'Draft created',
          1,
          'purple',
        ),
        option(
          'b1c2563d-d748-4956-a123-334455667788',
          'DRAFT_APPROVED',
          'Draft approved',
          2,
          'green',
        ),
        option(
          'c2d3674e-e859-4067-b234-445566778899',
          'MESSAGE_SENT',
          'Message sent',
          3,
          'orange',
        ),
        option(
          'd3e4785f-f960-4178-8345-556677889900',
          'REPLY_RECEIVED',
          'Reply received',
          4,
          'green',
        ),
        option(
          'e4f58960-a071-4289-9456-667788990011',
          'STATUS_CHANGED',
          'Status changed',
          5,
          'gray',
        ),
        option(
          'f5069a71-b182-4390-9567-778899001122',
          'NOTE',
          'Note',
          6,
          'gray',
        ),
      ],
    },
    {
      universalIdentifier: '0671ab82-c293-4401-8678-889900112233',
      type: FieldType.RICH_TEXT,
      name: 'body',
      label: 'Details',
      icon: 'IconNotes',
      isNullable: true,
    },
    {
      universalIdentifier: '1782bc93-d304-4512-8789-990011223344',
      type: FieldType.DATE_TIME,
      name: 'occurredAt',
      label: 'Occurred at',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '2893cd04-e415-4623-9890-001122334455',
      type: FieldType.SELECT,
      name: 'actorRole',
      label: 'Actor',
      icon: 'IconUser',
      isNullable: true,
      options: [
        option(
          '39a4de15-f526-4734-a012-112233445566',
          'HUMAN',
          'Human',
          0,
          'green',
        ),
        option(
          '4ab5ef26-0637-4845-b123-223344556677',
          'AGENT',
          'Agent',
          1,
          'purple',
        ),
        option(
          '5bc6f037-1748-4956-8234-334455667788',
          'SYSTEM',
          'System',
          2,
          'gray',
        ),
      ],
    },
    {
      universalIdentifier: '6cd70148-2859-4067-9345-445566778899',
      type: FieldType.TEXT,
      name: 'actor',
      label: 'Actor identity',
      icon: 'IconFingerprint',
      isNullable: true,
    },
    {
      universalIdentifier: '7de81296-3a04-4517-8689-556677889900',
      type: FieldType.TEXT,
      name: 'source',
      label: 'Source',
      icon: 'IconSourceCode',
      isNullable: true,
    },
    {
      universalIdentifier: '8ef9230a-a415-4623-b789-667788990011',
      type: FieldType.TEXT,
      name: 'idempotencyKey',
      label: 'Idempotency key',
      icon: 'IconFingerprint',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: 'a0123b4c-5d6e-4f89-9012-445566778800',
      type: FieldType.TEXT,
      name: 'idempotencyPayloadHash',
      label: 'Idempotency payload hash',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '9fa0341b-b526-4734-8901-778899001122',
      type: FieldType.TEXT,
      name: 'externalMessageId',
      label: 'External message id',
      icon: 'IconHash',
      isNullable: true,
    },
  ],
});
