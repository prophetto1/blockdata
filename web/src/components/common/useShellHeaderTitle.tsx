import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ALL_TOP_LEVEL_ITEMS, DRILL_CONFIGS } from '@/components/shell/nav-config';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import './ShellHeaderTitle.css';

type ShellHeaderTitleInput = {
  title?: ReactNode;
  /** Optional explicit breadcrumb segments (e.g. ['Flows', 'my-flow', 'Edit']). Overrides auto-detection. */
  breadcrumbs?: string[];
  /** @deprecated kept for backwards compat — ignored in new breadcrumb layout */
  subtitle?: ReactNode;
};

function toTitleCase(value: string): string {
  if (!value) return '';
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

const SORTED_TOP_LEVEL_ITEMS = [...ALL_TOP_LEVEL_ITEMS].sort((a, b) => b.path.length - a.path.length);
const TOP_LEVEL_DRILL_BY_PATH = new Map(
  ALL_TOP_LEVEL_ITEMS
    .filter((item): item is (typeof ALL_TOP_LEVEL_ITEMS)[number] & { drillId: string } => Boolean(item.drillId))
    .map((item) => [item.path, item.drillId]),
);
const DRILL_STATIC_CHILDREN = DRILL_CONFIGS
  .flatMap((config) =>
    config.sections.flatMap((section) =>
      section.items
        .filter((item) => item.path.startsWith('/'))
        .filter((item) => {
          const owningTopLevelDrillId = TOP_LEVEL_DRILL_BY_PATH.get(item.path);
          return !owningTopLevelDrillId || owningTopLevelDrillId === config.id;
        })
        .map((item) => ({
          parentLabel: config.parentLabel,
          path: item.path,
          label: item.label,
        })),
    ),
  )
  .sort((a, b) => b.path.length - a.path.length);
const CLASSIC_FLOW_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  topology: 'Topology',
  executions: 'Executions',
  edit: 'Edit',
  revisions: 'Revisions',
  triggers: 'Triggers',
  logs: 'Logs',
  metrics: 'Metrics',
  dependencies: 'Dependencies',
  concurrency: 'Concurrency',
  auditlogs: 'Audit Logs',
};

function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(path + '/');
}

function resolveStructuredSegments(pathname: string): { segments: string[]; source: 'child' | 'top-level' } | null {
  const childMatch = DRILL_STATIC_CHILDREN.find((item) => matchesPath(pathname, item.path));
  if (childMatch) {
    return {
      segments: [childMatch.parentLabel, childMatch.label],
      source: 'child',
    };
  }

  const topLevelMatch = ALL_TOP_LEVEL_ITEMS.find((item) => pathname === item.path);
  if (topLevelMatch) {
    return {
      segments: [topLevelMatch.label],
      source: 'top-level',
    };
  }

  const flowDetailMatch = pathname.match(/^\/app\/flows\/[^/]+\/([^/]+)$/);
  if (flowDetailMatch) {
    const rawTab = flowDetailMatch[1];
    const flowTabLabel = CLASSIC_FLOW_TAB_LABELS[rawTab];
    if (flowTabLabel) {
      return {
        segments: ['Flows', flowTabLabel],
        source: 'child',
      };
    }
    if (rawTab.startsWith('preview-')) {
      return {
        segments: ['Flows', toTitleCase(rawTab)],
        source: 'child',
      };
    }
  }

  return null;
}

function resolveMenuLevelOne(pathname: string): string {
  if (matchesPath(pathname, '/app/projects/list')) return 'Projects';

  const topLevelMatch = SORTED_TOP_LEVEL_ITEMS.find((item) => matchesPath(pathname, item.path));
  if (topLevelMatch) return topLevelMatch.label;

  if (pathname.startsWith('/app/settings') || pathname.startsWith('/app/superuser')) return 'Settings';
  if (pathname.startsWith('/app/agents') || pathname.startsWith('/app/onboarding/agents')) return 'Agents';
  if (pathname.startsWith('/app/experiments')) return 'Experiments';
  if (pathname.startsWith('/app/mcp')) return 'MCP';

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'app' && segments[1]) return toTitleCase(segments[1]);
  return 'BlockData';
}

export function useShellHeaderTitle({ title, breadcrumbs }: ShellHeaderTitleInput) {
  const { setCenter } = useHeaderCenter();
  const location = useLocation();
  const titleStr = typeof title === 'string' ? title : null;
  const breadcrumbsKey = breadcrumbs?.join('\u0001') ?? '';
  const structuredSegments = useMemo(
    () => resolveStructuredSegments(location.pathname),
    [location.pathname],
  );

  const menuLevelOne = useMemo(
    () => resolveMenuLevelOne(location.pathname),
    [location.pathname],
  );

  const segments: string[] = useMemo(() => {
    if (structuredSegments?.source === 'child') return structuredSegments.segments;

    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs.slice();

    if (structuredSegments?.source === 'top-level') return structuredSegments.segments;

    // If the title is the same as L1 (e.g. page title is "Schema" and L1 is "Schema"), just show one segment
    if (titleStr && titleStr === menuLevelOne) return [menuLevelOne];

    // Otherwise: L1 > title
    if (titleStr) return [menuLevelOne, titleStr];

    return [menuLevelOne];
  }, [breadcrumbsKey, breadcrumbs, structuredSegments, menuLevelOne, titleStr]);

  const segmentsKey = segments.join('\u0001');

  const centerNode = useMemo(
    () => (
      <div className="shell-header-breadcrumb">
        {segments.map((seg, i) => (
          <span key={i}>
            {i > 0 && <span className="shell-header-breadcrumb-sep">/</span>}
            {' '}
            <span className="shell-header-breadcrumb-segment">{seg}</span>
          </span>
        ))}
      </div>
    ),
    [segmentsKey],
  );

  useEffect(() => {
    setCenter(centerNode);
    return () => setCenter(null);
  }, [centerNode, setCenter]);
}
