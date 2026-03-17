import type { Icon } from '@tabler/icons-react';
import {
  IconApps,
  IconCode,
  IconDatabase,
  IconFileCode,
  IconFolder,
  IconFolderPlus,
  IconGitBranch,
  IconKey,
  IconLayoutDashboard,
  IconPalette,
  IconPlayerPlay,
  IconPlugConnected,
  IconSchema,
  IconServer,
  IconSettings,
  IconTerminal2,
  IconTestPipe,
  IconTopologyRing3,
  IconUserCircle,
  IconWand,
  IconWorldCog,
  IconEdit,
  IconClock,
  IconFileText,
  IconChartBar,
  IconArrowsShuffle,
  IconLock,
  IconClipboardList,
  IconScan,
  IconTransform,
} from '@tabler/icons-react';

export type NavItem = {
  label: string;
  icon: Icon;
  path: string;
  drillId?: string;
  badge?: string;
  children?: NavItem[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type NavDrillSection = {
  label?: string;
  items: NavItem[];
};

export type NavDrillConfig = {
  id: string;
  parentLabel: string;
  parentPath: string;
  sections: NavDrillSection[];
  routePrefix: string;
  pathTemplate?: string;
};

export const TOP_LEVEL_NAV: Array<NavItem | 'divider'> = [
  { label: 'Assets', icon: IconFolder, path: '/app/assets' },
  { label: 'Parse', icon: IconScan, path: '/app/parse' },
  { label: 'Extract', icon: IconWand, path: '/app/extract' },
  { label: 'Transform', icon: IconArrowsShuffle, path: '/app/transform' },
  { label: 'RAG', icon: IconTransform, path: '/app/rag' },
  'divider',
  { label: 'Flows', icon: IconFolderPlus, path: '/app/flows', drillId: 'flows' },
  'divider',
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
  { label: 'Load', icon: IconPlayerPlay, path: '/app/load' },
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
  'divider',
  { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
  { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
  { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
  'divider',
  { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
  { label: 'Test-Integrations', icon: IconPlugConnected, path: '/app/superuser/test-integrations' },
  'divider',
  { label: 'Settings', icon: IconSettings, path: '/app/settings', drillId: 'settings' },
];

export const ALL_TOP_LEVEL_ITEMS: NavItem[] = TOP_LEVEL_NAV.filter(
  (entry): entry is NavItem => entry !== 'divider',
);

export const BOTTOM_RAIL_NAV: NavItem[] = [];

const FLOWS_DRILL: NavDrillConfig = {
  id: 'flows',
  parentLabel: 'Flows',
  parentPath: '/app/flows',
  routePrefix: '/app/flows/',
  pathTemplate: '/app/flows/:flowId/:tab',
  sections: [
    {
      label: 'Flow',
      items: [
        { label: 'Overview', icon: IconLayoutDashboard, path: 'overview' },
        { label: 'Topology', icon: IconTopologyRing3, path: 'topology' },
        { label: 'Executions', icon: IconPlayerPlay, path: 'executions' },
        { label: 'Edit', icon: IconEdit, path: 'edit' },
        { label: 'Revisions', icon: IconGitBranch, path: 'revisions' },
        { label: 'Triggers', icon: IconClock, path: 'triggers' },
        { label: 'Logs', icon: IconFileText, path: 'logs' },
        { label: 'Metrics', icon: IconChartBar, path: 'metrics' },
        { label: 'Dependencies', icon: IconArrowsShuffle, path: 'dependencies' },
        { label: 'Concurrency', icon: IconLock, path: 'concurrency' },
        { label: 'Audit Logs', icon: IconClipboardList, path: 'auditlogs' },
      ],
    },
  ],
};

const SETTINGS_DRILL: NavDrillConfig = {
  id: 'settings',
  parentLabel: 'Settings',
  parentPath: '/app/settings',
  routePrefix: '/app/settings',
  sections: [
    {
      label: 'General',
      items: [
        { label: 'Account', icon: IconUserCircle, path: '/app/settings/profile' },
        { label: 'Themes', icon: IconPalette, path: '/app/settings/themes' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'AI Providers', icon: IconKey, path: '/app/settings/ai' },
        { label: 'Model Roles', icon: IconWand, path: '/app/settings/model-roles' },
        { label: 'Connections', icon: IconDatabase, path: '/app/settings/connections' },
        { label: 'MCP Servers', icon: IconPlugConnected, path: '/app/settings/mcp' },
        { label: 'Admin', icon: IconServer, path: '/app/superuser/instance-config' },
      ],
    },
  ],
};

const SUPERUSER_DRILL: NavDrillConfig = {
  id: 'superuser',
  parentLabel: 'Superuser',
  parentPath: '/app/superuser',
  routePrefix: '/app/superuser',
  sections: [
    {
      label: 'Layouts',
      items: [
        { label: 'Layout 1', icon: IconFileCode, path: '/app/superuser/layout-1' },
        { label: 'Layout 2', icon: IconWorldCog, path: '/app/superuser/layout-2' },
        { label: 'Layout 3', icon: IconFileCode, path: '/app/superuser/layout-3' },
      ],
    },
    {
      items: [
        { label: 'ELT', icon: IconCode, path: '/app/elt' },
        { label: 'Docling', icon: IconSettings, path: '/app/superuser/parsers-docling' },
        { label: 'Instance Config', icon: IconServer, path: '/app/superuser/instance-config' },
        { label: 'Worker Config', icon: IconServer, path: '/app/superuser/worker-config' },
        { label: 'Audit History', icon: IconClipboardList, path: '/app/superuser/audit' },
        { label: 'API Endpoints', icon: IconCode, path: '/app/superuser/api-endpoints' },
        { label: 'Test-Integrations', icon: IconPlugConnected, path: '/app/superuser/test-integrations' },
      ],
    },
  ],
};

export const DRILL_CONFIGS: NavDrillConfig[] = [FLOWS_DRILL, SETTINGS_DRILL, SUPERUSER_DRILL];
export const ADMIN_NAV_ITEMS: NavItem[] = SUPERUSER_DRILL.sections.flatMap((s) => s.items);

const DRILL_BY_ID = new Map(DRILL_CONFIGS.map((c) => [c.id, c]));

export function getDrillConfig(drillId: string): NavDrillConfig | undefined {
  return DRILL_BY_ID.get(drillId);
}

export function findDrillByRoute(pathname: string): NavDrillConfig | null {
  for (const config of DRILL_CONFIGS) {
    if (pathname.startsWith(config.routePrefix)) {
      if (config.pathTemplate && pathname === config.parentPath) continue;
      return config;
    }
    if (!config.pathTemplate && pathname === config.parentPath) {
      return config;
    }
    // Check if any item in this drill owns the current route
    for (const section of config.sections) {
      for (const item of section.items) {
        if (pathname === item.path || pathname.startsWith(item.path + '/')) {
          return config;
        }
      }
    }
  }
  return null;
}

export function resolveFlowDrillPath(tabSlug: string, flowId: string): string {
  return `/app/flows/${encodeURIComponent(flowId)}/${tabSlug}`;
}

export const GLOBAL_MENUS: NavItem[] = [
  { label: 'Flows', icon: IconFolderPlus, path: '/app/flows' },
  { label: 'RAG', icon: IconTransform, path: '/app/rag' },
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
  {
    label: 'Catalog',
    items: [
      { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
      { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
    ],
  },
];

