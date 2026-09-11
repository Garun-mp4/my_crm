import { defineView, ViewType } from 'twenty-sdk/define';

import { LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead-import-batch.object';

export default defineView({
  universalIdentifier: '7bc5e197-0819-4678-b234-334455667788',
  name: 'Import batches',
  objectUniversalIdentifier: LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconFileImport',
  position: 5,
  fields: [
    {
      universalIdentifier: '9de7a319-2a3b-4890-8456-556677889900',
      fieldMetadataUniversalIdentifier: 'c05b4d26-f708-4901-b234-667788990011',
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: 'aef8b420-3b4c-4901-8567-667788990011',
      fieldMetadataUniversalIdentifier: 'e27d6f48-192a-4123-9567-889900112233',
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: 'bf09c531-4c5d-4012-8678-778899001122',
      fieldMetadataUniversalIdentifier: 'f9e4d61f-8091-4890-a234-556677889900',
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: 'c01ad642-5d6e-4123-a789-889900112233',
      fieldMetadataUniversalIdentifier: '0a5e7a20-91a2-4901-8456-667788990011',
      position: 3,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: 'd12be753-6e7f-4234-b890-990011223344',
      fieldMetadataUniversalIdentifier: '1b6f8b31-a2b3-4012-9567-778899001122',
      position: 4,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: 'e23cf864-7f80-4345-8901-001122334455',
      fieldMetadataUniversalIdentifier: '2c709c42-b3c4-4123-a678-889900112233',
      position: 5,
      isVisible: true,
      size: 120,
    },
  ],
});
