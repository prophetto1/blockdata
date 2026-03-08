import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Avatar } from '@ark-ui/react/avatar';
import { Layout03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconBell,
  IconDots,
  IconDeviceDesktop,
  IconSun,
  IconMoon,
  IconFileText,
  IconHelp,
  IconBook2,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  TOP_LEVEL_NAV,
  ALL_TOP_LEVEL_ITEMS,
  findDrillByRoute,
  getDrillConfig,
  resolveFlowDrillPath,
  type NavItem,
  type NavDrillConfig,
} from '@/components/shell/nav-config';
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
import { PROJECT_FOCUS_STORAGE_KEY, PROJECT_LIST_CHANGED_EVENT } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { DOCS_URL } from '@/lib/urls';
import { useTheme, type ThemeChoice } from '@/hooks/useTheme';

type LeftRailShadcnProps = {
  onNavigate?: () => void;
  userLabel?: string;
  onSignOut?: () => void | Promise<void>;
  desktopCompact?: boolean;
  onToggleDesktopCompact?: () => void;
};

type ProjectFocusOption = {
  value: string;
  label: string;
  docCount: number;
  workspaceId: string | null;
};

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message ?? '') ||
    /function .* does not exist/i.test(error.message ?? '')
  );
}

function readStoredProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
}

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
  return match ? match[1]! : null;
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
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-sm">Theme</span>
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = choice === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => { e.stopPropagation(); setTheme(opt.value); }}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title={opt.label}
              aria-label={`Theme: ${opt.label}`}
            >
              <Icon size={14} stroke={1.75} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Account popup menu content (Vercel-style)                          */
/* ------------------------------------------------------------------ */

function AccountMenuContent({
  userLabel,
  docsSiteUrl,
  onNavigate,
  onSignOut,
}: {
  userLabel?: string;
  docsSiteUrl: string;
  onNavigate: () => void;
  onSignOut?: () => void | Promise<void>;
}) {
  return (
    <MenuContent className="min-w-56 p-0">
      {/* Account header — username + email, gear icon right */}
      <div className="flex items-start justify-between px-3 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {userLabel?.split('@')[0] ?? 'User'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {userLabel ?? 'No email'}
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="ml-2 mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="Settings"
          aria-label="Settings"
        >
          <IconSettings size={14} stroke={1.75} />
        </button>
      </div>

      {/* Flat menu list — label left, icon right (Vercel style) */}
      <div className="py-1.5">
        {/* Theme row (custom, not a MenuItem) */}
        <ThemeToggleRow />

        <MenuItem
          value="changelog"
          className="flex items-center justify-between px-3 py-2"
          onClick={() => { /* placeholder */ }}
        >
          <span>Changelog</span>
          <IconFileText size={16} stroke={1.75} className="text-muted-foreground" />
        </MenuItem>
        <MenuItem
          value="help"
          className="flex items-center justify-between px-3 py-2"
          onClick={() => { /* placeholder */ }}
        >
          <span>Help</span>
          <IconHelp size={16} stroke={1.75} className="text-muted-foreground" />
        </MenuItem>
        <MenuItem
          value="docs"
          className="flex items-center justify-between px-3 py-2"
          onClick={() => { window.open(docsSiteUrl, '_blank', 'noopener'); }}
        >
          <span>Docs</span>
          <IconBook2 size={16} stroke={1.75} className="text-muted-foreground" />
        </MenuItem>

        {onSignOut && (
          <MenuItem
            value="sign-out"
            className="flex items-center justify-between px-3 py-2"
            onClick={() => { void onSignOut(); }}
          >
            <span>Log Out</span>
            <IconLogout size={16} stroke={1.75} className="text-muted-foreground" />
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
}: LeftRailShadcnProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const docsSiteUrl = DOCS_URL;
  const activeProjectMatch = location.pathname.match(/^\/app\/elt\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;

  /* ------ Project focus state (unchanged) ------ */
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(() => readStoredProjectId());
  const [projectOptions, setProjectOptions] = useState<ProjectFocusOption[]>([]);
  const [, setProjectOptionsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedProjectId = activeProjectId ?? focusedProjectId;
    if (persistedProjectId) {
      window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, persistedProjectId);
      return;
    }
    window.localStorage.removeItem(PROJECT_FOCUS_STORAGE_KEY);
  }, [activeProjectId, focusedProjectId]);

  const loadProjectOptions = async () => {
    setProjectOptionsLoading(true);

    const rpcParams = {
      p_search: null,
      p_status: 'all',
      p_limit: 200,
      p_offset: 0,
    };

    let rows: Array<Record<string, unknown>> = [];
    let { data, error } = await supabase.rpc(PROJECTS_RPC_NEW, rpcParams);

    if (error && isMissingRpcError(error)) {
      const fallback = await supabase.rpc(PROJECTS_RPC_LEGACY, rpcParams);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      const fallbackProjects = await supabase
        .from(TABLES.projects)
        .select('project_id, project_name')
        .order('project_name', { ascending: true });

      if (fallbackProjects.error) {
        setProjectOptions([]);
        setProjectOptionsLoading(false);
        return;
      }

      rows = ((fallbackProjects.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        doc_count: 0,
      }));
    } else {
      rows = (data ?? []) as Array<Record<string, unknown>>;
    }

    const nextOptions = rows
      .map((row) => ({
        value: String(row.project_id ?? ''),
        label: String(row.project_name ?? 'Untitled project'),
        docCount: toCount(row.doc_count),
        workspaceId: row.workspace_id ? String(row.workspace_id) : null,
      }))
      .filter((row) => row.value.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    setProjectOptions(nextOptions);
    setProjectOptionsLoading(false);
  };

  useEffect(() => {
    void loadProjectOptions();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const focusId = (e as CustomEvent).detail?.focusProjectId;
      if (focusId) setFocusedProjectId(focusId);
      void loadProjectOptions();
    };
    window.addEventListener(PROJECT_LIST_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_LIST_CHANGED_EVENT, handler);
  }, []);

  const projectSelectValue = useMemo(() => {
    const candidate = activeProjectId ?? focusedProjectId;
    if (!candidate) return '';
    return projectOptions.some((project) => project.value === candidate)
      ? candidate
      : '';
  }, [activeProjectId, focusedProjectId, projectOptions]);

  const eltPath = projectSelectValue ? `/app/elt/${projectSelectValue}` : '/app/elt';

  const globalPathOverrides: Record<string, string> = {
    '/app/elt': eltPath,
  };

  const navigateTo = (path: string) => {
    navigate(globalPathOverrides[path] ?? path);
    onNavigate?.();
  };

  /* ------ Drill-in / drill-out state ------ */
  const [activeDrillId, setActiveDrillId] = useState<string | null>(null);
  const skipAutoDrillRef = useRef(false);

  // Auto-drill based on current route
  useEffect(() => {
    if (skipAutoDrillRef.current) {
      skipAutoDrillRef.current = false;
      return;
    }
    const drillMatch = findDrillByRoute(location.pathname);
    if (drillMatch) {
      if (activeDrillId !== drillMatch.id) {
        setActiveDrillId(drillMatch.id);
      }
    } else {
      if (activeDrillId !== null) {
        setActiveDrillId(null);
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Back out of drill view. Only switches the sidebar to the top-level nav —
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
    const allItems = ALL_TOP_LEVEL_ITEMS;
    // Sort by path length descending so more specific paths match first
    const sorted = [...allItems].sort((a, b) => b.path.length - a.path.length);
    for (const item of sorted) {
      if (isItemActive(item, location.pathname)) return item.path;
    }
    return null;
  }, [location.pathname]);

  const userInitial = userLabel?.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? '?';

  /* ------ Render helpers ------ */

  const renderTopLevelNav = () => (
    <div className="space-y-0.5">
      {TOP_LEVEL_NAV.map((entry, index) => {
        if (entry === 'divider') {
          return <div key={`divider-${index}`} className="my-1.5 mx-2.5 h-px bg-sidebar-border" />;
        }

        const item = entry;
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
              'flex w-full items-center gap-2.5 rounded-md px-2.5 h-9 text-sm leading-snug transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/80 font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <ItemIcon size={16} stroke={1.75} className="shrink-0" />
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
      <div className="space-y-0.5">
        {/* Back button */}
        <button
          type="button"
          onClick={() => drillBack()}
          className="flex w-full items-center gap-2 rounded-md px-2.5 h-9 text-sm font-medium leading-snug text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <IconChevronLeft size={16} stroke={1.75} className="shrink-0" />
          <span className="truncate">{config.parentLabel}</span>
        </button>

        <div className="mx-2.5 my-1 h-px bg-sidebar-border" />

        {/* Sections */}
        {config.sections.map((section, sectionIndex) => (
          <div key={section.label ?? sectionIndex}>
            {sectionIndex > 0 && <div className="mx-2.5 my-1.5 h-px bg-sidebar-border" />}
            {section.label && (
              <div className="mb-1 mt-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                // For flows drill, paths are tab slugs — resolve to full path
                const resolvedPath = flowId
                  ? resolveFlowDrillPath(item.path, flowId)
                  : item.path;
                const isActive = flowId
                  ? location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath + '/')
                  : isItemActive(item, location.pathname);

                // For flows drill without a flowId, items are not navigable
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
                      'flex w-full items-center gap-2.5 rounded-md px-2.5 h-9 text-sm leading-snug transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/80 font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isDisabled && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    <ItemIcon size={16} stroke={1.75} className="shrink-0" />
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
      {TOP_LEVEL_NAV.map((entry, index) => {
        if (entry === 'divider') {
          return <div key={`divider-${index}`} className="my-1 h-px w-6 bg-sidebar-border" />;
        }

        const item = entry;
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
        {/* ---- Header: Brand logo + collapse toggle ---- */}
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
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-2.5 rounded-md text-left transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                desktopCompact
                  ? 'size-10 justify-center p-0'
                  : 'px-1.5 py-1',
              )}
              onClick={() => {
                if (desktopCompact && onToggleDesktopCompact) {
                  onToggleDesktopCompact();
                  return;
                }
                navigate('/app/elt');
                onNavigate?.();
              }}
              aria-label={desktopCompact ? 'Expand side navigation' : 'Go to home'}
            >
              {desktopCompact ? (
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  B
                </span>
              ) : (
                <span className="inline-flex items-baseline text-sm font-semibold uppercase tracking-[0.2em]">
                  <span className="text-sidebar-foreground">Block</span>
                  <span className="text-primary">Data</span>
                </span>
              )}
            </button>
            {!desktopCompact && onToggleDesktopCompact && (
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={onToggleDesktopCompact}
                aria-label="Collapse side navigation"
                title="Collapse side navigation"
              >
                <HugeiconsIcon icon={Layout03Icon} size={16} strokeWidth={2.1} />
              </button>
            )}
          </div>
          {!desktopCompact && <div className="h-px w-full bg-sidebar-border" />}
        </SidebarHeader>

        {/* ---- Content: Nav items or drill view ---- */}
        <SidebarContent className={desktopCompact ? 'px-0' : 'px-1'}>
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

        {/* ---- Footer: Account card (Vercel-style) ---- */}
        <SidebarFooter className="border-0 px-0 pt-0">
          <MenuRoot positioning={{ placement: 'top-start', offset: { mainAxis: 8, crossAxis: 0 } }}>
            <div className={cn(desktopCompact ? 'flex justify-center px-0 py-2' : 'flex items-center gap-2 px-3 py-2')}>
              {/* Avatar + username + dots — all trigger the menu */}
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

              {/* Bell with notification dot */}
              {!desktopCompact && (
                <button
                  type="button"
                  className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <IconBell size={16} stroke={1.75} />
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                </button>
              )}
            </div>
            <MenuPositioner>
              <AccountMenuContent
                userLabel={userLabel}
                docsSiteUrl={docsSiteUrl}
                onNavigate={() => { navigate('/app/settings'); onNavigate?.(); }}
                onSignOut={onSignOut}
              />
            </MenuPositioner>
          </MenuRoot>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
