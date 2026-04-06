import {
  IconDatabase,
  IconKey,
  IconLock,
  IconPalette,
  IconPlugConnected,
  IconUserCircle,
  IconWand,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { blockdataAiProvidersPath } from '@/lib/aiProviderRoutes';

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
        { id: 'ai-providers', label: 'AI Providers', icon: IconKey, path: blockdataAiProvidersPath() },
        { id: 'model-roles', label: 'Model Roles', icon: IconWand, path: '/app/settings/model-roles' },
        { id: 'mcp-servers', label: 'MCP Servers', icon: IconPlugConnected, path: '/app/settings/mcp' },
        { id: 'connections', label: 'Connections', icon: IconDatabase, path: '/app/settings/connections' },
        { id: 'secrets', label: 'Secrets', icon: IconLock, path: '/app/settings/secrets' },
      ],
    },
];

/** Flat list of all nav items for lookup */
export const ALL_NAV_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items);

/** Find the nav item whose path matches a pathname */
export function findNavItemByPath(pathname: string): SettingsNavItem | null {
  // Check longest paths first so more specific settings pages win.
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname === item.path || pathname.startsWith(item.path + '/')) return item;
  }
  return null;
}
