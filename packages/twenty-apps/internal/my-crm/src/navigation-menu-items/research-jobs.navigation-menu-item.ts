import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/research-job.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'd5e6f780-91a2-4b23-b456-445566778899',
  name: 'Research jobs',
  icon: 'IconRefresh',
  position: 6,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: RESEARCH_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
});
