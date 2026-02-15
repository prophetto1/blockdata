import type { Icon } from '@tabler/icons-react';
import {
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
    label: 'Track A',
    items: [
      { label: 'Workspace', icon: IconHome2, path: '/app' },
      { label: 'Projects', icon: IconFolderPlus, path: '/app/projects' },
      { label: 'User Schemas', icon: IconSchema, path: '/app/schemas' },
      { label: 'Schema Library', icon: IconSchema, path: '/app/schemas/templates' },
    ],
  },
  {
    label: 'Track B',
    items: [
      { label: 'Workspace', icon: IconFolderPlus, path: '/app/track-b/workspace' },
      { label: 'Pipeline', icon: IconSchema, path: '/app/track-b/pipeline' },
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
