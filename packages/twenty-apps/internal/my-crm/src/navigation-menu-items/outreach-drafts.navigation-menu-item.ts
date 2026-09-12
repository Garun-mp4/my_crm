import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/outreach-draft.object';

import { ADMINISTRATION_FOLDER_UNIVERSAL_IDENTIFIER } from './administration.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'b8c9d0e1-f2a3-4456-b789-556677889900',
  name: 'Outreach drafts',
  icon: 'IconMailFast',
  position: 0,
  folderUniversalIdentifier: ADMINISTRATION_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
});
