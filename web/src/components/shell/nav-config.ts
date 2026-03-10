import type { Icon } from '@tabler/icons-react';
import {
  IconApps,
  IconCode,
  IconDatabase,
  IconFileCode,
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
} from '@tabler/icons-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NavItem = {
  label: string;
  icon: Icon;
  path: string;
  /** When set, clicking this item drills into a 2nd-level view */
  drillId?: string;
  /** Optional badge text (e.g. "Beta") */
  badge?: string;
  /** Kept for backward compat — unused by flat nav */
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
  /** Route prefix for auto-drill detection */
  routePrefix: string;
  /** Path template with params, e.g. "/app/flows/:flowId/:tab" */
  pathTemplate?: string;
};

/* ------------------------------------------------------------------ */
/*  Top-level navigation (flat list with dividers)                     */
/* ------------------------------------------------------------------ */

export const TOP_LEVEL_NAV: Array<NavItem | 'divider'> = [
  { label: 'Flows', icon: IconFolderPlus, path: '/app/flows', drillId: 'flows' },
  { label: 'ELT', icon: IconCode, path: '/app/elt' },
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
  'divider',
  { label: 'Schema', icon: IconSchema, path: '/app/schemas' },
  { label: 'API', icon: IconTerminal2, path: '/app/api-editor' },
  'divider',
  { label: 'Integrations', icon: IconApps, path: '/app/marketplace/integrations' },
  { label: 'Services', icon: IconServer, path: '/app/marketplace/services' },
  { label: 'Tests', icon: IconTestPipe, path: '/app/tests' },
  'divider',
  { label: 'Settings', icon: IconSettings, path: '/app/settings', drillId: 'settings' },
];

/** Flat list of all navigable items (excludes dividers) */
export const ALL_TOP_LEVEL_ITEMS: NavItem[] = TOP_LEVEL_NAV.filter(
  (entry): entry is NavItem => entry !== 'divider',
);

/* ------------------------------------------------------------------ */
/*  Drill configurations                                               */
/* ------------------------------------------------------------------ */

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
        { label: 'MCP Servers', icon: IconPlugConnected, path: '/app/settings/mcp' },
        { label: 'Admin', icon: IconServer, path: '/app/settings/admin/instance-config' },
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
      label: 'Parsers',
      items: [
        { label: 'Docling', icon: IconSettings, path: '/app/superuser/docling' },
      ],
    },
  ],
};

export const DRILL_CONFIGS: NavDrillConfig[] = [FLOWS_DRILL, SETTINGS_DRILL, SUPERUSER_DRILL];

const DRILL_BY_ID = new Map(DRILL_CONFIGS.map((c) => [c.id, c]));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getDrillConfig(drillId: string): NavDrillConfig | undefined {
  return DRILL_BY_ID.get(drillId);
}

/**
 * Given a pathname, find the drill config whose routePrefix matches.
 * Returns `null` if the route is not inside any drill scope.
 */
export function findDrillByRoute(pathname: string): NavDrillConfig | null {
  for (const config of DRILL_CONFIGS) {
    if (pathname.startsWith(config.routePrefix)) {
      // For drills with a pathTemplate (e.g. flows), only match when
      // the pathname is deeper than just the parent path.
      if (config.pathTemplate && pathname === config.parentPath) continue;
      return config;
    }
    // Match exact parentPath only for drills without pathTemplate (e.g. settings)
    if (!config.pathTemplate && pathname === config.parentPath) {
      return config;
    }
  }
  return null;
}

/**
 * For the flows drill, interpolate :flowId into item paths.
 * Flow drill items store only the tab slug (e.g. "overview"), so we
 * build the full path: `/app/flows/{flowId}/{tab}`.
 */
export function resolveFlowDrillPath(tabSlug: string, flowId: string): string {
  return `/app/flows/${encodeURIComponent(flowId)}/${tabSlug}`;
}

/* ------------------------------------------------------------------ */
/*  Legacy exports (kept temporarily for migration)                    */
/* ------------------------------------------------------------------ */

/** @deprecated Use TOP_LEVEL_NAV instead */
export const GLOBAL_MENUS: NavItem[] = [
  { label: 'Flows', icon: IconFolderPlus, path: '/app/flows' },
  { label: 'ELT', icon: IconCode, path: '/app/elt' },
  { label: 'Database', icon: IconDatabase, path: '/app/database' },
];

/** @deprecated Use TOP_LEVEL_NAV instead */
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
