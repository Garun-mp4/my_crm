import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead-import-batch.object';

import { ADMINISTRATION_FOLDER_UNIVERSAL_IDENTIFIER } from './administration.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '8cd6f208-192a-4789-8345-445566778899',
  name: 'Import batches',
  icon: 'IconFileImport',
  position: 2,
  folderUniversalIdentifier: ADMINISTRATION_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: LEAD_IMPORT_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
});
