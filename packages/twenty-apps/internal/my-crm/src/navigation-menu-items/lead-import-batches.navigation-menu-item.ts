import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead-import-batch.object';

export default defineNavigationMenuItem({
  universalIdentifier: '8cd6f208-192a-4789-8345-445566778899',
  name: 'Import batches',
  icon: 'IconFileImport',
  position: 5,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
});
