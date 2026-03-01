export const CATEGORY_IDS = [
  'models',
  'worker',
  'upload',
  'services',
  'integration-catalog',
  'integration-catalog-temp',
  'design',
  'design-shell',
  'design-icons',
  'audit',
  'instance-config',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type AdminSubTabGroup = {
  id: 'runtime' | 'operations' | 'temp' | 'design' | 'designs';
  label: string;
  tabs: Array<{ id: CategoryId; label: string }>;
};

export const ADMIN_SUBTAB_GROUPS: AdminSubTabGroup[] = [
  {
    id: 'runtime',
    label: 'Runtime',
    tabs: [
      { id: 'models', label: 'Runtime Policy' },
      { id: 'worker', label: 'Worker' },
      { id: 'upload', label: 'Upload' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    tabs: [
      { id: 'services', label: 'Services' },
      { id: 'integration-catalog', label: 'Integration Catalog' },
      { id: 'audit', label: 'Audit History' },
    ],
  },
  {
    id: 'temp',
    label: 'Temp',
    tabs: [
      { id: 'integration-catalog-temp', label: 'Integration Catalog - Temp' },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    tabs: [
      { id: 'design', label: 'Design Standards' },
      { id: 'design-shell', label: 'App Shell Specs' },
      { id: 'design-icons', label: 'Icon Inventory' },
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

