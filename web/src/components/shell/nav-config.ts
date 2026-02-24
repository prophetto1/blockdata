import type { Icon } from '@tabler/icons-react';
import {
  IconDatabase,
  IconFolderPlus,
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

export const GLOBAL_MENUS: NavItem[] = [
  { label: 'Parse', icon: IconFolderPlus, path: '/app/projects' },
  { label: 'Extract', icon: IconSchema, path: '/app/extract' },
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
  { label: 'Transform', icon: IconSettings, path: '/app/transform' },
  { label: 'Database', icon: IconDatabase, path: '/app/projects/list' },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Projects', icon: IconFolderPlus, path: '/app/projects' },
      { label: 'User Schemas', icon: IconSchema, path: '/app/schemas' },
      { label: 'Layout', icon: IconSchema, path: '/app/schemas/layout' },
    ],
  },
  {
    label: 'Experiments',
    items: [
      { label: 'Style Lab', icon: IconSettings, path: '/app/experiments/databricks' },
    ],
  },
];
