import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { RESEARCH_DESK_PAGE_LAYOUT_ID } from '../page-layouts/research-desk.page-layout';

export default defineNavigationMenuItem({
  universalIdentifier: 'e5f6a7b8-c9d0-4123-8456-223344556677',
  name: 'Research desk',
  icon: 'IconLayoutDashboard',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: RESEARCH_DESK_PAGE_LAYOUT_ID,
});
