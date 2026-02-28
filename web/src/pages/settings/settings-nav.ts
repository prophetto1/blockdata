import {
  IconBrain,
  IconPalette,
  IconPlug,
  IconSitemap,
  IconUserCircle,

  IconCpu,
  IconServer,
  IconUpload,
  IconClipboardList,
  IconRocket,
  IconListDetails,
  IconLayoutColumns,
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
      { id: 'ai-api', label: 'AI Providers', icon: IconBrain, path: '/app/settings/ai' },
      { id: 'model-roles', label: 'Model Roles', icon: IconSitemap, path: '/app/settings/model-roles' },
      { id: 'mcp', label: 'MCP Servers', icon: IconPlug, path: '/app/settings/mcp' },
      { id: 'admin-models', label: 'Runtime Policy', icon: IconCpu, path: '/app/settings/admin/models' },
      { id: 'admin-worker', label: 'Worker', icon: IconRocket, path: '/app/settings/admin/worker' },
      { id: 'admin-upload', label: 'Upload', icon: IconUpload, path: '/app/settings/admin/upload' },
      { id: 'admin-services', label: 'Services', icon: IconServer, path: '/app/settings/admin/services' },
      { id: 'admin-design', label: 'Design Standards', icon: IconPalette, path: '/app/settings/admin/design' },
      { id: 'admin-design-shell', label: 'App Shell Specs', icon: IconLayoutColumns, path: '/app/settings/admin/design-shell' },
      { id: 'admin-design-icons', label: 'Icon Inventory', icon: IconListDetails, path: '/app/settings/admin/design-icons' },
      { id: 'admin-audit', label: 'Audit History', icon: IconClipboardList, path: '/app/settings/admin/audit' },
    ],
  },
];

/** Flat list of all nav items for lookup */
export const ALL_NAV_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items);

/** Find the nav item whose path matches a pathname */
export function findNavItemByPath(pathname: string): SettingsNavItem | null {
  // Check longest paths first (admin children before admin root)
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length);
  for (const item of sorted) {
    if (pathname.startsWith(item.path)) return item;
  }
  return null;
}
