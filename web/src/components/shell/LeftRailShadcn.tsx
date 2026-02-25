import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
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

function isDocumentsRoute(pathname: string): boolean {
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
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [documentsMenuExpanded, setDocumentsMenuExpanded] = useState(false);
  const projectPickerRef = useRef<HTMLDivElement | null>(null);
  const projectTriggerRef = useRef<HTMLButtonElement | null>(null);

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

  const selectedProject = useMemo(
    () => projectOptions.find((project) => project.value === projectSelectValue) ?? null,
    [projectOptions, projectSelectValue],
  );

  useEffect(() => {
    setProjectPickerOpen(false);
  }, [desktopCompact, location.pathname]);

  useEffect(() => {
    if (isDocumentsRoute(location.pathname)) return;
    setDocumentsMenuExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!projectPickerOpen) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (projectPickerRef.current?.contains(target)) return;
      setProjectPickerOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setProjectPickerOpen(false);
      projectTriggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [projectPickerOpen]);

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
    if (path === '/app/documents') {
      return (
        /^\/app\/projects\/[^/]+\/upload/.test(location.pathname)
        || (
          location.pathname.startsWith('/app/projects')
          && !location.pathname.startsWith('/app/projects/list')
        )
        || location.pathname.startsWith('/app/extract')
        || location.pathname.startsWith('/app/transform')
      );
    }
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

  const navigateTo = (path: string) => {
    navigate(globalPathOverrides[path] ?? path);
    onNavigate?.();
  };

  const onProjectChanged = (nextProjectId: string) => {
    if (!nextProjectId) return;
    setFocusedProjectId(nextProjectId);
    setProjectPickerOpen(false);

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
            'border-b border-sidebar-border',
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
                  : 'px-2 py-1 text-[length:var(--app-font-size-brand)]',
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

          {!desktopCompact && (
            <>
              <div
                data-testid="left-rail-project-separator"
                className="-mx-2 h-px bg-sidebar-border"
              />
              <div className="space-y-2 px-2 pb-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[length:var(--app-font-size-nav-label)] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/65">
                    Project
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[length:var(--app-font-size-nav-caption)] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => {
                      navigate('/app/projects');
                      onNavigate?.();
                    }}
                  >
                    <IconPlus size={13} stroke={2.1} />
                    New Project
                  </button>
                </div>

                <div ref={projectPickerRef} className="relative">
                  <button
                    ref={projectTriggerRef}
                    type="button"
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input/80 bg-background/95 px-2.5 text-left shadow-sm transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-haspopup="listbox"
                    aria-expanded={projectPickerOpen}
                    aria-label="Select project"
                    onClick={() => setProjectPickerOpen((current) => !current)}
                    disabled={projectOptionsLoading && projectOptions.length === 0}
                  >
                    <span className="min-w-0 pr-2">
                      <span className="block truncate text-[length:var(--app-font-size-nav-strong)] font-semibold leading-5 text-foreground">
                        {projectOptionsLoading && projectOptions.length === 0
                          ? 'Loading projects...'
                          : (selectedProject?.label ?? 'Select project')}
                      </span>
                      <span className="block truncate text-[length:var(--app-font-size-nav-caption)] leading-4 text-sidebar-foreground/70">
                        {projectOptionsLoading && projectOptions.length === 0
                          ? 'Fetching project list'
                          : (selectedProject ? `${selectedProject.docCount} docs` : 'Choose a project for menu routing')}
                      </span>
                    </span>
                    <IconChevronDown
                      size={16}
                      stroke={2}
                      className={cn(
                        'shrink-0 text-muted-foreground transition-transform duration-150',
                        projectPickerOpen ? 'rotate-180' : '',
                      )}
                    />
                  </button>

                  {projectPickerOpen && (
                    <div
                      role="listbox"
                      aria-label="Project list"
                      className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-72 overflow-y-auto rounded-md border border-sidebar-border bg-sidebar p-1 shadow-xl"
                    >
                      {projectOptions.length === 0 ? (
                        <div className="px-2.5 py-2 text-[length:var(--app-font-size-nav-caption)] text-sidebar-foreground/70">
                          {projectOptionsLoading ? 'Loading projects...' : 'No projects found'}
                        </div>
                      ) : (
                        projectOptions.map((project) => {
                          const isSelected = project.value === projectSelectValue;
                          return (
                            <button
                              key={project.value}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={cn(
                                'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors',
                                isSelected
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                              )}
                              onClick={() => onProjectChanged(project.value)}
                            >
                              <span className="min-w-0 pr-2">
                                <span className="block truncate text-[length:var(--app-font-size-nav)] font-medium leading-5">
                                  {project.label}
                                </span>
                                <span className="block text-[length:var(--app-font-size-nav-caption)] leading-4 text-sidebar-foreground/65">
                                  {project.docCount} docs
                                </span>
                              </span>
                              {isSelected ? <IconCheck size={15} stroke={2.2} className="shrink-0" /> : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div
                  data-testid="left-rail-project-bottom-separator"
                  className="-mx-2 h-px w-[calc(100%+1rem)] bg-sidebar-border"
                />
              </div>
            </>
          )}
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup className="p-1">
            <SidebarGroupContent>
              <SidebarMenu>
                {orderedGlobalMenus.map((menu) => {
                  const IconComponent = menu.icon;
                  const menuPath = globalPathOverrides[menu.path] ?? menu.path;
                  const hasChildren = (menu.children?.length ?? 0) > 0;
                  const isCollapsibleDocumentsMenu = menu.path === '/app/documents' && hasChildren && !desktopCompact;
                  const shouldShowChildren = hasChildren && (!isCollapsibleDocumentsMenu || documentsMenuExpanded);
                  const submenuId = isCollapsibleDocumentsMenu ? 'documents-submenu' : undefined;

                  return (
                    <SidebarMenuItem key={menu.path}>
                      <SidebarMenuButton
                        isActive={isGlobalMenuActive(menu.path)}
                        tooltip={menu.label}
                        className={cn(
                          desktopCompact
                            ? 'size-10 justify-center p-0'
                            : 'h-11 text-[14px] font-semibold tracking-tight',
                        )}
                        {...(isCollapsibleDocumentsMenu
                          ? {
                              onClick: () => setDocumentsMenuExpanded((current) => !current),
                              'aria-expanded': documentsMenuExpanded,
                              'aria-controls': submenuId,
                            }
                          : { asChild: true })}
                      >
                        {isCollapsibleDocumentsMenu ? (
                          <>
                            <IconComponent size={16} stroke={1.9} />
                            <span>{menu.label}</span>
                            <IconChevronDown
                              size={16}
                              stroke={2}
                              className={cn(
                                'ml-auto transition-transform duration-150',
                                documentsMenuExpanded ? 'rotate-180' : '',
                              )}
                            />
                          </>
                        ) : (
                          <a
                            href={menuPath}
                            onClick={(event) => {
                              event.preventDefault();
                              navigateTo(menu.path);
                            }}
                          >
                            <IconComponent size={16} stroke={1.9} />
                            {!desktopCompact && <span>{menu.label}</span>}
                          </a>
                        )}
                      </SidebarMenuButton>
                      {!desktopCompact && shouldShowChildren && (
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
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border px-2 pt-1.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={false}
                tooltip="Search"
                className={cn(
                  desktopCompact
                    ? 'size-10 justify-center p-0'
                    : 'h-10 text-[14px] font-medium',
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
                      : 'h-10 text-[14px] font-medium',
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
                    : 'h-10 text-[14px] font-medium',
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

            {onSignOut && desktopCompact && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    void onSignOut();
                  }}
                  tooltip="Sign out"
                  className="size-10 justify-center p-0"
                >
                  <IconLogout size={16} stroke={1.9} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>

          {!desktopCompact && (
            <>
              <div
                data-testid="left-rail-account-separator"
                className="-mx-2 mt-2 h-px bg-sidebar-border"
              />
              <div className="px-1.5 py-2">
                <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent/35 text-[length:var(--app-font-size-nav-caption)] font-semibold text-sidebar-foreground/90"
                    aria-hidden
                  >
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[length:var(--app-font-size-nav-label)] leading-4 text-sidebar-foreground/65">
                      Signed in as
                    </div>
                    <div className="truncate text-[length:var(--app-font-size-nav)] font-semibold leading-5 text-foreground">
                      {userLabel ?? userInitial}
                    </div>
                  </div>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    aria-label="Sign out"
                    title="Sign out"
                    onClick={() => {
                      void onSignOut();
                    }}
                  >
                    <IconLogout size={15} stroke={2} />
                  </button>
                )}
                </div>
              </div>
            </>
          )}
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
