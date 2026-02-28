import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Avatar } from '@ark-ui/react/avatar';
import { Select, createListCollection } from '@ark-ui/react/select';
import { TreeView, createTreeCollection, type TreeNode } from '@ark-ui/react/tree-view';
import {
  IconCheck,
  IconChevronDown,
  IconLayoutColumns,
  IconPlus,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { GLOBAL_MENUS } from '@/components/shell/nav-config';
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
  MenuSeparator,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

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

type RailTreeNode = TreeNode & {
  id: string;
  label: string;
  path?: string;
  children?: RailTreeNode[];
};

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';

const GLOBAL_MENU_ORDER: Record<string, number> = {
  '/app/flows': 0,
  '/app/elt': 1,
  '/app/editor': 2,
  '/app/integrations': 3,
  '/app/database': 4,
  '/app/schemas': 5,
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

function menuPathToNodeId(path: string) {
  return path.replace(/^\/app\//, '').replaceAll('/', '-');
}

export function LeftRailShadcn({
  onNavigate,
  userLabel,
  onSignOut,
  desktopCompact = false,
  onToggleDesktopCompact,
}: LeftRailShadcnProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeProjectMatch = location.pathname.match(/^\/app\/elt\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;

  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(() => readStoredProjectId());
  const [projectOptions, setProjectOptions] = useState<ProjectFocusOption[]>([]);
  const [projectOptionsLoading, setProjectOptionsLoading] = useState(false);

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

  const [userExpandedNodeIds, setUserExpandedNodeIds] = useState<string[]>([]);
  const eltPath = projectSelectValue ? `/app/elt/${projectSelectValue}` : '/app/elt';
  const flowsPath = '/app/flows';

  const globalPathOverrides: Record<string, string> = {
    '/app/flows': flowsPath,
    '/app/elt': eltPath,
  };
  const expandedNodeIds = userExpandedNodeIds;

  const activeMenuPath = useMemo(() => {
    if (location.pathname.startsWith('/app/flows')) return '/app/flows';
    if (location.pathname.startsWith('/app/elt')) return '/app/elt';
    if (location.pathname.startsWith('/app/editor')) return '/app/editor';
    if (location.pathname.startsWith('/app/integrations')) return '/app/integrations';
    if (location.pathname.startsWith('/app/database')) return '/app/database';
    if (location.pathname.startsWith('/app/schemas')) return '/app/schemas';
    return null;
  }, [location.pathname]);

  const activeNodeId = activeMenuPath ? menuPathToNodeId(activeMenuPath) : null;

  const navTreeCollection = useMemo(() => {
    const branchNodes: RailTreeNode[] = orderedGlobalMenus.map((menu) => ({
      id: menuPathToNodeId(menu.path),
      label: menu.label,
      path: menu.path,
      children: menu.children?.map((child) => ({
        id: menuPathToNodeId(child.path),
        label: child.label,
        path: child.path,
      })),
    }));

    return createTreeCollection<RailTreeNode>({
      rootNode: {
        id: 'root',
        label: 'Root',
        children: branchNodes,
      },
      nodeToValue: (node) => node.id,
      nodeToString: (node) => node.label,
      nodeToChildren: (node) => node.children ?? [],
    });
  }, [orderedGlobalMenus]);

  const navigateTo = (path: string) => {
    navigate(globalPathOverrides[path] ?? path);
    onNavigate?.();
  };

  const buildTreeRow = (node: RailTreeNode, indexPath: number[], state: {
    selected?: boolean;
    isBranch?: boolean;
  }) => {
    const rowPaddingLeft = desktopCompact
      ? '0px'
      : `${8 + Math.max(0, indexPath.length - 1) * 14}px`;
    const isNodeSelected = Boolean(state.selected);
    const rowClassName = cn(
      'flex items-center gap-2 rounded-md text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      desktopCompact ? 'h-10 px-2 text-sm font-semibold leading-snug' : 'h-10 px-2 text-[15px] font-semibold leading-snug',
      isNodeSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : null,
    );

    if (state.isBranch) {
      return (
        <TreeView.Branch>
          <TreeView.BranchControl
            className={rowClassName}
            style={{ paddingLeft: rowPaddingLeft }}
          >
            <TreeView.BranchText className="truncate">
              {node.label}
            </TreeView.BranchText>
          </TreeView.BranchControl>
        </TreeView.Branch>
      );
    }

    return (
      <TreeView.Item
        className={rowClassName}
        style={{ paddingLeft: rowPaddingLeft }}
      >
        <TreeView.ItemText className="truncate">
          {node.label}
        </TreeView.ItemText>
      </TreeView.Item>
    );
  };

  const renderMenuTree = () => (
    <TreeView.Root
      collection={navTreeCollection}
      selectionMode="single"
      selectedValue={activeNodeId ? [activeNodeId] : []}
      expandedValue={expandedNodeIds}
      onExpandedChange={(details) => setUserExpandedNodeIds(details.expandedValue)}
      onSelectionChange={(details) => {
        const nextNodeId = details.selectedValue[0];
        if (!nextNodeId) return;
        const nextNode = navTreeCollection.findNode(nextNodeId);
        if (!nextNode?.path) return;
        navigateTo(nextNode.path);
      }}
    >
      <TreeView.Tree className="space-y-1">
        <TreeView.Context>
          {(tree) => tree.getVisibleNodes().map((entry) => {
            const node = entry.node as RailTreeNode;
            const indexPath = entry.indexPath;
            return (
              <TreeView.NodeProvider key={node.id} node={node} indexPath={indexPath}>
                <TreeView.NodeContext>
                  {(state) => {
                    if (node.id === 'root') return null;
                    return buildTreeRow(node, indexPath, state);
                  }}
                </TreeView.NodeContext>
              </TreeView.NodeProvider>
            );
          })}
        </TreeView.Context>
      </TreeView.Tree>
    </TreeView.Root>
  );

  const onProjectChanged = (nextProjectId: string) => {
    if (!nextProjectId) return;
    setFocusedProjectId(nextProjectId);

    if (location.pathname.startsWith('/app/flows')) {
      navigate('/app/flows');
    } else if (location.pathname.startsWith('/app/editor')) {
      navigate('/app/editor');
    } else if (location.pathname.startsWith('/app/integrations')) {
      navigate('/app/integrations');
    } else if (location.pathname.startsWith('/app/database')) {
      navigate('/app/database');
    } else if (location.pathname.startsWith('/app/schemas')) {
      navigate('/app/schemas');
    } else {
      navigate(`/app/elt/${nextProjectId}`);
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
                navigate('/app/elt');
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
                <IconLayoutColumns size={16} stroke={2.1} />
              </button>
            )}
          </div>

          <div
            data-testid="left-rail-project-separator"
            className="h-px w-full bg-sidebar-border"
          />
          {!desktopCompact && (
            <>
              <div className="px-2 py-1">
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
                      className="flex h-8 w-full items-center justify-between rounded-md border border-input/80 bg-background/95 px-2 text-left shadow-sm transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
                  className="inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-md border border-input/80 bg-background/95 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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

        <SidebarContent className={desktopCompact ? 'px-0' : 'px-2'}>
          <SidebarGroup className={desktopCompact ? 'p-0' : 'p-1'}>
            <SidebarGroupContent>
              {desktopCompact ? (
                <div className="flex flex-col items-center gap-1 pt-1">
                  {orderedGlobalMenus.map((menu) => {
                    const MenuIcon = menu.icon;
                    const isActive = activeMenuPath === menu.path;
                    return (
                      <button
                        key={menu.path}
                        type="button"
                        onClick={() => navigateTo(menu.path)}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                        title={menu.label}
                        aria-label={menu.label}
                      >
                        <MenuIcon size={22} stroke={1.8} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                renderMenuTree()
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border px-0 pt-1.5">
          <div className={cn(desktopCompact ? 'px-0 py-2' : 'px-1.5 py-2')}>
            <MenuRoot positioning={{ placement: 'top-start' }}>
              <MenuTrigger
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border-none bg-transparent px-1 py-1 text-left',
                  'transition-colors hover:bg-sidebar-accent/50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  desktopCompact && 'flex-col justify-center px-0',
                )}
              >
                <Avatar.Root
                  className={cn(
                    'shrink-0',
                    desktopCompact ? 'h-9 w-9' : 'h-8 w-8',
                  )}
                >
                  <Avatar.Fallback
                    className={cn(
                      'flex h-full w-full items-center justify-center rounded-full bg-sidebar-accent/35 text-xs font-semibold text-sidebar-foreground/90',
                    )}
                  >
                    {userInitial}
                  </Avatar.Fallback>
                </Avatar.Root>
                {!desktopCompact && (
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] leading-4 text-sidebar-foreground/65">
                      Signed in as
                    </div>
                    <div className="truncate text-sm font-semibold leading-5 text-foreground">
                      {userLabel ?? userInitial}
                    </div>
                  </div>
                )}
              </MenuTrigger>
              <MenuPositioner>
                <MenuContent className="min-w-48">
                  <div className="truncate px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {userLabel ?? userInitial}
                  </div>
                  <MenuSeparator />
                  <MenuItem
                    value="settings"
                    className="gap-2"
                    onClick={() => {
                      navigate('/app/settings');
                      onNavigate?.();
                    }}
                  >
                    Settings
                  </MenuItem>
                  {onSignOut && (
                    <MenuItem
                      value="sign-out"
                      className="gap-2"
                      onClick={() => { void onSignOut(); }}
                    >
                      Sign out
                    </MenuItem>
                  )}
                </MenuContent>
              </MenuPositioner>
            </MenuRoot>
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
