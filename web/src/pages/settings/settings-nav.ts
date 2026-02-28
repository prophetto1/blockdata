import {
  IconBrain,
  IconPalette,
  IconUserCircle,
  IconCpu,
  IconServer,
  IconPlug,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export type SettingsNavItem = {
  id: string;
  label: string;
  icon?: Icon;
  path: string;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: 'general',
    label: 'General',
    items: [
      { id: 'profile', label: 'Account', icon: IconUserCircle, path: '/app/settings/profile' },
    ],
  },
  {
    id: 'admin',
    label: 'Superuser',
    items: [
      { id: 'ai-api', label: 'AI Stack', icon: IconBrain, path: '/app/settings/ai' },
      { id: 'admin-models', label: 'Runtime Policy', icon: IconCpu, path: '/app/settings/admin/models' },
      { id: 'admin-services', label: 'Services', icon: IconServer, path: '/app/settings/admin/services' },
      { id: 'admin-integrations', label: 'Integration Catalog', icon: IconPlug, path: '/app/settings/admin/integration-catalog' },
      { id: 'admin-design', label: 'Design Standards', icon: IconPalette, path: '/app/settings/admin/design' },
    ],
  },
];

/** Flat list of all nav items for lookup */
export const ALL_NAV_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items);
const NAV_ITEM_BY_ID = new Map(ALL_NAV_ITEMS.map((item) => [item.id, item] as const));

const ADMIN_PATH_ALIASES: Array<{ prefix: string; targetId: string }> = [
  { prefix: '/app/settings/model-roles', targetId: 'ai-api' },
  { prefix: '/app/settings/mcp', targetId: 'ai-api' },
  { prefix: '/app/settings/admin/worker', targetId: 'admin-models' },
  { prefix: '/app/settings/admin/upload', targetId: 'admin-models' },
  { prefix: '/app/settings/admin/audit', targetId: 'admin-services' },
  { prefix: '/app/settings/admin/integration-catalog', targetId: 'admin-integrations' },
  { prefix: '/app/settings/admin/design-shell', targetId: 'admin-design' },
  { prefix: '/app/settings/admin/design-icons', targetId: 'admin-design' },
];

/** Find the nav item whose path matches a pathname */
export function findNavItemByPath(pathname: string): SettingsNavItem | null {
  // Check longest paths first (admin children before admin root)
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname.startsWith(item.path)) return item;
  }
  for (const alias of ADMIN_PATH_ALIASES) {
    if (!pathname.startsWith(alias.prefix)) continue;
    return NAV_ITEM_BY_ID.get(alias.targetId) ?? null;
  }
  return null;
}
