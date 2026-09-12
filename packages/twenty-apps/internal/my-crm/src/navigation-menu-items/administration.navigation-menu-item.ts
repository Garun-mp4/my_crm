import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export const ADMINISTRATION_FOLDER_UNIVERSAL_IDENTIFIER =
  '0f4e8d12-6a31-4c79-9b58-2d6e1a3f7c40';

export default defineNavigationMenuItem({
  universalIdentifier: ADMINISTRATION_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Administration',
  icon: 'IconSettings',
  position: 3,
});
