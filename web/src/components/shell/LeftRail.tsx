import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Box, Button, Group, Kbd, Loader, Modal, NavLink, Select, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { useDisclosure, useHotkeys, useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import type { Icon } from '@tabler/icons-react';
import { IconChevronLeft, IconLogout, IconPlus, IconSearch, IconSettings } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AiAssistantIcon } from '@/components/icons/AiAssistantIcon';
import { GLOBAL_MENUS, NAV_GROUPS } from '@/components/shell/nav-config';
import { ICON_TOKENS } from '@/lib/iconTokens';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { styleTokens } from '@/lib/styleTokens';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import './LeftRail.css';

type LeftRailProps = {
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
type RailIcon = (typeof GLOBAL_MENUS)[number]['icon'];
type SearchAction = {
  id: string;
  label: string;
  group: string;
  path: string;
  icon: Icon;
};

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';
const GLOBAL_MENU_ORDER: Record<string, number> = {
  '/app/flows': 0, // Flows
  '/app/documents': 1, // Documents
  '/app/projects/list': 2, // Database
  '/app/schemas': 3, // Schema
};
const GLOBAL_MENU_COMPACT_CODE: Record<string, string> = {
  '/app/flows': 'F',
  '/app/documents': 'DOC',
  '/app/projects/list': 'DB',
  '/app/schemas': 'S',
};
const ACCOUNT_ACTION_ICON = ICON_TOKENS.shell.configAction;

function buildSearchActions(): SearchAction[] {
  const globalPaths = new Set<string>();
  const globalActions: SearchAction[] = GLOBAL_MENUS.flatMap((item) => {
    globalPaths.add(item.path);
    const actions: SearchAction[] = [{
      id: `global-${item.path}`,
      label: item.label,
      group: 'Global',
      path: item.path,
      icon: item.icon,
    }];
    for (const child of item.children ?? []) {
      globalPaths.add(child.path);
      actions.push({
        id: `global-${item.path}-${child.path}`,
        label: child.label,
        group: item.label,
        path: child.path,
        icon: child.icon,
      });
    }
    return actions;
  });
  const groupedActions: SearchAction[] = NAV_GROUPS.flatMap((group) =>
    group.items
      .filter((item) => !globalPaths.has(item.path))
      .map((item) => ({
        id: item.path,
        label: item.label,
        group: group.label,
        path: item.path,
        icon: item.icon,
      })),
  );
  return [...globalActions, ...groupedActions];
}

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

export function LeftRail({
  onNavigate,
  userLabel,
  onSignOut,
  desktopCompact = false,
  onToggleDesktopCompact,
  showAssistantToggle = true,
  assistantOpened = false,
  onToggleAssistant,
}: LeftRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navIconSize = desktopCompact ? 20 : 16;
  const navPaddingX = 'xs';
  const navPaddingY = 4;
  const quickActionPaddingY = 6;
  const activeProjectMatch = location.pathname.match(/^\/app\/(?:projects|extract|transform|flows)\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;
  const [focusedProjectId, setFocusedProjectId] = useLocalStorage<string | null>({
    key: PROJECT_FOCUS_STORAGE_KEY,
    defaultValue: null,
  });
  const [projectOptions, setProjectOptions] = useState<ProjectFocusOption[]>([]);
  const [projectOptionsLoading, setProjectOptionsLoading] = useState(false);
  const [createProjectOpened, { open: openCreateProject, close: closeCreateProject }] = useDisclosure(false);
  const [searchOpened, { open: openSearch, close: closeSearch }] = useDisclosure(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  const [documentsMenuOpened, setDocumentsMenuOpened] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const allSearchActions = useMemo(() => buildSearchActions(), []);
  const getGroupKey = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

  const filteredSearchActions = useMemo(
    () => (
      searchQuery.trim()
        ? allSearchActions.filter((action) => action.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : allSearchActions
    ),
    [allSearchActions, searchQuery],
  );

  const handleOpenSearch = () => {
    setSearchSelectedIndex(0);
    openSearch();
  };

  useHotkeys([['mod+k', () => handleOpenSearch()]]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (activeProjectId !== focusedProjectId) {
      setFocusedProjectId(activeProjectId);
    }
  }, [activeProjectId, focusedProjectId, setFocusedProjectId]);

  useEffect(() => {
    if (!searchOpened) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchOpened]);

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

  const projectSelectData = useMemo(
    () =>
      projectOptions.map((project) => ({
        value: project.value,
        label: `${project.label} (${project.docCount})`,
      })),
    [projectOptions],
  );

  const projectSelectValue = useMemo(() => {
    const candidate = activeProjectId ?? focusedProjectId;
    if (!candidate) return null;
    return projectOptions.some((project) => project.value === candidate)
      ? candidate
      : null;
  }, [activeProjectId, focusedProjectId, projectOptions]);
  const globalMenuPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const menu of GLOBAL_MENUS) {
      paths.add(menu.path);
      for (const child of menu.children ?? []) {
        paths.add(child.path);
      }
    }
    return paths;
  }, []);
  const orderedGlobalMenus = useMemo(
    () => [...GLOBAL_MENUS].sort((a, b) => (
      (GLOBAL_MENU_ORDER[a.path] ?? Number.MAX_SAFE_INTEGER)
      - (GLOBAL_MENU_ORDER[b.path] ?? Number.MAX_SAFE_INTEGER)
    )),
    [],
  );
  const documentsMenu = useMemo(
    () => orderedGlobalMenus.find((menu) => menu.path === '/app/documents') ?? null,
    [orderedGlobalMenus],
  );
  const quickActionMenus = useMemo(() => orderedGlobalMenus, [orderedGlobalMenus]);
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
    '/app/documents': parsePath,
    '/app/projects': parsePath,
    '/app/extract': extractPath,
    '/app/upload': uploadPath,
    '/app/transform': transformPath,
  };
  const userInitial = useMemo(() => {
    if (!userLabel) return '?';
    const first = userLabel.match(/[A-Za-z0-9]/)?.[0] ?? '?';
    return first.toUpperCase();
  }, [userLabel]);
  const maybeExpandCompactRail = (event: ReactMouseEvent<HTMLElement>) => {
    if (!desktopCompact || !onToggleDesktopCompact) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('a, button, input, textarea, select, label, [role="button"]')) return;
    onToggleDesktopCompact();
  };
  const handleCreateProject = async () => {
    const projectName = newProjectName.trim();
    if (!projectName) {
      notifications.show({
        color: 'red',
        title: 'Project name required',
        message: 'Enter a project name to create a project.',
      });
      return;
    }

    setCreatingProject(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      notifications.show({
        color: 'red',
        title: 'Authentication required',
        message: authError?.message ?? 'Unable to resolve current user.',
      });
      setCreatingProject(false);
      return;
    }

    const { data, error } = await supabase
      .from(TABLES.projects)
      .insert({
        owner_id: authData.user.id,
        workspace_id: projectOptions.find((project) => project.value === projectSelectValue)?.workspaceId
          ?? projectOptions[0]?.workspaceId
          ?? crypto.randomUUID(),
        project_name: projectName,
        description: newProjectDescription.trim() || null,
      })
      .select('project_id, project_name, workspace_id')
      .single();

    if (error) {
      notifications.show({
        color: 'red',
        title: 'Failed to create project',
        message: error.message,
      });
      setCreatingProject(false);
      return;
    }

    const createdProject = data as { project_id: string; project_name: string; workspace_id: string | null };
    setProjectOptions((prev) => [...prev, {
      value: createdProject.project_id,
      label: createdProject.project_name,
      docCount: 0,
      workspaceId: createdProject.workspace_id,
    }].sort((a, b) => a.label.localeCompare(b.label)));
    setFocusedProjectId(createdProject.project_id);
    setNewProjectName('');
    setNewProjectDescription('');
    closeCreateProject();
    setCreatingProject(false);
    navigate(`/app/projects/${createdProject.project_id}`);
    onNavigate?.();
    notifications.show({
      color: 'green',
      title: 'Project created',
      message: createdProject.project_name,
    });
  };

  const closeSearchModal = () => {
    setSearchQuery('');
    setSearchSelectedIndex(0);
    closeSearch();
  };

  const pickSearchAction = (action: SearchAction) => {
    navigate(globalPathOverrides[action.path] ?? action.path);
    closeSearchModal();
    onNavigate?.();
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSearchSelectedIndex((index) => Math.min(index + 1, filteredSearchActions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSearchSelectedIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && filteredSearchActions[searchSelectedIndex]) {
      event.preventDefault();
      pickSearchAction(filteredSearchActions[searchSelectedIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearchModal();
    }
  };

  const isItemActive = (path: string): boolean => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/projects') return location.pathname.startsWith('/app/projects');
    if (path === '/app/schemas') return location.pathname.startsWith('/app/schemas');
    return location.pathname.startsWith(path);
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
  const documentsMenuExpanded = documentsMenu
    ? isGlobalMenuActive(documentsMenu.path) || documentsMenuOpened
    : documentsMenuOpened;

  const renderRailItem = ({
    key,
    label,
    icon: IconComponent,
    active,
    onActivate,
    className = 'left-rail-link',
    py = 4,
    href,
    target,
    style,
  }: {
    key: string;
    label: string;
    icon: RailIcon;
    active: boolean;
    onActivate?: () => void;
    className?: string;
    py?: number;
    href?: string;
    target?: string;
    style?: React.CSSProperties;
  }) => {
    if (desktopCompact) {
      if (href) {
        return (
          <UnstyledButton
            key={key}
            className={`left-rail-icon-link${active ? ' is-active' : ''}`}
            component="a"
            href={href}
            target={target}
            aria-label={label}
            title={label}
            style={style}
          >
            <IconComponent size={navIconSize} stroke={1.9} />
          </UnstyledButton>
        );
      }

      return (
        <UnstyledButton
          key={key}
          className={`left-rail-icon-link${active ? ' is-active' : ''}`}
          onClick={onActivate}
          aria-label={label}
          title={label}
          style={style}
        >
          <IconComponent size={navIconSize} stroke={1.9} />
        </UnstyledButton>
      );
    }

    return (
      <NavLink
        key={key}
        label={label}
        className={className}
        leftSection={<IconComponent size={16} stroke={1.8} />}
        aria-label={label}
        title={label}
        px={navPaddingX}
        py={py}
        active={active}
        onClick={onActivate}
        component={href ? 'a' : undefined}
        href={href}
        target={target}
        style={style}
      />
    );
  };

  const renderGroup = (group: (typeof NAV_GROUPS)[number], groupIndex: number) => {
    const groupKey = getGroupKey(group.label);
    const isWorkspaceGroup = groupKey === 'workspace';
    const groupItems = isWorkspaceGroup
      ? group.items.filter((item) => !globalMenuPaths.has(item.path))
      : group.items;
    if (groupItems.length === 0) return null;
    const groupClassName = [groupIndex === 0 ? null : 'left-rail-group', isWorkspaceGroup ? 'left-rail-group-workspace' : null]
      .filter(Boolean)
      .join(' ');

    return (
      <Box
        key={group.label}
        mt={groupIndex === 0 ? 0 : 8}
        className={groupClassName || undefined}
        data-group={groupKey}
      >
      {!isWorkspaceGroup && (
        <Text px="xs" mb={2} className="left-rail-heading">
          {group.label}
        </Text>
      )}
      {groupItems.map((item) => renderRailItem({
        key: item.path,
        label: item.label,
        icon: item.icon,
        active: isItemActive(item.path),
        onActivate: () => {
          navigate(item.path);
          onNavigate?.();
        },
        className: 'left-rail-link',
        py: navPaddingY,
      }))}
      </Box>
    );
  };

  return (
    <>
    <Box className={`left-rail${desktopCompact ? ' is-compact' : ''}`} onClick={maybeExpandCompactRail}>
      <Box className="left-rail-brand-wrap">
        <Box className="left-rail-brand-row">
          <UnstyledButton
            type="button"
            className="left-rail-brand"
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
            <Text className="left-rail-brand-text">{desktopCompact ? 'B' : 'BlockData'}</Text>
          </UnstyledButton>
          {onToggleDesktopCompact && !desktopCompact && (
            <UnstyledButton
              type="button"
              className="left-rail-collapse-toggle"
              onClick={onToggleDesktopCompact}
              aria-label="Collapse side navigation"
              title="Collapse side navigation"
            >
              <IconChevronLeft
                size={ICON_TOKENS.shell.paneChevron.size}
                stroke={ICON_TOKENS.shell.paneChevron.stroke}
              />
            </UnstyledButton>
          )}
        </Box>
      </Box>

      <Box className="left-rail-content">
        <Box className="left-rail-project-focus-wrap">
          <Box className="left-rail-project-focus-head">
            <Text className="left-rail-project-focus-label">Project</Text>
            <UnstyledButton
              className="left-rail-project-focus-create"
              aria-label="Create new project"
              title="Create new project"
              onClick={openCreateProject}
            >
              <IconPlus size={12} stroke={2.4} />
            </UnstyledButton>
          </Box>
          <Select
            className="left-rail-project-focus"
            placeholder={projectOptionsLoading ? 'Loading projects...' : 'Select project'}
            data={projectSelectData}
            value={projectSelectValue}
            disabled={projectSelectData.length === 0}
            searchable
            comboboxProps={{ withinPortal: false }}
            maxDropdownHeight={280}
            nothingFoundMessage="No matching project"
            rightSection={projectOptionsLoading ? <Loader size={12} /> : null}
            onChange={(value) => {
              if (!value) return;
              setFocusedProjectId(value);
              if (location.pathname.startsWith('/app/extract')) {
                navigate(`/app/extract/${value}`);
              } else if (location.pathname.startsWith('/app/flows')) {
                navigate(`/app/flows/${value}/overview`);
              } else if (/^\/app\/projects\/[^/]+\/upload/.test(location.pathname)) {
                navigate(`/app/projects/${value}/upload`);
              } else if (location.pathname.startsWith('/app/transform')) {
                navigate(`/app/transform/${value}`);
              } else {
                navigate(`/app/projects/${value}`);
              }
              onNavigate?.();
            }}
          />
        </Box>

        <Box className="left-rail-quick-actions left-rail-quick-actions-locked">
          {quickActionMenus.map((menu) => {
            const onActivate = () => {
              navigate(globalPathOverrides[menu.path] ?? menu.path);
              onNavigate?.();
            };
            const isDocumentsMenu = menu.path === '/app/documents';
            const childMenus = menu.children ?? [];

            if (desktopCompact) {
              return (
                <UnstyledButton
                  key={menu.path}
                  className={`left-rail-icon-link left-rail-icon-link-code${isGlobalMenuActive(menu.path) ? ' is-active' : ''}`}
                  onClick={onActivate}
                  aria-label={menu.label}
                  title={menu.label}
                >
                  <Text className="left-rail-icon-link-text">
                    {GLOBAL_MENU_COMPACT_CODE[menu.path] ?? menu.label.charAt(0).toUpperCase()}
                  </Text>
                </UnstyledButton>
              );
            }

            if (isDocumentsMenu) {
              return (
                <NavLink
                  key={menu.path}
                  label={menu.label}
                  className="left-rail-link left-rail-quick-action"
                  aria-label={menu.label}
                  title={menu.label}
                  px={navPaddingX}
                  py={quickActionPaddingY}
                  active={isGlobalMenuActive(menu.path)}
                  opened={documentsMenuExpanded}
                  onClick={() => {
                    setDocumentsMenuOpened((previous) => !previous);
                    onActivate();
                  }}
                >
                  {childMenus.map((childMenu) => (
                    <NavLink
                      key={childMenu.path}
                      label={childMenu.label}
                      className="left-rail-link left-rail-quick-subaction"
                      aria-label={childMenu.label}
                      title={childMenu.label}
                      px={navPaddingX}
                      py={4}
                      active={isGlobalMenuActive(childMenu.path)}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        navigate(globalPathOverrides[childMenu.path] ?? childMenu.path);
                        onNavigate?.();
                      }}
                    />
                  ))}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={menu.path}
                label={menu.label}
                className="left-rail-link left-rail-quick-action"
                aria-label={menu.label}
                title={menu.label}
                px={navPaddingX}
                py={quickActionPaddingY}
                active={isGlobalMenuActive(menu.path)}
                onClick={onActivate}
              />
            );
          })}
        </Box>

        <Box mt="auto" className="left-rail-bottom-nav">
          {NAV_GROUPS.map((group, groupIndex) => renderGroup(group, groupIndex))}
        </Box>

        <Box className="left-rail-shell-controls" pt={desktopCompact ? 0 : 'xs'}>
          {desktopCompact ? (
            <>
              <UnstyledButton
                className={`left-rail-icon-link left-rail-control-icon${searchOpened ? ' is-active' : ''}`}
                onClick={handleOpenSearch}
                aria-label="Search pages"
                title="Search pages (Ctrl+K)"
              >
                <IconSearch size={20} stroke={1.8} />
              </UnstyledButton>
              {showAssistantToggle && onToggleAssistant && (
                <UnstyledButton
                  className={`left-rail-icon-link left-rail-control-icon${assistantOpened ? ' is-active' : ''}`}
                  onClick={onToggleAssistant}
                  aria-label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
                  title={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
                >
                  <AiAssistantIcon
                    size={20}
                    style={{
                      filter: assistantOpened
                        ? `drop-shadow(0 0 8px ${styleTokens.accents.assistantGlow})`
                        : undefined,
                    }}
                  />
                </UnstyledButton>
              )}
            </>
          ) : (
            <>
              <NavLink
                label="Search"
                className="left-rail-link left-rail-control-action"
                leftSection={<IconSearch size={16} stroke={1.8} />}
                rightSection={<Kbd size="xs" className="left-rail-control-kbd">Ctrl+K</Kbd>}
                aria-label="Search pages"
                title="Search pages"
                px={navPaddingX}
                py={navPaddingY}
                active={searchOpened}
                onClick={handleOpenSearch}
              />
              {showAssistantToggle && onToggleAssistant && (
                <NavLink
                  label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
                  className="left-rail-link left-rail-control-action"
                  leftSection={(
                    <AiAssistantIcon
                      size={18}
                      style={{
                        filter: assistantOpened
                          ? `drop-shadow(0 0 8px ${styleTokens.accents.assistantGlow})`
                          : undefined,
                      }}
                    />
                  )}
                  aria-label={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
                  title={assistantOpened ? 'Hide Assistant' : 'Show Assistant'}
                  px={navPaddingX}
                  py={navPaddingY}
                  active={assistantOpened}
                  onClick={onToggleAssistant}
                />
              )}
            </>
          )}
        </Box>

        {(userLabel || (onSignOut && !desktopCompact)) && (
          <Box pt={desktopCompact ? 0 : 'md'}>
            {desktopCompact ? (
              <Box className="left-rail-account-card" style={{ display: 'flex', justifyContent: 'center' }}>
                <Box className="left-rail-account-avatar" aria-label={userLabel} title={userLabel}>
                  {userInitial}
                </Box>
              </Box>
            ) : (
              <Box className="left-rail-account-card">
                <Box className="left-rail-account-head">
                  <Box className="left-rail-account-main">
                    <Box className="left-rail-account-avatar" aria-hidden>
                      {userInitial}
                    </Box>
                    <Box className="left-rail-account-user-block">
                      <Text className="left-rail-account-label">
                        Signed in as
                      </Text>
                      <Text className="left-rail-account-user" title={userLabel} truncate>
                        {userLabel}
                      </Text>
                    </Box>
                  </Box>

                  <Box className="left-rail-account-actions">
                    <UnstyledButton
                      className="left-rail-account-action-icon"
                      onClick={() => {
                        navigate('/app/settings');
                        onNavigate?.();
                      }}
                      aria-label="Settings"
                      title="Settings"
                    >
                      <IconSettings size={ACCOUNT_ACTION_ICON.size} stroke={ACCOUNT_ACTION_ICON.stroke} />
                    </UnstyledButton>
                    {onSignOut && (
                    <UnstyledButton
                      className="left-rail-account-action-signout-icon"
                      onClick={onSignOut}
                      aria-label="Sign out"
                      title="Sign out"
                    >
                      <IconLogout size={ACCOUNT_ACTION_ICON.size} stroke={ACCOUNT_ACTION_ICON.stroke} />
                    </UnstyledButton>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
    <Modal
      opened={searchOpened}
      onClose={closeSearchModal}
      title="Search pages"
      centered
      size="md"
      withinPortal
    >
      <Stack gap="sm">
        <TextInput
          ref={searchInputRef}
          placeholder="Type to filter pages..."
          leftSection={<IconSearch size={14} stroke={1.8} />}
          rightSection={<Kbd size="xs">Enter</Kbd>}
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.currentTarget.value);
            setSearchSelectedIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          autoComplete="off"
        />
        <Box className="left-rail-search-results" role="listbox" aria-label="Search results">
          {filteredSearchActions.length > 0 ? (
            filteredSearchActions.map((action, index) => {
              const ResultIcon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  className={`left-rail-search-item${index === searchSelectedIndex ? ' selected' : ''}`}
                  onMouseEnter={() => setSearchSelectedIndex(index)}
                  onClick={() => pickSearchAction(action)}
                >
                  <ResultIcon size={16} stroke={1.7} />
                  <span className="left-rail-search-item-main">
                    <span className="left-rail-search-item-label">{action.label}</span>
                    <span className="left-rail-search-item-group">{action.group}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <Text className="left-rail-search-empty">No matching pages</Text>
          )}
        </Box>
      </Stack>
    </Modal>
    <Modal opened={createProjectOpened} onClose={closeCreateProject} title="New Project" centered>
      <Stack gap="md">
        <TextInput
          label="Project name"
          value={newProjectName}
          onChange={(event) => setNewProjectName(event.currentTarget.value)}
          placeholder="e.g., Jon"
          data-autofocus
        />
        <TextInput
          label="Description (optional)"
          value={newProjectDescription}
          onChange={(event) => setNewProjectDescription(event.currentTarget.value)}
          placeholder="Brief description"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={closeCreateProject} disabled={creatingProject}>
            Cancel
          </Button>
          <Button onClick={handleCreateProject} loading={creatingProject} disabled={!newProjectName.trim()}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
    </>
  );
}
