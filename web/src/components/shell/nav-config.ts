import type { Icon } from '@tabler/icons-react';
import {
  IconDatabase,
  IconFolderPlus,
  IconSchema,
  IconSettings,
  IconUpload,
} from '@tabler/icons-react';

export type NavItem = {
  label: string;
  icon: Icon;
  path: string;
  children?: NavItem[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const GLOBAL_MENUS: NavItem[] = [
  { label: 'Flows', icon: IconFolderPlus, path: '/app/flows' },
  {
    label: 'Documents',
    icon: IconUpload,
    path: '/app/documents',
    children: [
      { label: 'Upload', icon: IconUpload, path: '/app/upload' },
      { label: 'Parse', icon: IconFolderPlus, path: '/app/projects' },
      { label: 'Extract', icon: IconSchema, path: '/app/extract' },
      { label: 'Transform', icon: IconSettings, path: '/app/transform' },
    ],
  },
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
];

export const NAV_GROUPS: NavGroup[] = [];
