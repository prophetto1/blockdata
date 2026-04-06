import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Avatar } from '@ark-ui/react/avatar';
import { Layout03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ToggleGroup } from '@ark-ui/react/toggle-group';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconDeviceDesktop,
  IconSun,
  IconMoon,
  IconHelp,
  IconBook2,
  IconLogout,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  PIPELINE_NAV,
  ALL_TOP_LEVEL_ITEMS,
  BOTTOM_RAIL_NAV,
  findDrillByRoute,
  getDrillConfig,
  resolveFlowDrillPath,
  isNavItem,
  type NavItem,
  type NavDrillConfig,
} from '@/components/shell/nav-config';
import type { AdminNavSection } from '@/components/admin/AdminLeftNav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarProvider,
} from '@/components/ui/sidebar';
import {
  MenuRoot,
  MenuTrigger,
  MenuPositioner,
  MenuContent,
  MenuItem,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { DOCS_URL } from '@/lib/urls';

import { useTheme, type ThemeChoice } from '@/hooks/useTheme';

type LeftRailShadcnProps = {
  onNavigate?: () => void;
  userLabel?: string;
  onSignOut?: () => void | Promise<void>;
  desktopCompact?: boolean;
  onToggleDesktopCompact?: () => void;
  disableAutoDrill?: boolean;
  hideNav?: boolean;
  navSections?: AdminNavSection[];
  headerBrand?: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  hideHeaderChrome?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers for determining active path                                */
/* ------------------------------------------------------------------ */

function isItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.path || pathname.startsWith(item.path + '/');
}

/**
 * For flows drill, extract the flowId from the current pathname and
 * build full paths for tab slugs. Returns null if not on a flow route.
 */
function extractFlowId(pathname: string): string | null {
  const match = pathname.match(/^\/app\/flows\/([^/]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
}


/* ------------------------------------------------------------------ */
/*  Theme toggle (inline, Vercel-style 3-option row)                   */
/* ------------------------------------------------------------------ */

const THEME_OPTIONS: { value: ThemeChoice; icon: typeof IconSun; label: string }[] = [
  { value: 'system', icon: IconDeviceDesktop, label: 'System' },
  { value: 'light', icon: IconSun, label: 'Light' },
  { value: 'dark', icon: IconMoon, label: 'Dark' },
];

function ThemeToggleRow() {
  const { choice, setTheme } = useTheme();
  return (
    <ToggleGroup.Root
      value={[choice]}
      onValueChange={(details) => {
        const next = details.value[0] as ThemeChoice | undefined;
        if (next) setTheme(next);
      }}
      className="flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5"
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <ToggleGroup.Item
            key={opt.value}
            value={opt.value}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded transition-colors',
              choice === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title={opt.label}
            aria-label={`Theme: ${opt.label}`}
          >
            <Icon size={16} stroke={1.75} />
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Account popup menu content (Vercel-style)                          */
/* ------------------------------------------------------------------ */

function AccountMenuContent({
  userLabel,
  docsSiteUrl,
  onSignOut,
}: {
  userLabel?: string;
  docsSiteUrl: string;
  onSignOut?: () => void | Promise<void>;
}) {
  return (
    <MenuContent className="min-w-64 p-0">
      {/* Account header -- username + email, theme controls right */}
      <div className="flex items-start justify-between px-3 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {userLabel?.split('@')[0] ?? 'User'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {userLabel ?? 'No email'}
          </p>
        </div>
        <div className="ml-3 mt-0.5 shrink-0">
          <ThemeToggleRow />
        </div>
      </div>

      {/* Flat menu list -- label left, icon right (Vercel style) */}
      <div className="py-1.5">
        <MenuItem
          value="help"
          className="flex items-center justify-between px-3 py-2"
          onClick={() => { /* placeholder */ }}
        >
          <span>Help</span>
          <IconHelp size={18} stroke={1.75} className="text-muted-foreground" />
        </MenuItem>
        <MenuItem
          value="docs"
          className="flex items-center justify-between px-3 py-2"
          onClick={() => { window.open(docsSiteUrl, '_blank', 'noopener'); }}
        >
          <span>Docs</span>
          <IconBook2 size={18} stroke={1.75} className="text-muted-foreground" />
        </MenuItem>

        {onSignOut && (
          <MenuItem
            value="sign-out"
            className="flex items-center justify-between px-3 py-2"
            onClick={() => { void onSignOut(); }}
          >
            <span>Log Out</span>
            <IconLogout size={18} stroke={1.75} className="text-muted-foreground" />
          </MenuItem>
        )}
      </div>
    </MenuContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LeftRailShadcn({
  onNavigate,
  userLabel,
  onSignOut,
  desktopCompact = false,
  onToggleDesktopCompact,
  disableAutoDrill = false,
  hideNav = false,
  navSections,
  headerBrand,
  headerContent,
  footerContent,
  hideHeaderChrome = false,
}: LeftRailShadcnProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const docsSiteUrl = DOCS_URL;

  const activeNav = PIPELINE_NAV;
  const compactNav = PIPELINE_NAV.filter(isNavItem);

  // Drill IDs reachable from the nav — both classic and pipeline use PIPELINE_NAV.
  const validDrillIds = useMemo(() => {
    const topLevelIds = PIPELINE_NAV
      .filter((entry): entry is NavItem => isNavItem(entry) && !!entry.drillId)
      .map((item) => item.drillId!);
    const sectionIds = navSections
      ? navSections.flatMap((s) => s.items).filter((i) => !!i.drillId).map((i) => i.drillId!)
      : [];
    return new Set([...topLevelIds, ...sectionIds]);
  }, [navSections]);

  const navigateTo = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  /* ------ Drill-in / drill-out state ------ */
  const [activeDrillId, setActiveDrillId] = useState<string | null>(null);
  const skipAutoDrillRef = useRef(false);

  // Auto-drill based on current route — only activates drills reachable from
  // the current nav style so pipeline-only drills don't fire in classic view.
  // This shell intentionally mirrors route state into drill state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (disableAutoDrill) {
      if (activeDrillId !== null) setActiveDrillId(null);
      return;
    }
    if (skipAutoDrillRef.current) {
      skipAutoDrillRef.current = false;
      return;
    }
    const drillMatch = findDrillByRoute(location.pathname);
    if (drillMatch && validDrillIds.has(drillMatch.id)) {
      if (activeDrillId !== drillMatch.id) {
        setActiveDrillId(drillMatch.id);
      }
    } else {
      if (activeDrillId !== null) {
        setActiveDrillId(null);
      }
    }
  }, [disableAutoDrill, location.pathname, validDrillIds]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Back out of drill view. Only switches the sidebar to the top-level nav --
   * does NOT navigate away from the current page. The user stays on whatever
   * content they were viewing. The skipAutoDrillRef prevents the route-based
   * auto-drill from immediately re-activating.
   */
  const drillBack = () => {
    skipAutoDrillRef.current = true;
    setActiveDrillId(null);
  };

  const activeDrillConfig = activeDrillId ? getDrillConfig(activeDrillId) : undefined;

  /* ------ Active item detection ------ */
  const activeMenuPath = useMemo(() => {
    const allItems = [...ALL_TOP_LEVEL_ITEMS, ...BOTTOM_RAIL_NAV];
    // Sort by path length descending so more specific paths match first
    const sorted = [...allItems].sort((a, b) => b.path.length - a.path.length);
    for (const item of sorted) {
      if (isItemActive(item, location.pathname)) return item.path;
    }
    return null;
  }, [location.pathname]);

  const userInitial = userLabel?.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? '?';
  const railStackClass = 'space-y-px';
  const railDividerClass = 'my-1 mx-2 h-px bg-sidebar-border';
  const railItemClass = 'flex w-full items-center gap-2.5 rounded-md px-2 h-7 text-[13px] font-medium leading-[1.5] transition-colors';
  const drillBackClass = 'flex w-full items-center gap-2 rounded-md px-2 h-7 text-[13px] font-medium leading-[1.5] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';

  /* ------ Render helpers ------ */

  const renderTopLevelNav = () => (
    <div className={railStackClass}>
      {activeNav.map((entry, index) => {
        if (entry === 'divider') {
          return <div key={`divider-${index}`} className={railDividerClass} />;
        }

        const item = entry as NavItem;
        const ItemIcon = item.icon;
        const isActive = activeMenuPath === item.path;
        const hasDrill = Boolean(item.drillId);

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => {
              if (hasDrill) {
                setActiveDrillId(item.drillId!);
              }
              navigateTo(item.path);
            }}
            className={cn(
              railItemClass,
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <ItemIcon size={14} stroke={1.75} className="shrink-0" />
            <span className="truncate">{item.label}</span>
            {hasDrill && (
              <IconChevronRight size={14} stroke={1.75} className="ml-auto shrink-0 text-sidebar-foreground/40" />
            )}
          </button>
        );
      })}
    </div>
  );

  const renderDrillView = (config: NavDrillConfig) => {
    const flowId = config.id === 'flows' ? extractFlowId(location.pathname) : null;

    return (
      <div className={railStackClass}>
        {/* Back button */}
        <button
          type="button"
          onClick={() => drillBack()}
          className={drillBackClass}
        >
          <IconChevronLeft size={14} stroke={1.75} className="shrink-0" />
          <span className="truncate">{config.id === 'superuser' ? 'Main Menu' : config.parentLabel}</span>
        </button>

        <div className={railDividerClass} />

        {/* Flat child list */}
        {config.sections.map((section, sectionIndex) => (
          <div key={section.label ?? sectionIndex}>
            {sectionIndex > 0 && <div className={railDividerClass} />}
            <div className={railStackClass}>
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                // Resolve item path to full URL depending on drill type
                const resolvedPath = flowId
                  ? resolveFlowDrillPath(item.path, flowId)
                  : item.path;
                const isActive = flowId
                  ? location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath + '/')
                  : item.path === config.parentPath
                    ? location.pathname === item.path
                    : isItemActive(item, location.pathname);

                const isDisabled = config.id === 'flows' && !flowId;

                return (
                  <button
                    key={item.path}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      navigate(resolvedPath);
                      onNavigate?.();
                    }}
                    className={cn(
                      railItemClass,
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isDisabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <ItemIcon size={14} stroke={1.75} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCompactNav = () => (
    <div className="flex flex-col items-center gap-0.5 pt-1">
      {compactNav.map((item, index) => {
        if (!item) {
          return <div key={`divider-${index}`} className="my-1 h-px w-6 bg-sidebar-border" />;
        }
        const ItemIcon = item.icon;
        const isActive = activeMenuPath === item.path;

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigateTo(item.path)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
            title={item.label}
            aria-label={item.label}
          >
            <ItemIcon size={20} stroke={1.75} />
          </button>
        );
      })}
    </div>
  );


  const renderBottomUtilityNav = () => {
    if (desktopCompact) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          {BOTTOM_RAIL_NAV.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeMenuPath === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigateTo(item.path)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
                title={item.label}
                aria-label={item.label}
              >
                <ItemIcon size={20} stroke={1.75} />
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className={railStackClass}>
        {BOTTOM_RAIL_NAV.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeMenuPath === item.path;

          return (
            <button
              key={item.path}
              type="button"
            onClick={() => navigateTo(item.path)}
            className={cn(
                railItemClass,
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <ItemIcon size={14} stroke={1.75} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSectionsNav = (sections: AdminNavSection[]) => (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="mb-1.5 px-2.5 text-[12px] font-normal tracking-normal text-sidebar-foreground/50">
            {section.label}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const ItemIcon = item.icon;
              const hasDrill = Boolean(item.drillId);
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    if (hasDrill) setActiveDrillId(item.drillId!);
                    navigateTo(item.path);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 h-7 text-[13px] font-medium leading-[1.5] transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <ItemIcon size={14} stroke={1.75} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {hasDrill && (
                    <IconChevronRight size={14} stroke={1.75} className="ml-auto shrink-0 text-sidebar-foreground/40" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <SidebarProvider
      open={!desktopCompact}
      style={
        {
          '--sidebar-width': '100%',
          '--sidebar-width-icon': '100%',
        } as CSSProperties
      }
      className="h-full min-h-0"
    >
      <Sidebar
        collapsible="none"
        className="h-full min-h-0 bg-sidebar font-sans text-sidebar-foreground"
      >
        {!hideHeaderChrome && (
          <SidebarHeader
            className={cn(
              desktopCompact
                ? 'h-[60px] gap-0 px-0 py-0'
                : 'gap-0 px-0 py-0',
            )}
          >
            <div
              className={cn(
                'flex items-center',
                desktopCompact
                  ? 'h-full justify-center'
                  : 'h-[60px] justify-between px-3',
              )}
            >
              {navSections ? (
                headerBrand ? (
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md',
                      desktopCompact
                        ? 'size-10 justify-center p-0'
                        : 'px-1.5 py-1',
                    )}
                  >
                    {headerBrand}
                  </div>
                ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    navigate('/app');
                    onNavigate?.();
                  }}
                  aria-label="Go to app"
                >
                  <IconChevronLeft size={14} stroke={2} className="shrink-0" />
                  <span className="font-medium">Go to App</span>
                </button>
                )
              ) : (
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-2.5 rounded-md text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    desktopCompact
                      ? 'size-10 justify-center p-0'
                      : 'px-1.5 py-1',
                  )}
                  onClick={() => {
                    if (desktopCompact) {
                      onToggleDesktopCompact?.();
                      return;
                    }
                    navigate('/app');
                    onNavigate?.();
                  }}
                  aria-label={desktopCompact ? 'Expand side navigation' : 'Go to home'}
                  title={desktopCompact ? 'Expand side navigation' : undefined}
                >
                  {desktopCompact ? (
                    <HugeiconsIcon icon={Layout03Icon} size={18} strokeWidth={2.1} />
                  ) : (
                    <span className="inline-flex items-baseline text-sm font-semibold uppercase tracking-[0.2em]">
                      <span className="text-sidebar-foreground">Block</span>
                      <span className="text-primary">Data</span>
                    </span>
                  )}
                </button>
              )}
              {!desktopCompact && onToggleDesktopCompact && (
                <button
                  type="button"
                  onClick={onToggleDesktopCompact}
                  aria-label="Collapse side navigation"
                  title="Collapse side navigation"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <HugeiconsIcon icon={Layout03Icon} size={18} strokeWidth={2.1} />
                </button>
              )}
            </div>
            {!desktopCompact && headerContent ? (
              <div className="px-3 pb-3">
                {headerContent}
              </div>
            ) : null}
            {!desktopCompact && <div className="h-px w-full bg-sidebar-border" />}
          </SidebarHeader>
        )}

        {/* ---- Content: Nav items or drill view ---- */}
        {navSections ? (
          <SidebarContent className={cn('px-1', hideHeaderChrome && 'pt-2')}>
            <SidebarGroup className="p-1">
              <SidebarGroupContent>
                {activeDrillConfig
                  ? renderDrillView(activeDrillConfig)
                  : renderSectionsNav(navSections)}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        ) : !hideNav ? (
          <SidebarContent className={cn(desktopCompact ? 'px-0' : 'px-1', hideHeaderChrome && 'pt-2')}>
            <SidebarGroup className={desktopCompact ? 'p-0' : 'p-1'}>
              <SidebarGroupContent>
                {desktopCompact
                  ? renderCompactNav()
                  : activeDrillConfig
                    ? renderDrillView(activeDrillConfig)
                    : renderTopLevelNav()}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        ) : (
          <SidebarContent className="flex-1" />
        )}

        {!hideNav && !navSections && BOTTOM_RAIL_NAV.length > 0 && (
          <div className={desktopCompact ? 'px-0 pb-1' : 'px-2 pb-1'}>
            {renderBottomUtilityNav()}
          </div>
        )}


        {/* ---- Footer: Account card (Vercel-style) ---- */}
        <SidebarFooter className="border-0 px-0 pt-0">
          {!desktopCompact && footerContent ? footerContent : null}
          <div className="mx-2.5 h-px bg-sidebar-border" />
          <MenuRoot positioning={{ placement: 'top-start', offset: { mainAxis: 8, crossAxis: 0 } }}>
            <div className={cn(desktopCompact ? 'flex justify-center px-0 py-2' : 'flex items-center gap-2 px-3 py-2')}>
              {/* Avatar + username + dots -- all trigger the menu */}
              <MenuTrigger
                className={cn(
                  'flex items-center gap-2 rounded-md border-0 bg-transparent transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  desktopCompact ? 'h-9 w-9 justify-center' : 'min-w-0 flex-1 py-0.5',
                )}
                aria-label="Account menu"
              >
                <Avatar.Root className={cn(desktopCompact ? 'h-7 w-7' : 'h-6 w-6', 'shrink-0')}>
                  <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {userInitial}
                  </Avatar.Fallback>
                </Avatar.Root>
                {!desktopCompact && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left text-sm text-sidebar-foreground">
                      {userLabel ?? userInitial}
                    </span>
                    <IconDots size={16} stroke={1.75} className="shrink-0 text-sidebar-foreground/50" />
                  </>
                )}
              </MenuTrigger>

            </div>
            <MenuPositioner>
              <AccountMenuContent
                userLabel={userLabel}
                docsSiteUrl={docsSiteUrl}
                onSignOut={onSignOut}
              />
            </MenuPositioner>
          </MenuRoot>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}

