import { describe, expect, it } from 'vitest';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

import { filterGarunCrmWorkspaceNavigationMenuItems } from '@/navigation-menu-item/common/utils/filterGarunCrmWorkspaceNavigationMenuItems';

const item = (input: {
  type: NavigationMenuItemType;
  name?: string;
  targetObjectMetadataId?: string;
}): NavigationMenuItem =>
  ({
    id: `${input.name ?? input.type}-id`,
    type: input.type,
    name: input.name ?? null,
    targetObjectMetadataId: input.targetObjectMetadataId ?? null,
  }) as NavigationMenuItem;

describe('filterGarunCrmWorkspaceNavigationMenuItems', () => {
  const items = [
    item({ type: NavigationMenuItemType.PAGE_LAYOUT, name: 'Research desk' }),
    item({
      type: NavigationMenuItemType.OBJECT,
      name: 'Leads',
      targetObjectMetadataId: 'lead-id',
    }),
    item({
      type: NavigationMenuItemType.OBJECT,
      targetObjectMetadataId: 'company-id',
    }),
    item({ type: NavigationMenuItemType.FOLDER, name: 'Workflows' }),
    item({ type: NavigationMenuItemType.OBJECT, name: 'A custom future item' }),
  ];

  it('hides the standard and test navigation items in the normal workspace view', () => {
    const result = filterGarunCrmWorkspaceNavigationMenuItems({
      items,
      objectMetadataItems: [
        { id: 'lead-id', nameSingular: 'lead' },
        { id: 'company-id', nameSingular: 'company' },
      ],
      isLayoutCustomizationModeEnabled: false,
    });

    expect(result.map((navigationMenuItem) => navigationMenuItem.name)).toEqual([
      'Research desk',
      'Leads',
      'A custom future item',
    ]);
  });

  it('keeps all items available while the sidebar is being customized', () => {
    const result = filterGarunCrmWorkspaceNavigationMenuItems({
      items,
      objectMetadataItems: [
        { id: 'lead-id', nameSingular: 'lead' },
        { id: 'company-id', nameSingular: 'company' },
      ],
      isLayoutCustomizationModeEnabled: true,
    });

    expect(result).toBe(items);
  });
});
