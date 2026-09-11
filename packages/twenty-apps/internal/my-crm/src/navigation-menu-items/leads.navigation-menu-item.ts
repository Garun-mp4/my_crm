import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/lead.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'f6a7b8c9-d0e1-4234-9567-334455667788',
  name: 'Leads',
  icon: 'IconTargetArrow',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
});
