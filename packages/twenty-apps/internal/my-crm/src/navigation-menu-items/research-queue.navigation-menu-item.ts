import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER } from '../objects/research.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'a7b8c9d0-e1f2-4345-a678-445566778899',
  name: 'Research queue',
  icon: 'IconMicroscope',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: RESEARCH_OBJECT_UNIVERSAL_IDENTIFIER,
});
