import type { Icon } from '@tabler/icons-react';
import {
  IconBook,
  IconFolderPlus,
  IconHome2,
  IconPlug,
  IconSchema,
  IconSettings,
} from '@tabler/icons-react';

export type NavItem = {
  label: string;
  icon: Icon;
  path: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', icon: IconHome2, path: '/app' },
      { label: 'Projects', icon: IconFolderPlus, path: '/app/projects' },
      { label: 'Schemas', icon: IconSchema, path: '/app/schemas' },
      { label: 'Schema Library', icon: IconBook, path: '/app/schemas/templates' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Integrations', icon: IconPlug, path: '/app/integrations' },
      { label: 'Settings', icon: IconSettings, path: '/app/settings' },
    ],
  },
];
