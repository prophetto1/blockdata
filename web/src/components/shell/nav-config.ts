import type { Icon } from '@tabler/icons-react';
import {
  IconApps,
  IconDatabase,
  IconFileCode,
  IconFolder,
  IconFolderPlus,
  IconGitBranch,
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
  IconEdit,
  IconClock,
  IconFileText,
  IconChartBar,
  IconArrowsShuffle,
  IconLock,
  IconClipboardList,
  IconScan,
  IconTransform,
  IconFileExport,
  IconRobot,
  IconActivity,
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
  routeAliases?: string[];
  pathTemplate?: string;
};

export const TOP_LEVEL_NAV: Array<NavItem | 'divider'> = [
  { label: 'Assets', icon: IconFolder, path: '/app/assets' },
  { label: 'Parse', icon: IconScan, path: '/app/parse' },
  { label: 'Extract', icon: IconWand, path: '/app/extract' },
  { label: 'Transform', icon: IconArrowsShuffle, path: '/app/transform' },
  { label: 'Convert', icon: IconFileExport, path: '/app/convert' },
  { label: 'RAG', icon: IconTransform, path: '/app/rag' },
  { label: 'Knowledge Bases', icon: IconDatabase, path: '/app/knowledge-bases' },
  { label: 'Agent Onboarding', icon: IconRobot, path: '/app/onboarding/agents' },
  'divider',
  { label: 'Flows', icon: IconFolderPlus, path: '/app/flows', drillId: 'flows' },
  'divider',
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
  { label: 'Load', icon: IconPlayerPlay, path: '/app/load' },
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
  'divider',
  { label: 'Workspace', icon: IconFileCode, path: '/app/workspace' },
  'divider',
  { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
  { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
  { label: 'Secrets', icon: IconLock, path: '/app/secrets' },
  { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
  'divider',
  { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
  { label: 'Logs', icon: IconFileText, path: '/app/logs' },
  'divider',
  { label: 'Settings', icon: IconSettings, path: '/app/settings', drillId: 'settings' },
];

export const PIPELINE_NAV: Array<NavItem | 'divider'> = [
  { label: 'Assets', icon: IconFolder, path: '/app/assets' },
  { label: 'Ingest', icon: IconScan, path: '/app/parse', drillId: 'ingest' },
  { label: 'Knowledge Bases', icon: IconDatabase, path: '/app/knowledge-bases' },
  'divider',
  { label: 'Build AI / Agents', icon: IconRobot, path: '/app/onboarding/agents', drillId: 'build-ai' },
  { label: 'Define Workflows', icon: IconFolderPlus, path: '/app/flows', drillId: 'flows' },
  'divider',
  { label: 'Connections', icon: IconPlugConnected, path: '/app/marketplace/integrations', drillId: 'connections' },
  { label: 'Workbench', icon: IconFileCode, path: '/app/workspace', drillId: 'workbench' },
  'divider',
  { label: 'Pipeline Services', icon: IconTransform, path: '/app/rag', drillId: 'pipeline-services' },
  { label: 'Observability', icon: IconActivity, path: '/app/observability', drillId: 'observability' },
  'divider',
  { label: 'Settings', icon: IconSettings, path: '/app/settings', drillId: 'settings' },
];

/* ---- Nav style toggle (classic vs pipeline) ---- */

export type NavStyle = 'classic' | 'pipeline';
const NAV_STYLE_KEY = 'blockdata.nav.style';

export function getNavStyle(): NavStyle {
  if (typeof window === 'undefined') return 'pipeline';
  const stored = window.localStorage.getItem(NAV_STYLE_KEY);
  return stored === 'classic' ? 'classic' : 'pipeline';
}

export function setNavStyle(style: NavStyle) {
  window.localStorage.setItem(NAV_STYLE_KEY, style);
}

export function getActiveNav(): Array<NavItem | 'divider'> {
  return getNavStyle() === 'pipeline' ? PIPELINE_NAV : TOP_LEVEL_NAV;
}

export const ALL_TOP_LEVEL_ITEMS: NavItem[] = [...TOP_LEVEL_NAV, ...PIPELINE_NAV].filter(
  (entry): entry is NavItem => entry !== 'divider',
);

const TOP_LEVEL_DRILL_BY_PATH = new Map(
  ALL_TOP_LEVEL_ITEMS
    .filter((item): item is NavItem & { drillId: string } => typeof item.drillId === 'string')
    .map((item) => [item.path, item.drillId]),
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
  ],
};

/* ---- Pipeline drill configs ---- */

const INGEST_DRILL: NavDrillConfig = {
  id: 'ingest',
  parentLabel: 'Ingest',
  parentPath: '/app/parse',
  routePrefix: '/app/__ingest__',
  sections: [
    {
      label: 'Ingest',
      items: [
        { label: 'Parse', icon: IconScan, path: '/app/parse' },
        { label: 'Extract', icon: IconWand, path: '/app/extract' },
        { label: 'Convert', icon: IconFileExport, path: '/app/convert' },
        { label: 'Database', icon: IconDatabase, path: '/app/database' },
        { label: 'Load', icon: IconPlayerPlay, path: '/app/load' },
        { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
      ],
    },
  ],
};

const BUILD_AI_DRILL: NavDrillConfig = {
  id: 'build-ai',
  parentLabel: 'Build AI / Agents',
  parentPath: '/app/onboarding/agents',
  routePrefix: '/app/__build-ai__',
  routeAliases: ['/app/onboarding/agents', '/app/agents'],
  sections: [
    {
      label: 'Build AI / Agents',
      items: [
        { label: 'Agent Onboarding', icon: IconRobot, path: '/app/onboarding/agents' },
        { label: 'Skills', icon: IconWand, path: '/app/skills' },
        { label: 'MCP', icon: IconPlugConnected, path: '/app/mcp-tools' },
      ],
    },
  ],
};

const CONNECTIONS_DRILL: NavDrillConfig = {
  id: 'connections',
  parentLabel: 'Connections',
  parentPath: '/app/marketplace/integrations',
  routePrefix: '/app/__connections__',
  sections: [
    {
      label: 'Connections',
      items: [
        { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
        { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
      ],
    },
  ],
};

const WORKBENCH_DRILL: NavDrillConfig = {
  id: 'workbench',
  parentLabel: 'Workbench',
  parentPath: '/app/workspace',
  routePrefix: '/app/__workbench__',
  sections: [
    {
      label: 'Workbench',
      items: [
        { label: 'Flows', icon: IconFolderPlus, path: '/app/flows' },
        { label: 'Transform', icon: IconArrowsShuffle, path: '/app/transform' },
        { label: 'Secrets', icon: IconLock, path: '/app/secrets' },
        { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
        { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
      ],
    },
  ],
};

const OBSERVABILITY_DRILL: NavDrillConfig = {
  id: 'observability',
  parentLabel: 'Observability',
  parentPath: '/app/observability',
  routePrefix: '/app/observability/',
  sections: [
    {
      label: 'Observability',
      items: [
        { label: 'Telemetry', icon: IconActivity, path: '/app/observability/telemetry' },
        { label: 'Traces', icon: IconArrowsShuffle, path: '/app/observability/traces' },
        { label: 'Logs', icon: IconFileText, path: '/app/observability/logs' },
      ],
    },
  ],
};

const PIPELINE_SERVICES_DRILL: NavDrillConfig = {
  id: 'pipeline-services',
  parentLabel: 'Pipeline Services',
  parentPath: '/app/rag',
  routePrefix: '/app/__pipeline-services__',
  sections: [
    {
      label: 'Pipeline Services',
      items: [
        { label: 'RAG', icon: IconTransform, path: '/app/rag' },
      ],
    },
  ],
};

export const DRILL_CONFIGS: NavDrillConfig[] = [FLOWS_DRILL, SETTINGS_DRILL, INGEST_DRILL, BUILD_AI_DRILL, CONNECTIONS_DRILL, WORKBENCH_DRILL, PIPELINE_SERVICES_DRILL, OBSERVABILITY_DRILL];

const DRILL_BY_ID = new Map(DRILL_CONFIGS.map((c) => [c.id, c]));

export function getDrillConfig(drillId: string): NavDrillConfig | undefined {
  return DRILL_BY_ID.get(drillId);
}

export function findDrillByRoute(pathname: string): NavDrillConfig | null {
  for (const config of DRILL_CONFIGS) {
    const routePrefixes = [config.routePrefix, ...(config.routeAliases ?? [])];
    if (routePrefixes.some((prefix) => pathname.startsWith(prefix))) {
      if (config.pathTemplate && pathname === config.parentPath) continue;
      return config;
    }
    if (!config.pathTemplate && pathname === config.parentPath) {
      return config;
    }
    // Check if any item in this drill owns the current route
    for (const section of config.sections) {
      for (const item of section.items) {
        const owningTopLevelDrillId = TOP_LEVEL_DRILL_BY_PATH.get(item.path);
        // Cross-links inside other drills should not steal a top-level drill landing page.
        if (pathname === item.path && owningTopLevelDrillId && owningTopLevelDrillId !== config.id) {
          continue;
        }
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
      { label: 'Workspace', icon: IconFileCode, path: '/app/workspace' },
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





