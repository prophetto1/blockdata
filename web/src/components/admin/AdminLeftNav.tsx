/* eslint-disable react-refresh/only-export-components */
import { Link, useLocation } from 'react-router-dom';
import {
  IconServer,
  IconSettings,
  IconClipboardList,
  IconCode,
  IconTestPipe,
  IconCamera,
  IconKey,
  IconWand,
  IconRoute,
  IconPlugConnected,
  IconTable,
  IconLayoutGrid,
  type Icon,
} from '@tabler/icons-react';

export type AdminNavItem = {
  label: string;
  icon: Icon;
  path: string;
  drillId?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const BLOCKDATA_ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'CONFIG',
    items: [
      { label: 'Docling', icon: IconSettings, path: '/app/blockdata-admin/parsers-docling' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'AI Providers', icon: IconKey, path: '/app/blockdata-admin/ai-providers' },
      { label: 'Model Roles', icon: IconWand, path: '/app/blockdata-admin/model-roles' },
      { label: 'MCP Servers', icon: IconPlugConnected, path: '/app/blockdata-admin/mcp' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Audit History', icon: IconClipboardList, path: '/app/blockdata-admin/audit' },
      { label: 'API Endpoints', icon: IconCode, path: '/app/blockdata-admin/api-endpoints' },
      { label: 'Test Integrations', icon: IconTestPipe, path: '/app/blockdata-admin/test-integrations' },
    ],
  },
];

export const SUPERUSER_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'DEV ONLY',
    items: [
      { label: 'Control Tower', icon: IconLayoutGrid, path: '/app/superuser' },
      { label: 'Control Tower v2', icon: IconLayoutGrid, path: '/app/superuser/control-tower-v2' },
      { label: 'Operational Readiness', icon: IconServer, path: '/app/superuser/operational-readiness' },
      { label: 'Coordination Runtime', icon: IconPlugConnected, path: '/app/superuser/coordination-runtime' },
      { label: 'Layout Captures', icon: IconCamera, path: '/app/superuser/design-layout-captures' },
      { label: 'Skill-Driven Dev', icon: IconRoute, path: '/app/superuser/skill-driven-dev' },
      { label: 'Plan Tracker', icon: IconClipboardList, path: '/app/superuser/plan-tracker' },
      { label: 'GCP Cost Inventory', icon: IconTable, path: '/app/superuser/gcp-cost-inventory' },
      { label: 'Agchain Benchmarks (demo)', icon: IconTable, path: '/app/superuser/agchain-benchmarks-demo' },
      { label: 'Block Viewer Grid (demo)', icon: IconLayoutGrid, path: '/app/superuser/block-viewer-grid-demo' },
    ],
  },
];

export const AGCHAIN_ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: '',
    items: [
      { label: 'Models', icon: IconWand, path: '/app/agchain-admin/models' },
      { label: 'Tools', icon: IconCode, path: '/app/agchain-admin/tools' },
    ],
  },
];

export function getAdminNavSections(pathname: string): AdminNavSection[] {
  if (pathname.startsWith('/app/blockdata-admin')) return BLOCKDATA_ADMIN_NAV_SECTIONS;
  if (pathname.startsWith('/app/agchain-admin')) return AGCHAIN_ADMIN_NAV_SECTIONS;
  return SUPERUSER_NAV_SECTIONS;
}

export function resolveAdminSurfaceLabel(pathname: string): string {
  if (pathname.startsWith('/app/blockdata-admin')) return 'Blockdata Admin';
  if (pathname.startsWith('/app/agchain-admin')) return 'AGChain Admin';
  if (pathname.startsWith('/app/superuser')) return 'Superuser';
  return 'Admin';
}

function matchesAdminNavPath(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function resolveAdminPrimaryNavLabel(pathname: string): string | null {
  const items = getAdminNavSections(pathname).flatMap((section) => section.items);
  const match = items
    .filter((item) => matchesAdminNavPath(pathname, item.path))
    .sort((left, right) => right.path.length - left.path.length)[0];

  return match?.label ?? null;
}

export function resolveAdminShellBreadcrumbSegments(pathname: string): string[] {
  const surfaceLabel = resolveAdminSurfaceLabel(pathname);
  const primaryLabel = resolveAdminPrimaryNavLabel(pathname);
  return primaryLabel ? [surfaceLabel, primaryLabel] : [surfaceLabel];
}

type SecondaryItem = { label: string; href: string };
type SecondarySection = { label: string; items: SecondaryItem[] };

export function getSecondaryNav(_pathname: string): SecondarySection[] {
  return [];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminLeftNav() {
  const { pathname, hash } = useLocation();
  const sections = getSecondaryNav(pathname);

  return (
    <nav
      aria-label="Admin secondary navigation"
      data-testid="admin-secondary-rail"
      className="flex h-full w-[184px] min-w-[184px] flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-border px-2 py-3"
      style={{ backgroundColor: 'var(--sidebar-accent)' }}
    >
      {sections.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-sidebar-foreground/40" />
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-1 pb-2">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2.5 text-[var(--app-shell-sidebar-section-font)] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {section.label}
              </p>
              {section.items.map((item, idx) => {
                const isHash = item.href.startsWith('#');
                const firstHashIdx = section.items.findIndex((i) => i.href.startsWith('#'));
                const isActive = isHash
                  ? hash ? hash === item.href : idx === firstHashIdx
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    to={isHash ? `${pathname}${item.href}` : item.href}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                    'flex items-center rounded-md px-2.5 py-2 text-[var(--app-shell-sidebar-item-font)] transition-colors',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-sidebar-foreground/72 hover:bg-background/60 hover:text-foreground',
                    ].join(' ')}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
