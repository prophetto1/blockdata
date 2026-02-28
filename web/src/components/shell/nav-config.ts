import type { Icon } from '@tabler/icons-react';
import {
  IconCode,
  IconDatabase,
  IconPencil,
  IconPlug,
  IconFolderPlus,
  IconSchema,
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
  { label: 'Editor', icon: IconPencil, path: '/app/editor' },
  { label: 'Integrations', icon: IconPlug, path: '/app/integrations' },
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
];

export const NAV_GROUPS: NavGroup[] = [];
