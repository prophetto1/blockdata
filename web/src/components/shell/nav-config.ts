import type { Icon } from '@tabler/icons-react';
import {
  IconBook,
  IconBrain,
  IconFolderPlus,
  IconHome2,
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
      ...(featureFlags.agentsConfigUI ? [{ label: 'Agents', icon: IconBrain, path: '/app/agents' }] : []),
      ...(featureFlags.mcpPlaceholderUI ? [{ label: 'MCP', icon: IconPlug, path: '/app/mcp' }] : []),
      ...(featureFlags.commandsUI ? [{ label: 'Commands', icon: IconKey, path: '/app/commands' }] : []),
      { label: 'Settings', icon: IconSettings, path: '/app/settings' },
    ],
  },
];
