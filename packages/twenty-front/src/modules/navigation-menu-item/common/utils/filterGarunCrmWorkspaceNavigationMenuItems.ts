import { NavigationMenuItemType } from 'twenty-shared/types';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';

const GARUN_CRM_PAGE_LAYOUT_NAMES = new Set([
  'Research desk',
  'Исследовательский стол',
]);

const HIDDEN_FOLDER_NAMES = new Set(['Workflows', 'Рабочие процессы']);

const HIDDEN_OBJECT_NAMES = new Set([
  'company',
  'person',
  'opportunity',
  'task',
  'note',
  'dashboard',
  'workflow',
  'workflowRun',
  'workflowVersion',
  'rocket',
  'pet',
  'surveyResult',
  'employmentHistory',
  'petCareAgreement',
]);

type FilterGarunCrmWorkspaceNavigationMenuItemsArgs = {
  items: NavigationMenuItem[];
  objectMetadataItems: Pick<EnrichedObjectMetadataItem, 'id' | 'nameSingular'>[];
  isLayoutCustomizationModeEnabled: boolean;
};

const isGarunCrmWorkspace = (
  items: NavigationMenuItem[],
  objectMetadataItems: Pick<EnrichedObjectMetadataItem, 'id' | 'nameSingular'>[],
): boolean => {
  const hasResearchDesk = items.some(
    (item) =>
      item.type === NavigationMenuItemType.PAGE_LAYOUT &&
      GARUN_CRM_PAGE_LAYOUT_NAMES.has(item.name ?? ''),
  );

  const hasLeadObject = items.some(
    (item) =>
      item.type === NavigationMenuItemType.OBJECT &&
      objectMetadataItems.some(
        (objectMetadataItem) =>
          objectMetadataItem.id === item.targetObjectMetadataId &&
          objectMetadataItem.nameSingular === 'lead',
      ),
  );

  return hasResearchDesk && hasLeadObject;
};

const isHiddenGarunCrmNavigationMenuItem = (
  item: NavigationMenuItem,
  objectMetadataItems: Pick<EnrichedObjectMetadataItem, 'id' | 'nameSingular'>[],
): boolean => {
  if (
    item.type === NavigationMenuItemType.FOLDER &&
    HIDDEN_FOLDER_NAMES.has(item.name ?? '')
  ) {
    return true;
  }

  if (item.type !== NavigationMenuItemType.OBJECT) {
    return false;
  }

  const objectMetadataItem = objectMetadataItems.find(
    (candidate) => candidate.id === item.targetObjectMetadataId,
  );

  return objectMetadataItem
    ? HIDDEN_OBJECT_NAMES.has(objectMetadataItem.nameSingular)
    : false;
};

export const filterGarunCrmWorkspaceNavigationMenuItems = ({
  items,
  objectMetadataItems,
  isLayoutCustomizationModeEnabled,
}: FilterGarunCrmWorkspaceNavigationMenuItemsArgs): NavigationMenuItem[] => {
  if (
    isLayoutCustomizationModeEnabled ||
    !isGarunCrmWorkspace(items, objectMetadataItems)
  ) {
    return items;
  }

  return items.filter(
    (item) =>
      !isHiddenGarunCrmNavigationMenuItem(item, objectMetadataItems),
  );
};
