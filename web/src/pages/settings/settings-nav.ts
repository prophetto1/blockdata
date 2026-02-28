import {
  IconBrain,
  IconCloud,
  IconPlug,
  IconUserCircle,
  IconServer,
  IconShieldLock,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export type SettingsTreeNode = {
  id: string;
  label: string;
  icon?: Icon;
  path?: string;
  children?: SettingsTreeNode[];
};

export const SETTINGS_TREE: SettingsTreeNode[] = [
  {
    id: 'profile',
    label: 'Account',
    icon: IconUserCircle,
    path: '/app/settings/profile',
  },
  {
    id: 'ai-api',
    label: 'AI API',
    icon: IconBrain,
    path: '/app/settings/ai',
    children: [
      { id: 'anthropic', label: 'Anthropic', path: '/app/settings/ai/anthropic' },
      { id: 'openai', label: 'OpenAI', path: '/app/settings/ai/openai' },
      { id: 'google', label: 'Google AI', path: '/app/settings/ai/google' },
      { id: 'custom', label: 'Custom', icon: IconServer, path: '/app/settings/ai/custom' },
    ],
  },
  {
    id: 'mcp',
    label: 'MCP',
    icon: IconPlug,
    path: '/app/settings/mcp',
  },
  {
    id: 'admin',
    label: 'Admin Controls',
    icon: IconShieldLock,
    path: '/app/settings/admin',
    children: [
      { id: 'admin-models', label: 'Models', path: '/app/settings/admin/models' },
      { id: 'admin-worker', label: 'Worker', path: '/app/settings/admin/worker' },
      { id: 'admin-upload', label: 'Upload', path: '/app/settings/admin/upload' },
      { id: 'admin-audit', label: 'Audit History', path: '/app/settings/admin/audit' },
    ],
  },
];

/** Flat lookup: find the tree node whose path matches a pathname */
export function findNodeByPath(pathname: string): SettingsTreeNode | null {
  for (const node of SETTINGS_TREE) {
    if (node.path && pathname.startsWith(node.path)) return node;
    if (node.children) {
      for (const child of node.children) {
        if (child.path && pathname.startsWith(child.path)) return child;
      }
    }
  }
  return null;
}

/** Provider icon lookup (used by the tree to show provider-specific icons) */
export const PROVIDER_ICONS: Record<string, Icon> = {
  anthropic: IconBrain,
  openai: IconCloud,
  google: IconCloud,
  custom: IconServer,
};
