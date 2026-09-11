import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/crm-activity.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'c9d0e1f2-a3b4-4567-8980-667788990011',
  name: 'Activity history',
  icon: 'IconTimelineEvent',
  position: 4,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CRM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER,
});
