import {
  IconKey,
  IconPalette,
  IconPlugConnected,
  IconServer,
  IconUserCircle,
  IconWand,
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
      { id: 'themes', label: 'Themes', icon: IconPalette, path: '/app/settings/themes' },
    ],
  },
  {
    id: 'admin',
    label: 'Operations',
    items: [
      { id: 'ai-providers', label: 'AI Providers', icon: IconKey, path: '/app/settings/ai' },
      { id: 'model-roles', label: 'Model Roles', icon: IconWand, path: '/app/settings/model-roles' },
      { id: 'mcp-servers', label: 'MCP Servers', icon: IconPlugConnected, path: '/app/settings/mcp' },
      { id: 'admin-services', label: 'Admin', icon: IconServer, path: '/app/settings/admin/instance-config' },
    ],
  },
];

/** Flat list of all nav items for lookup */
export const ALL_NAV_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items);
const NAV_ITEM_BY_ID = new Map(ALL_NAV_ITEMS.map((item) => [item.id, item] as const));

const ADMIN_PATH_ALIASES: Array<{ prefix: string; targetId: string }> = [
  { prefix: '/app/settings/admin/audit', targetId: 'admin-services' },
  { prefix: '/app/settings/admin/worker-config', targetId: 'admin-services' },
  { prefix: '/app/settings/admin/platform-config', targetId: 'admin-services' },
];

/** Find the nav item whose path matches a pathname */
export function findNavItemByPath(pathname: string): SettingsNavItem | null {
  // Check longest paths first (admin children before admin root)
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname === item.path || pathname.startsWith(item.path + '/')) return item;
  }
  for (const alias of ADMIN_PATH_ALIASES) {
    if (pathname !== alias.prefix && !pathname.startsWith(alias.prefix + '/')) continue;
    return NAV_ITEM_BY_ID.get(alias.targetId) ?? null;
  }
  return null;
}
