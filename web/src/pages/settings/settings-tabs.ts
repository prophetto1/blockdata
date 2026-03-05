export const CATEGORY_IDS = [
  'services',
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
      { id: 'services', label: 'Services' },
      { id: 'audit', label: 'Audit History' },
    ],
  },
];

export function findAdminSubTabGroup(category: CategoryId | null): AdminSubTabGroup | null {
  if (!category) return null;
  return ADMIN_SUBTAB_GROUPS.find((group) => group.tabs.some((tab) => tab.id === category)) ?? null;
}

