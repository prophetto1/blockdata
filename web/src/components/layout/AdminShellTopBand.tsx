import { useMemo } from 'react';
import { Layout03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useLocation } from 'react-router-dom';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { ShellWorkspaceSelector } from '@/components/shell/ShellWorkspaceSelector';
import '@/components/shell/TopCommandBar.css';

function toTitleCase(value: string) {
  if (!value) return '';
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join(' ');
}

function resolveSurfaceLabel(pathname: string) {
  if (pathname.startsWith('/app/blockdata-admin')) return 'Blockdata Admin';
  if (pathname.startsWith('/app/agchain-admin')) return 'AGChain Admin';
  if (pathname.startsWith('/app/superuser')) return 'Superuser';
  return 'Admin';
}

function resolveFallbackHeader(pathname: string) {
  const baseLabel = resolveSurfaceLabel(pathname);
  const pathSegments = pathname.split('/').filter(Boolean).slice(2);
  const leafSegment = pathSegments.at(-1);

  if (!leafSegment) return baseLabel;

  return `${baseLabel} / ${toTitleCase(leafSegment)}`;
}

type AdminShellTopBandProps = {
  navOpen: boolean;
  leftChromeWidth: number;
  height: number;
  onToggleNav: () => void;
};

export function AdminShellTopBand({
  navOpen,
  leftChromeWidth,
  height,
  onToggleNav,
}: AdminShellTopBandProps) {
  const { center } = useHeaderCenter();
  const { pathname } = useLocation();

  const fallbackHeader = useMemo(() => (
    <div className="truncate text-sm font-medium tracking-[0.01em] text-foreground">
      {resolveFallbackHeader(pathname)}
    </div>
  ), [pathname]);

  return (
    <div
      data-testid="admin-shell-top-band"
      style={{ height }}
      className="fixed inset-x-0 top-0 z-30 border-b border-border bg-[var(--chrome,var(--background))] text-foreground"
    >
      <div className="relative flex h-full items-center px-3">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label={navOpen ? 'Hide admin navigation' : 'Show admin navigation'}
          title={navOpen ? 'Hide admin navigation' : 'Show admin navigation'}
          className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-border/80 bg-background/40 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HugeiconsIcon icon={Layout03Icon} size={16} strokeWidth={2.05} />
        </button>

        <div
          className="flex min-w-0 flex-1 items-center justify-between gap-4"
          style={{ marginInlineStart: navOpen ? leftChromeWidth + 12 : 36 }}
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            {center ?? fallbackHeader}
          </div>
          <div className="hidden shrink-0 sm:block">
            <ShellWorkspaceSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
