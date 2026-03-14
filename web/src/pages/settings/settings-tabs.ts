export const CATEGORY_IDS = [
  'instance-config',
  'worker-config',
  'audit',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export type AdminSubTabGroup = {
  id: 'operations';
  label: string;
  tabs: Array<{ id: CategoryId; label: string }>;
};

export const ADMIN_SUBTAB_GROUPS: AdminSubTabGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    tabs: [
      { id: 'instance-config', label: 'Instance Config' },
      { id: 'worker-config', label: 'Worker Config' },
      { id: 'audit', label: 'Audit History' },
    ],
  },
];

export function findAdminSubTabGroup(category: CategoryId | null): AdminSubTabGroup | null {
  if (!category) return null;
  return ADMIN_SUBTAB_GROUPS.find((group) => group.tabs.some((tab) => tab.id === category)) ?? null;
}

