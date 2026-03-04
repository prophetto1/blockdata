import type { Icon } from '@tabler/icons-react';
import {
  IconCode,
  IconDatabase,
  IconPlug,
  IconFolderPlus,
  IconSchema,
  IconTerminal2,
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
  { label: 'ELT', icon: IconCode, path: '/app/elt' },
  { label: 'Integrations', icon: IconPlug, path: '/app/integrations' },
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Editor',
    items: [
      { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
      { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
    ],
  },
];
