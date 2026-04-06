import { useMemo } from 'react';
import { IconLayoutSidebarLeftCollapse } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { resolveAdminShellBreadcrumbSegments } from '@/components/admin/AdminLeftNav';
import { ShellWorkspaceSelector } from '@/components/shell/ShellWorkspaceSelector';
import '@/components/common/ShellHeaderTitle.css';
import '@/components/shell/TopCommandBar.css';

type AdminShellTopBandProps = {
  navOpen: boolean;
  primaryRailWidth: number;
  height: number;
  onToggleNav: () => void;
};

const OPEN_CONTENT_GAP = 28;
const OPEN_TOGGLE_OVERHANG = 16;
const CLOSED_TOGGLE_INSET = 8;
const TOGGLE_CONTROL_CLEARANCE = 52;

export function AdminShellTopBand({
  navOpen,
  primaryRailWidth,
  height,
  onToggleNav,
}: AdminShellTopBandProps) {
  const { pathname } = useLocation();
  const toggleInset = navOpen ? Math.max(primaryRailWidth - OPEN_TOGGLE_OVERHANG, CLOSED_TOGGLE_INSET) : CLOSED_TOGGLE_INSET;
  const contentInset = navOpen ? primaryRailWidth + OPEN_CONTENT_GAP : TOGGLE_CONTROL_CLEARANCE;
  const segments = useMemo(() => resolveAdminShellBreadcrumbSegments(pathname), [pathname]);
  const segmentsKey = segments.join('\u0001');

  const breadcrumb = useMemo(() => (
    <div data-testid="admin-shell-breadcrumb" className="shell-header-breadcrumb truncate">
      {segments.map((seg, i) => (
        <span key={`${segmentsKey}-${i}`}>
          {i > 0 && (
            <>
              {' '}
              <span className="shell-header-breadcrumb-sep">/</span>
              {' '}
            </>
          )}
          <span className="shell-header-breadcrumb-segment">{seg}</span>
        </span>
      ))}
    </div>
  ), [segments, segmentsKey]);

  return (
    <div
      data-testid="admin-shell-top-band"
      style={{ height, borderBottomColor: 'var(--chrome, var(--background))' }}
      className="fixed inset-x-0 top-0 z-30 border-b border-border bg-[var(--chrome,var(--background))] text-foreground"
    >
      <div className="relative flex h-full items-center px-3">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label={navOpen ? 'Hide admin navigation' : 'Show admin navigation'}
          title={navOpen ? 'Hide admin navigation' : 'Show admin navigation'}
          style={{ insetInlineStart: `${toggleInset}px`, top: '50%', transform: 'translateY(-50%)' }}
          className="absolute inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background/40 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconLayoutSidebarLeftCollapse size={16} stroke={1.9} />
        </button>

        <div
          data-testid="admin-shell-top-band-content"
          className="flex min-w-0 flex-1 items-center justify-between gap-4"
          style={{ marginInlineStart: contentInset }}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            {breadcrumb}
          </div>
          <div className="hidden shrink-0 sm:block">
            <ShellWorkspaceSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
