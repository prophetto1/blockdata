import type { Icon } from '@tabler/icons-react';
import {
  IconActivity,
  IconApps,
  IconArrowsShuffle,
  IconChartBar,
  IconClipboardList,
  IconClock,
  IconDatabase,
  IconEdit,
  IconFileExport,
  IconFileText,
  IconFolder,
  IconFolderPlus,
  IconGitBranch,
  IconLayoutDashboard,
  IconLock,
  IconPalette,
  IconPlayerPlay,
  IconPlugConnected,
  IconRobot,
  IconScan,
  IconSchema,
  IconServer,
  IconSettings,
  IconTerminal2,
  IconTestPipe,
  IconTopologyRing3,
  IconTransform,
  IconUserCircle,
  IconWand,
} from '@tabler/icons-react';

export type NavItem = {
  label: string;
  icon: Icon;
  path: string;
  drillId?: string;
  badge?: string;
  children?: NavItem[];
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

type SharedNavSection = {
  id: string;
  label: string;
  icon: Icon;
  parentPath: string;
  routePrefix: string;
  routeAliases?: string[];
  items: NavItem[];
};

export function isNavItem(entry: NavItem | 'divider'): entry is NavItem {
  return entry !== 'divider';
}

function createStaticDrill(section: SharedNavSection): NavDrillConfig {
  return {
    id: section.id,
    parentLabel: section.label,
    parentPath: section.parentPath,
    routePrefix: section.routePrefix,
    routeAliases: section.routeAliases,
    sections: [{ items: section.items }],
  };
}

function dedupeNavItems(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  const deduped: NavItem[] = [];

  for (const item of items) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    deduped.push(item);
  }

  return deduped;
}

const ASSETS_ITEM: NavItem = { label: 'Assets', icon: IconFolder, path: '/app/assets' };
const FLOWS_ITEM: NavItem = { label: 'Flows', icon: IconFolderPlus, path: '/app/flows', drillId: 'flows' };


const INGEST_SECTION: SharedNavSection = {
  id: 'ingest',
  label: 'Ingest',
  icon: IconScan,
  parentPath: '/app/parse',
  routePrefix: '/app/parse',
  routeAliases: ['/app/transform'],
  items: [
    { label: 'Parse', icon: IconScan, path: '/app/parse' },
    { label: 'Extract', icon: IconWand, path: '/app/extract' },
    { label: 'Convert', icon: IconFileExport, path: '/app/convert' },
    { label: 'Transform', icon: IconArrowsShuffle, path: '/app/transform' },
    { label: 'Database', icon: IconDatabase, path: '/app/database' },
    { label: 'Load', icon: IconPlayerPlay, path: '/app/load' },
    { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
  ],
};

const BUILD_AI_SECTION: SharedNavSection = {
  id: 'build-ai',
  label: 'Build AI / Agents',
  icon: IconRobot,
  parentPath: '/app/onboarding/agents',
  routePrefix: '/app/onboarding/agents',
  routeAliases: ['/app/agents'],
  items: [
    { label: 'Agent Onboarding', icon: IconRobot, path: '/app/onboarding/agents' },
    { label: 'Skills', icon: IconWand, path: '/app/skills' },
    { label: 'MCP', icon: IconPlugConnected, path: '/app/mcp-tools' },
  ],
};

const CONNECTIONS_SECTION: SharedNavSection = {
  id: 'connections',
  label: 'Connections',
  icon: IconPlugConnected,
  parentPath: '/app/marketplace/integrations',
  routePrefix: '/app/marketplace/integrations',
  routeAliases: ['/app/api-editor'],
  items: [
    { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
    { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
    { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
  ],
};

const PIPELINE_SERVICES_SECTION: SharedNavSection = {
  id: 'pipeline-services',
  label: 'Pipeline Services',
  icon: IconTransform,
  parentPath: '/app/pipeline-services',
  routePrefix: '/app/pipeline-services',
  routeAliases: ['/app/rag', '/app/knowledge-bases'],
  items: [
    { label: 'Overview', icon: IconLayoutDashboard, path: '/app/pipeline-services' },
    { label: 'Knowledge Bases', icon: IconDatabase, path: '/app/pipeline-services/knowledge-bases' },
    { label: 'Index Builder', icon: IconTransform, path: '/app/pipeline-services/index-builder' },
  ],
};

const TESTS_SECTION: SharedNavSection = {
  id: 'tests',
  label: 'Tests',
  icon: IconTestPipe,
  parentPath: '/app/tests',
  routePrefix: '/app/tests',
  items: [
    { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
  ],
};

const OBSERVABILITY_SECTION: SharedNavSection = {
  id: 'observability',
  label: 'Observability',
  icon: IconActivity,
  parentPath: '/app/observability',
  routePrefix: '/app/observability',
  items: [
    { label: 'Telemetry', icon: IconActivity, path: '/app/observability/telemetry' },
    { label: 'Traces', icon: IconArrowsShuffle, path: '/app/observability/traces' },
    { label: 'Logs', icon: IconFileText, path: '/app/logs' },
  ],
};

const SETTINGS_SECTION: SharedNavSection = {
  id: 'settings',
  label: 'Settings',
  icon: IconSettings,
  parentPath: '/app/settings',
  routePrefix: '/app/settings',
  items: [
    { label: 'Account', icon: IconUserCircle, path: '/app/settings/profile' },
    { label: 'Themes', icon: IconPalette, path: '/app/settings/themes' },
    { label: 'Secrets', icon: IconLock, path: '/app/settings/secrets' },
  ],
};

export const SHARED_STATIC_SECTIONS: SharedNavSection[] = [
  INGEST_SECTION,
  BUILD_AI_SECTION,
  CONNECTIONS_SECTION,
  PIPELINE_SERVICES_SECTION,
  TESTS_SECTION,
  OBSERVABILITY_SECTION,
  SETTINGS_SECTION,
];

export const PIPELINE_NAV: Array<NavItem | 'divider'> = [
  ASSETS_ITEM,
  { label: INGEST_SECTION.label, icon: INGEST_SECTION.icon, path: INGEST_SECTION.parentPath, drillId: INGEST_SECTION.id },
  'divider',
  { label: BUILD_AI_SECTION.label, icon: BUILD_AI_SECTION.icon, path: BUILD_AI_SECTION.parentPath, drillId: BUILD_AI_SECTION.id },
  FLOWS_ITEM,
  'divider',
  { label: CONNECTIONS_SECTION.label, icon: CONNECTIONS_SECTION.icon, path: CONNECTIONS_SECTION.parentPath, drillId: CONNECTIONS_SECTION.id },
  'divider',
  { label: PIPELINE_SERVICES_SECTION.label, icon: PIPELINE_SERVICES_SECTION.icon, path: PIPELINE_SERVICES_SECTION.parentPath, drillId: PIPELINE_SERVICES_SECTION.id },
  { label: TESTS_SECTION.label, icon: TESTS_SECTION.icon, path: TESTS_SECTION.parentPath, drillId: TESTS_SECTION.id },
  { label: OBSERVABILITY_SECTION.label, icon: OBSERVABILITY_SECTION.icon, path: OBSERVABILITY_SECTION.parentPath, drillId: OBSERVABILITY_SECTION.id },
  'divider',
  { label: SETTINGS_SECTION.label, icon: SETTINGS_SECTION.icon, path: SETTINGS_SECTION.parentPath, drillId: SETTINGS_SECTION.id },
];

const PIPELINE_TOP_LEVEL_ITEMS = PIPELINE_NAV.filter(isNavItem);

export const ALL_TOP_LEVEL_ITEMS: NavItem[] = dedupeNavItems([
  ...PIPELINE_TOP_LEVEL_ITEMS,
]);

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

export const DRILL_CONFIGS: NavDrillConfig[] = [
  FLOWS_DRILL,
  createStaticDrill(SETTINGS_SECTION),
  createStaticDrill(INGEST_SECTION),
  createStaticDrill(BUILD_AI_SECTION),
  createStaticDrill(CONNECTIONS_SECTION),
  createStaticDrill(TESTS_SECTION),
  createStaticDrill(PIPELINE_SERVICES_SECTION),
  createStaticDrill(OBSERVABILITY_SECTION),
];

const DRILL_BY_ID = new Map(DRILL_CONFIGS.map((config) => [config.id, config]));

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
    for (const section of config.sections) {
      for (const item of section.items) {
        const owningTopLevelDrillId = TOP_LEVEL_DRILL_BY_PATH.get(item.path);
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

export function resolveFlowDrillPath(pathOrTab: string, flowIdOrPrefix: string): string {
  // If the first arg is already a full path (starts with /), return it as-is.
  if (pathOrTab.startsWith('/')) return pathOrTab;
  return `/app/flows/${encodeURIComponent(flowIdOrPrefix)}/${pathOrTab}`;
}
