import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Collapsible } from '@ark-ui/react/collapsible';
import { Select, createListCollection } from '@ark-ui/react/select';
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconComponents,
  IconLogout,
  IconPlus,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AiAssistantIcon } from '@/components/icons/AiAssistantIcon';
import { GLOBAL_MENUS } from '@/components/shell/nav-config';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { styleTokens } from '@/lib/styleTokens';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type LeftRailShadcnProps = {
  onNavigate?: () => void;
  userLabel?: string;
  onSignOut?: () => void | Promise<void>;
  desktopCompact?: boolean;
  onToggleDesktopCompact?: () => void;
  showAssistantToggle?: boolean;
  assistantOpened?: boolean;
  onToggleAssistant?: () => void;
};

type ProjectFocusOption = {
  value: string;
  label: string;
  docCount: number;
  workspaceId: string | null;
};

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';

const GLOBAL_MENU_ORDER: Record<string, number> = {
  '/app/flows': 0,
  '/app/documents': 1,
  '/app/projects/list': 2,
  '/app/schemas': 3,
};

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

export function isDocumentsMenuRoute(pathname: string): boolean {
  return (
    /^\/app\/projects\/[^/]+\/upload/.test(pathname)
    || (
      pathname.startsWith('/app/projects')
      && !pathname.startsWith('/app/projects/list')
    )
    || pathname.startsWith('/app/extract')
    || pathname.startsWith('/app/transform')
  );
}

export function LeftRailShadcn({
  onNavigate,
  userLabel,
  onSignOut,
  desktopCompact = false,
  onToggleDesktopCompact,
  showAssistantToggle = true,
  assistantOpened = false,
  onToggleAssistant,
}: LeftRailShadcnProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProjectMatch = location.pathname.match(/^\/app\/(?:projects|extract|transform|flows)\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;

  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(() => readStoredProjectId());
  const [projectOptions, setProjectOptions] = useState<ProjectFocusOption[]>([]);
  const [projectOptionsLoading, setProjectOptionsLoading] = useState(false);
  const [documentsMenuExpanded, setDocumentsMenuExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedProjectId = activeProjectId ?? focusedProjectId;
    if (persistedProjectId) {
      window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, persistedProjectId);
      return;
    }
    window.localStorage.removeItem(PROJECT_FOCUS_STORAGE_KEY);
  }, [activeProjectId, focusedProjectId]);

  useEffect(() => {
    let cancelled = false;

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
          if (!cancelled) {
            setProjectOptions([]);
            setProjectOptionsLoading(false);
          }
          return;
        }

        rows = ((fallbackProjects.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          ...row,
          doc_count: 0,
        }));
      } else {
        rows = (data ?? []) as Array<Record<string, unknown>>;
      }

      if (cancelled) return;

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

    void loadProjectOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectSelectValue = useMemo(() => {
    const candidate = activeProjectId ?? focusedProjectId;
    if (!candidate) return '';
    return projectOptions.some((project) => project.value === candidate)
      ? candidate
      : '';
  }, [activeProjectId, focusedProjectId, projectOptions]);

  const projectCollection = useMemo(
    () => createListCollection({ items: projectOptions }),
    [projectOptions],
  );

  const orderedGlobalMenus = useMemo(
    () => [...GLOBAL_MENUS].sort((a, b) => (
      (GLOBAL_MENU_ORDER[a.path] ?? Number.MAX_SAFE_INTEGER)
      - (GLOBAL_MENU_ORDER[b.path] ?? Number.MAX_SAFE_INTEGER)
    )),
    [],
  );

  const parsePath = projectSelectValue ? `/app/projects/${projectSelectValue}` : '/app/projects';
  const extractPath = projectSelectValue
    ? `/app/extract/${projectSelectValue}`
    : '/app/extract';
  const transformPath = projectSelectValue
    ? `/app/transform/${projectSelectValue}`
    : '/app/transform';
  const uploadPath = projectSelectValue
    ? `/app/projects/${projectSelectValue}/upload`
    : '/app/projects';
  const flowsPath = projectSelectValue
    ? `/app/flows/${projectSelectValue}/overview`
    : '/app/flows';

  const globalPathOverrides: Record<string, string> = {
    '/app/flows': flowsPath,
    '/app/documents': desktopCompact ? uploadPath : parsePath,
    '/app/projects': parsePath,
    '/app/extract': extractPath,
    '/app/upload': uploadPath,
    '/app/transform': transformPath,
  };

  const isGlobalMenuActive = (path: string): boolean => {
    if (path === '/app/flows') return location.pathname.startsWith('/app/flows');
    if (path === '/app/documents') return isDocumentsMenuRoute(location.pathname);
    if (path === '/app/projects') {
      return (
        location.pathname.startsWith('/app/projects')
        && !location.pathname.startsWith('/app/projects/list')
        && !/^\/app\/projects\/[^/]+\/upload/.test(location.pathname)
      );
    }
    if (path === '/app/upload') return /^\/app\/projects\/[^/]+\/upload/.test(location.pathname);
    if (path === '/app/projects/list') return location.pathname.startsWith('/app/projects/list');
    if (path === '/app/extract') return location.pathname.startsWith('/app/extract');
    if (path === '/app/transform') return location.pathname.startsWith('/app/transform');
    if (path === '/app/schemas') return location.pathname.startsWith('/app/schemas');
    return location.pathname.startsWith(path);
  };

  const documentsMenuOpen = isDocumentsMenuRoute(location.pathname) || documentsMenuExpanded;

  const navigateTo = (path: string) => {
    if (path !== '/app/documents') {
      setDocumentsMenuExpanded(false);
    }
    navigate(globalPathOverrides[path] ?? path);
    onNavigate?.();
  };

  const onProjectChanged = (nextProjectId: string) => {
    if (!nextProjectId) return;
    setFocusedProjectId(nextProjectId);

    if (location.pathname.startsWith('/app/extract')) {
      navigate(`/app/extract/${nextProjectId}`);
    } else if (location.pathname.startsWith('/app/flows')) {
      navigate(`/app/flows/${nextProjectId}/overview`);
    } else if (/^\/app\/projects\/[^/]+\/upload/.test(location.pathname)) {
      navigate(`/app/projects/${nextProjectId}/upload`);
    } else if (location.pathname.startsWith('/app/transform')) {
      navigate(`/app/transform/${nextProjectId}`);
    } else {
      navigate(`/app/projects/${nextProjectId}`);
    }
    onNavigate?.();
  };

  const userInitial = userLabel?.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? '?';

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
        <SidebarHeader
          className={cn(
            desktopCompact
              ? 'h-[var(--app-shell-header-height)] gap-0 px-0 py-0'
              : 'gap-0 px-0 py-0',
          )}
        >
          <div
            className={cn(
              'flex items-center',
              desktopCompact
                ? 'h-full justify-center'
                : 'h-[var(--app-shell-header-height)] justify-between px-2',
            )}
          >
            <button
              type="button"
              className={cn(
                'inline-flex items-center rounded-md text-left font-semibold tracking-tight hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                desktopCompact
                  ? 'size-10 justify-center p-0 text-base'
                  : 'px-2 py-1 text-[27px]',
              )}
              onClick={() => {
                if (desktopCompact && onToggleDesktopCompact) {
                  onToggleDesktopCompact();
                  return;
                }
                navigate('/app/projects');
                onNavigate?.();
              }}
              aria-label={desktopCompact ? 'Expand side navigation' : 'Go to home'}
            >
              {desktopCompact ? 'B' : 'BlockData'}
            </button>
            {!desktopCompact && onToggleDesktopCompact && (
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={onToggleDesktopCompact}
                aria-label="Collapse side navigation"
                title="Collapse side navigation"
              >
                <IconChevronLeft size={16} stroke={2.1} />
              </button>
            )}
          </div>

          <div
            data-testid="left-rail-project-separator"
            className="h-px w-full bg-sidebar-border"
          />
          {!desktopCompact && (
            <>
              <div className="px-2 pb-1.5 pt-1.5">
                <div className="flex w-full items-center gap-1.5">
                <Select.Root
                  className="min-w-0 flex-1"
                  collection={projectCollection}
                  value={projectSelectValue ? [projectSelectValue] : []}
                  onValueChange={(details) => {
                    const nextProjectId = details.value[0];
                    if (!nextProjectId || nextProjectId === projectSelectValue) return;
                    onProjectChanged(nextProjectId);
                  }}
                  disabled={projectOptionsLoading && projectOptions.length === 0}
                  positioning={{ placement: 'bottom-start', sameWidth: true, offset: { mainAxis: 6 }, strategy: 'fixed' }}
                >
                  <Select.Control className="relative flex-1">
                    <Select.Trigger
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input/80 bg-background/95 px-2 text-left shadow-sm transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      aria-label="Select project"
                    >
                      <span className="min-w-0 pr-1.5">
                        <Select.ValueText
                          className="block truncate text-sm font-semibold leading-none text-foreground"
                          placeholder={projectOptionsLoading && projectOptions.length === 0 ? 'Loading projects...' : 'Select project'}
                        />
                      </span>
                      <Select.Indicator className="shrink-0 text-muted-foreground">
                        <IconChevronDown size={16} stroke={2} />
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>

                  <Select.Positioner className="!z-[220]">
                      <Select.Content className="max-h-72 overflow-y-auto rounded-md border border-sidebar-border bg-sidebar p-1 shadow-xl">
                        {projectCollection.items.length === 0 ? (
                          <div className="px-2.5 py-2 text-xs text-sidebar-foreground/70">
                            {projectOptionsLoading ? 'Loading projects...' : 'No projects found'}
                          </div>
                        ) : (
                          projectCollection.items.map((project) => (
                            <Select.Item
                              key={project.value}
                              item={project}
                              className={cn(
                                'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sidebar-foreground/90 transition-colors',
                                'data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground',
                                'data-[highlighted]:bg-sidebar-accent/70 data-[highlighted]:text-sidebar-accent-foreground',
                              )}
                            >
                              <span className="min-w-0 pr-2">
                                <Select.ItemText className="block truncate text-sm font-medium leading-5">
                                  {project.label}
                                </Select.ItemText>
                                <span className="block text-xs leading-4 text-sidebar-foreground/65">
                                  {project.docCount} docs
                                </span>
                              </span>
                              <Select.ItemIndicator className="shrink-0">
                                <IconCheck size={15} stroke={2.2} />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))
                        )}
                      </Select.Content>
                    </Select.Positioner>
                  <Select.HiddenSelect name="project-focus" />
                </Select.Root>
                <button
                  type="button"
                  className="inline-flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-input/80 bg-background/95 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  onClick={() => {
                    navigate('/app/projects/list?new=1');
                    onNavigate?.();
                  }}
                  aria-label="Create new project"
                  title="Create new project"
                >
                  <IconPlus size={14} stroke={2.1} />
                </button>
                </div>
              </div>
              <div
                data-testid="left-rail-project-bottom-separator"
                className="h-px w-full bg-sidebar-border"
              />
            </>
          )}
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup className="p-1">
            <SidebarGroupContent>
              <SidebarMenu>
                {orderedGlobalMenus.map((menu) => {
                  const menuPath = globalPathOverrides[menu.path] ?? menu.path;
                  const compactMenuLabel = menu.label.slice(0, 3).toUpperCase();
                  const hasChildren = (menu.children?.length ?? 0) > 0;
                  const isCollapsibleDocumentsMenu = menu.path === '/app/documents' && hasChildren && !desktopCompact;
                  const submenuId = isCollapsibleDocumentsMenu ? 'documents-submenu' : undefined;

                  const childrenContent = hasChildren ? (
                    <SidebarMenuSub id={submenuId} className="mx-0 mt-1 translate-x-0 border-l-0 px-0 py-0.5">
                      {menu.children!.map((child) => {
                        const childPath = globalPathOverrides[child.path] ?? child.path;
                        return (
                          <SidebarMenuSubItem key={child.path}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isGlobalMenuActive(child.path)}
                              className="h-9 rounded-md px-2 text-[13px] font-medium text-sidebar-foreground/90 hover:text-sidebar-accent-foreground"
                            >
                              <a
                                href={childPath}
                                onClick={(event) => {
                                  event.preventDefault();
                                  navigateTo(child.path);
                                }}
                              >
                                <span>{child.label}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  ) : null;

                  if (isCollapsibleDocumentsMenu) {
                    return (
                      <SidebarMenuItem key={menu.path}>
                        <Collapsible.Root
                          open={documentsMenuOpen}
                          onOpenChange={(details) => setDocumentsMenuExpanded(details.open)}
                          lazyMount
                          unmountOnExit
                        >
                          <SidebarMenuButton
                            isActive={isGlobalMenuActive(menu.path)}
                            tooltip={menu.label}
                            className={cn(
                              desktopCompact
                                ? 'size-10 justify-center p-0'
                                : 'h-10 px-2 !text-lg !font-semibold leading-snug',
                            )}
                          onClick={() => setDocumentsMenuExpanded((current) => !current)}
                          aria-expanded={documentsMenuOpen}
                          aria-controls={submenuId}
                        >
                          <span>{menu.label}</span>
                          <IconChevronDown
                            size={16}
                              stroke={2}
                              className={cn(
                                'ml-auto transition-transform duration-150',
                                documentsMenuOpen ? 'rotate-180' : '',
                              )}
                            />
                          </SidebarMenuButton>
                          <Collapsible.Content>
                            {childrenContent}
                          </Collapsible.Content>
                        </Collapsible.Root>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={menu.path}>
                      <SidebarMenuButton
                        isActive={isGlobalMenuActive(menu.path)}
                        tooltip={menu.label}
                        className={cn(
                          desktopCompact
                            ? 'size-10 justify-center p-0'
                            : 'h-10 px-2 text-lg font-semibold leading-snug',
                        )}
                        asChild
                      >
                        <a
                          href={menuPath}
                          onClick={(event) => {
                            event.preventDefault();
                            navigateTo(menu.path);
                          }}
                        >
                          {desktopCompact ? (
                            <span className="text-[var(--app-font-size-nav-caption)] font-semibold uppercase tracking-[0.04em] leading-none">
                              {compactMenuLabel}
                            </span>
                          ) : (
                            <span>{menu.label}</span>
                          )}
                        </a>
                      </SidebarMenuButton>
                      {!desktopCompact && hasChildren && childrenContent}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border px-0 pt-1.5">
          <div className="px-2">
            <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={false}
                tooltip="Search"
                className={cn(
                  desktopCompact
                    ? 'size-10 justify-center p-0'
                    : 'h-10 text-base font-medium',
                )}
              >
                <a
                  href="/app/projects"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate('/app/projects');
                    onNavigate?.();
                  }}
                >
                  <IconSearch size={16} stroke={1.9} />
                  {!desktopCompact && <span>Search</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {showAssistantToggle && onToggleAssistant && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={assistantOpened}
                  onClick={onToggleAssistant}
                  tooltip={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
                  className={cn(
                    desktopCompact
                      ? 'size-10 justify-center p-0'
                      : 'h-10 text-base font-medium',
                  )}
                >
                  <AiAssistantIcon
                    size={16}
                    style={{
                      filter: assistantOpened
                        ? `drop-shadow(0 0 8px ${styleTokens.accents.assistantGlow})`
                        : undefined,
                    }}
                  />
                  {!desktopCompact && <span>{assistantOpened ? 'Hide Assistant' : 'Show Assistant'}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith('/app/settings')}
                tooltip="Settings"
                className={cn(
                  desktopCompact
                    ? 'size-10 justify-center p-0'
                    : 'h-10 text-base font-medium',
                )}
              >
                <a
                  href="/app/settings"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate('/app/settings');
                    onNavigate?.();
                  }}
                >
                  <IconSettings size={16} stroke={1.9} />
                  {!desktopCompact && <span>Settings</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith('/app/ui')}
                tooltip="UI Catalog"
                className={cn(
                  desktopCompact
                    ? 'size-10 justify-center p-0'
                    : 'h-10 text-base font-medium',
                )}
              >
                <a
                  href="/app/ui"
                  onClick={(event) => {
                    event.preventDefault();
                    navigate('/app/ui');
                    onNavigate?.();
                  }}
                >
                  <IconComponents size={16} stroke={1.9} />
                  {!desktopCompact && <span>UI Catalog</span>}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            </SidebarMenu>
          </div>

          <>
            <div
              data-testid="left-rail-account-separator"
              className={cn(
                'h-px w-full bg-sidebar-border',
                desktopCompact ? 'mt-3' : 'mt-4',
              )}
            />
            <div className={cn(desktopCompact ? 'px-0 py-2' : 'px-1.5 py-2')}>
              <div
                className={cn(
                  'flex items-center gap-2',
                  desktopCompact ? 'flex-col justify-center gap-1.5 px-0 py-0.5' : 'justify-between px-1 py-0.5',
                )}
              >
                <div className={cn('flex min-w-0 items-center gap-2', desktopCompact && 'w-full flex-col gap-1 text-center')}>
                  <div
                    className={cn(
                      'flex shrink-0 items-center justify-center rounded-md bg-sidebar-accent/35 text-xs font-semibold text-sidebar-foreground/90',
                      desktopCompact ? 'h-9 w-9' : 'h-8 w-8',
                    )}
                    aria-hidden
                  >
                    {userInitial}
                  </div>
                  <div className={cn('min-w-0', desktopCompact && 'w-full max-w-[4.5rem] px-1')}>
                    <div
                      className={cn(
                        'text-[11px] leading-4 text-sidebar-foreground/65',
                        desktopCompact && 'text-center text-[11px]',
                      )}
                    >
                      Signed in as
                    </div>
                    <div
                      className={cn(
                        'truncate text-sm font-semibold leading-5 text-foreground',
                        desktopCompact && 'text-center text-[12px] leading-4',
                      )}
                    >
                      {userLabel ?? userInitial}
                    </div>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    className={cn(
                      'inline-flex items-center justify-center rounded-md text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      desktopCompact ? 'h-9 w-9' : 'h-8 w-8',
                    )}
                    aria-label="Sign out"
                    title="Sign out"
                    onClick={() => {
                      void onSignOut();
                    }}
                  >
                    <IconLogout size={desktopCompact ? 16 : 15} stroke={desktopCompact ? 1.9 : 2} />
                  </button>
                )}
              </div>
            </div>
          </>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
