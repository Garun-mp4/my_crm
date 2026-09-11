import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/outreach-draft.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'b8c9d0e1-f2a3-4456-b789-556677889900',
  name: 'Outreach drafts',
  icon: 'IconMailFast',
  position: 3,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: OUTREACH_DRAFT_OBJECT_UNIVERSAL_IDENTIFIER,
});
