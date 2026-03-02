import type { Icon } from '@tabler/icons-react';
import {
  IconCode,
  IconDatabase,
  IconPlug,
  IconFolderPlus,
  IconSchema,
  IconServer,
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
  { label: 'Services', icon: IconServer, path: '/app/services' },
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
];

export const NAV_GROUPS: NavGroup[] = [];
