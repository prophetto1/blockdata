export const CATEGORY_IDS = [
  'services',
  'platform-config',
  'integration-catalog',
  'grid-test',
  'audit',
  'instance-config',
  'api-playground',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type AdminSubTabGroup = {
  id: 'operations' | 'designs';
  label: string;
  tabs: Array<{ id: CategoryId; label: string }>;
};

export const ADMIN_SUBTAB_GROUPS: AdminSubTabGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    tabs: [
      { id: 'services', label: 'Services' },
      { id: 'platform-config', label: 'Platform' },
      { id: 'integration-catalog', label: 'Integration Catalog' },
      { id: 'grid-test', label: 'Grid Test' },
      { id: 'audit', label: 'Audit History' },
      { id: 'api-playground', label: 'API Playground' },
    ],
  },
  {
    id: 'designs',
    label: 'Designs',
    tabs: [
      { id: 'instance-config', label: 'Instance Config' },
    ],
  },
];

export function findAdminSubTabGroup(category: CategoryId | null): AdminSubTabGroup | null {
  if (!category) return null;
  return ADMIN_SUBTAB_GROUPS.find((group) => group.tabs.some((tab) => tab.id === category)) ?? null;
}

