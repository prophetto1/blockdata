import type { Icon } from '@tabler/icons-react';
import {
  IconBrain,
  IconDatabase,
  IconFolderPlus,
  IconKey,
  IconPlug,
  IconSchema,
  IconSettings,
} from '@tabler/icons-react';
import { featureFlags } from '@/lib/featureFlags';

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
  { label: 'Transform', icon: IconSettings, path: '/app/schemas/advanced' },
  { label: 'Database', icon: IconDatabase, path: '/app/projects/list' },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Projects', icon: IconFolderPlus, path: '/app/projects' },
      { label: 'User Schemas', icon: IconSchema, path: '/app/schemas' },
    ],
  },
  {
    label: 'Automation',
    items: [
      ...(featureFlags.agentsConfigUI ? [{ label: 'Agents', icon: IconBrain, path: '/app/agents' }] : []),
      ...(featureFlags.mcpPlaceholderUI ? [{ label: 'MCP', icon: IconPlug, path: '/app/mcp' }] : []),
      ...(featureFlags.commandsUI ? [{ label: 'Commands', icon: IconKey, path: '/app/commands' }] : []),
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', icon: IconSettings, path: '/app/settings' },
    ],
  },
];
