import { PageLayoutTabLayoutMode, definePageLayout } from 'twenty-sdk/define';

import { RESEARCH_DESK_FRONT_COMPONENT_ID } from '../front-components/research-desk';

export const RESEARCH_DESK_PAGE_LAYOUT_ID =
  '5bc6f037-1748-4956-8234-334455667789';

export default definePageLayout({
  universalIdentifier: RESEARCH_DESK_PAGE_LAYOUT_ID,
  name: 'Research desk',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: '6cd70148-2859-4067-9345-445566778890',
      title: 'Research desk',
      position: 0,
      icon: 'IconLayoutDashboard',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: '7de81296-3a04-4517-8689-556677889901',
          title: 'Research desk',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: RESEARCH_DESK_FRONT_COMPONENT_ID,
          },
        },
      ],
    },
  ],
});
