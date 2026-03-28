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
  IconFileCode,
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

export type ClassicNavSection = {
  type: 'section-heading';
  label: string;
  items: NavItem[];
};

export type ClassicNavEntry = NavItem | ClassicNavSection | 'divider';

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

export function isNavItem(entry: ClassicNavEntry | NavItem | 'divider'): entry is NavItem {
  return entry !== 'divider' && !('type' in entry);
}

export function isClassicNavSection(entry: ClassicNavEntry): entry is ClassicNavSection {
  return entry !== 'divider' && 'type' in entry && entry.type === 'section-heading';
}

function createClassicSection(section: SharedNavSection): ClassicNavSection {
  return {
    type: 'section-heading',
    label: section.label,
    items: section.items,
  };
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
const TRANSFORM_ITEM: NavItem = { label: 'Transform', icon: IconArrowsShuffle, path: '/app/transform' };
const WORKBENCH_ITEM: NavItem = { label: 'Workbench', icon: IconFileCode, path: '/app/workspace', drillId: 'workbench' };
const API_ITEM: NavItem = { label: 'API', icon: IconTerminal2, path: '/app/api-editor' };
const TESTS_ITEM: NavItem = { label: 'Tests', icon: IconTestPipe, path: '/app/tests' };

const INGEST_SECTION: SharedNavSection = {
  id: 'ingest',
  label: 'Ingest',
  icon: IconScan,
  parentPath: '/app/parse',
  routePrefix: '/app/parse',
  items: [
    { label: 'Parse', icon: IconScan, path: '/app/parse' },
    { label: 'Extract', icon: IconWand, path: '/app/extract' },
    { label: 'Convert', icon: IconFileExport, path: '/app/convert' },
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
  items: [
    { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
    { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
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
    { label: 'Knowledge Bases', icon: IconDatabase, path: '/app/pipeline-services/knowledge-bases' },
    { label: 'Index Builder', icon: IconTransform, path: '/app/pipeline-services/index-builder' },
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

const SHARED_STATIC_SECTIONS: SharedNavSection[] = [
  INGEST_SECTION,
  BUILD_AI_SECTION,
  CONNECTIONS_SECTION,
  PIPELINE_SERVICES_SECTION,
  OBSERVABILITY_SECTION,
  SETTINGS_SECTION,
];

export const CLASSIC_LEAF_ITEMS: NavItem[] = [
  ASSETS_ITEM,
  FLOWS_ITEM,
  TRANSFORM_ITEM,
  WORKBENCH_ITEM,
  API_ITEM,
  TESTS_ITEM,
];

export const TOP_LEVEL_NAV: ClassicNavEntry[] = [
  ASSETS_ITEM,
  'divider',
  createClassicSection(INGEST_SECTION),
  'divider',
  createClassicSection(BUILD_AI_SECTION),
  FLOWS_ITEM,
  'divider',
  TRANSFORM_ITEM,
  WORKBENCH_ITEM,
  API_ITEM,
  TESTS_ITEM,
  'divider',
  createClassicSection(CONNECTIONS_SECTION),
  'divider',
  createClassicSection(PIPELINE_SERVICES_SECTION),
  'divider',
  createClassicSection(OBSERVABILITY_SECTION),
  'divider',
  createClassicSection(SETTINGS_SECTION),
];

export const PIPELINE_NAV: Array<NavItem | 'divider'> = [
  ASSETS_ITEM,
  { label: INGEST_SECTION.label, icon: INGEST_SECTION.icon, path: INGEST_SECTION.parentPath, drillId: INGEST_SECTION.id },
  'divider',
  { label: BUILD_AI_SECTION.label, icon: BUILD_AI_SECTION.icon, path: BUILD_AI_SECTION.parentPath, drillId: BUILD_AI_SECTION.id },
  FLOWS_ITEM,
  'divider',
  { label: CONNECTIONS_SECTION.label, icon: CONNECTIONS_SECTION.icon, path: CONNECTIONS_SECTION.parentPath, drillId: CONNECTIONS_SECTION.id },
  WORKBENCH_ITEM,
  'divider',
  { label: PIPELINE_SERVICES_SECTION.label, icon: PIPELINE_SERVICES_SECTION.icon, path: PIPELINE_SERVICES_SECTION.parentPath, drillId: PIPELINE_SERVICES_SECTION.id },
  { label: OBSERVABILITY_SECTION.label, icon: OBSERVABILITY_SECTION.icon, path: OBSERVABILITY_SECTION.parentPath, drillId: OBSERVABILITY_SECTION.id },
  'divider',
  { label: SETTINGS_SECTION.label, icon: SETTINGS_SECTION.icon, path: SETTINGS_SECTION.parentPath, drillId: SETTINGS_SECTION.id },
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
  return PIPELINE_NAV;
}

const CLASSIC_ROUTE_ITEMS = TOP_LEVEL_NAV.flatMap((entry) => {
  if (entry === 'divider') return [];
  if (isClassicNavSection(entry)) return entry.items;
  return [entry];
});

const PIPELINE_TOP_LEVEL_ITEMS = PIPELINE_NAV.filter(isNavItem);

export const ALL_TOP_LEVEL_ITEMS: NavItem[] = dedupeNavItems([
  ...CLASSIC_ROUTE_ITEMS,
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

const WORKBENCH_DRILL: NavDrillConfig = {
  id: 'workbench',
  parentLabel: 'Workbench',
  parentPath: '/app/workspace',
  routePrefix: '/app/workspace',
  sections: [
    {
      items: [
        { label: 'Flows', icon: IconFolderPlus, path: '/app/flows' },
        { label: 'Transform', icon: IconArrowsShuffle, path: '/app/transform' },
        { label: 'Secrets', icon: IconLock, path: '/app/settings/secrets' },
        { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
        { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
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
  WORKBENCH_DRILL,
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

export function resolveFlowDrillPath(tabSlug: string, flowId: string): string {
  return `/app/flows/${encodeURIComponent(flowId)}/${tabSlug}`;
}
