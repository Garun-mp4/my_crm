import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  LEAD_RESEARCHES_FIELD_ID,
  LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/lead.object';
import {
  RESEARCH_LEAD_FIELD_ID,
  RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from '../objects/research.object';

export default defineField({
  universalIdentifier: LEAD_RESEARCHES_FIELD_ID,
  objectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'researchItems',
  label: 'Research evidence',
  icon: 'IconMicroscope',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: RESEARCH_LEAD_FIELD_ID,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
