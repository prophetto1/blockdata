import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Box, Button, Group, Loader, Modal, NavLink, Select, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconFileText, IconLogout, IconPlus } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GLOBAL_MENUS, NAV_GROUPS } from '@/components/shell/nav-config';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type LeftRailProps = {
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
type RailIcon = (typeof GLOBAL_MENUS)[number]['icon'];

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';
const GLOBAL_MENU_ORDER: Record<string, number> = {
  '/app/projects': 0, // Parse
  '/app/extract': 1, // Extract
  '/app/transform': 2, // Transform
  '/app/projects/list': 3, // Database
  '/app/schemas': 4, // Schema
};
const GLOBAL_MENU_COMPACT_CODE: Record<string, string> = {
  '/app/projects': 'P',
  '/app/extract': 'E',
  '/app/transform': 'T',
  '/app/projects/list': 'D',
  '/app/schemas': 'S',
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

export function LeftRail({
  onNavigate,
  userLabel,
  onSignOut,
  desktopCompact = false,
  onToggleDesktopCompact,
}: LeftRailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navIconSize = desktopCompact ? 20 : 16;
  const navPaddingX = 'xs';
  const navPaddingY = 4;
  const quickActionPaddingY = 6;
  const activeProjectMatch = location.pathname.match(/^\/app\/(?:projects|extract|transform)\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;
  const [focusedProjectId, setFocusedProjectId] = useLocalStorage<string | null>({
    key: PROJECT_FOCUS_STORAGE_KEY,
    defaultValue: null,
  });
  const [projectOptions, setProjectOptions] = useState<ProjectFocusOption[]>([]);
  const [projectOptionsLoading, setProjectOptionsLoading] = useState(false);
  const [createProjectOpened, { open: openCreateProject, close: closeCreateProject }] = useDisclosure(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const getGroupKey = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

  useEffect(() => {
    if (!activeProjectId) return;
    if (activeProjectId !== focusedProjectId) {
      setFocusedProjectId(activeProjectId);
    }
  }, [activeProjectId, focusedProjectId, setFocusedProjectId]);

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
  const globalMenuPaths = useMemo(
    () => new Set(GLOBAL_MENUS.map((menu) => menu.path)),
    [],
  );
  const orderedGlobalMenus = useMemo(
    () => [...GLOBAL_MENUS].sort((a, b) => (
      (GLOBAL_MENU_ORDER[a.path] ?? Number.MAX_SAFE_INTEGER)
      - (GLOBAL_MENU_ORDER[b.path] ?? Number.MAX_SAFE_INTEGER)
    )),
    [],
  );
  const schemaMenu = useMemo(
    () => orderedGlobalMenus.find((menu) => menu.path === '/app/schemas') ?? null,
    [orderedGlobalMenus],
  );
  const quickActionMenus = useMemo(
    () => orderedGlobalMenus.filter((menu) => menu.path !== '/app/schemas'),
    [orderedGlobalMenus],
  );
  const parsePath = projectSelectValue ? `/app/projects/${projectSelectValue}` : '/app/projects';
  const extractPath = projectSelectValue
    ? `/app/extract/${projectSelectValue}`
    : '/app/extract';
  const transformPath = projectSelectValue
    ? `/app/transform/${projectSelectValue}`
    : '/app/transform';
  const globalPathOverrides: Record<string, string> = {
    '/app/projects': parsePath,
    '/app/extract': extractPath,
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

  const isItemActive = (path: string): boolean => {
    if (path === '/app') return location.pathname === '/app';
    if (path === '/app/projects') return location.pathname.startsWith('/app/projects');
    if (path === '/app/schemas') return location.pathname.startsWith('/app/schemas');
    return location.pathname.startsWith(path);
  };
  const isGlobalMenuActive = (path: string): boolean => {
    if (path === '/app/projects') {
      return location.pathname.startsWith('/app/projects') && !location.pathname.startsWith('/app/projects/list');
    }
    if (path === '/app/projects/list') return location.pathname.startsWith('/app/projects/list');
    if (path === '/app/extract') return location.pathname.startsWith('/app/extract');
    if (path === '/app/transform') return location.pathname.startsWith('/app/transform');
    if (path === '/app/schemas') return location.pathname.startsWith('/app/schemas');
    return location.pathname.startsWith(path);
  };
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
              <IconChevronLeft size={16} stroke={2} />
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
          {schemaMenu && (desktopCompact ? (
            <UnstyledButton
              className={`left-rail-icon-link left-rail-icon-link-code${isGlobalMenuActive(schemaMenu.path) ? ' is-active' : ''}`}
              onClick={() => {
                navigate(globalPathOverrides[schemaMenu.path] ?? schemaMenu.path);
                onNavigate?.();
              }}
              aria-label={schemaMenu.label}
              title={schemaMenu.label}
            >
              <Text className="left-rail-icon-link-text">
                {GLOBAL_MENU_COMPACT_CODE[schemaMenu.path] ?? schemaMenu.label.charAt(0).toUpperCase()}
              </Text>
            </UnstyledButton>
          ) : (
            <NavLink
              label={schemaMenu.label}
              className="left-rail-link left-rail-quick-action"
              aria-label={schemaMenu.label}
              title={schemaMenu.label}
              px={navPaddingX}
              py={quickActionPaddingY}
              active={isGlobalMenuActive(schemaMenu.path)}
              onClick={() => {
                navigate(globalPathOverrides[schemaMenu.path] ?? schemaMenu.path);
                onNavigate?.();
              }}
            />
          ))}
        </Box>

        <Box mt="auto" className="left-rail-bottom-nav">
          {NAV_GROUPS.map((group, groupIndex) => renderGroup(group, groupIndex))}
          {renderRailItem({
            key: 'docs-link',
            label: 'Docs',
            icon: IconFileText,
            active: false,
            className: 'left-rail-link',
            py: navPaddingY,
            href: '/docs',
            target: '_blank',
            style: { opacity: 0.7, marginTop: 4 },
          })}
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
                  <Box className="left-rail-account-avatar" aria-hidden>
                    {userInitial}
                  </Box>
                  <Text className="left-rail-account-user" title={userLabel} truncate style={{ flex: 1, minWidth: 0 }}>
                    {userLabel}
                  </Text>
                  {onSignOut && (
                    <UnstyledButton
                      className="left-rail-account-action-signout-icon"
                      onClick={onSignOut}
                      aria-label="Sign out"
                      title="Sign out"
                    >
                      <IconLogout size={15} stroke={1.8} />
                    </UnstyledButton>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
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
