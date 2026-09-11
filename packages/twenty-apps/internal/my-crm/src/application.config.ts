import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '5c2d8b32-99bf-4af7-9e0d-2f7cb1d0f7f1';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'My CRM',
  description:
    'A human-approved lead research desk for website prospecting and outreach preparation.',
});
