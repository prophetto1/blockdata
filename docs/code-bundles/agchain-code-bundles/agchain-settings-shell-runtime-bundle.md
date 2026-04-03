# Source Bundle: `agchain-settings-shell-runtime`

- Purpose: Runtime code bundle for AGChain settings-shell plan evaluation
- Source root: `E:\writing-system`
- Files: `14`

## Files

- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsNav.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`
- `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`
- `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `services/platform-api/app/api/routes/agchain_settings.py`
- `services/platform-api/app/domain/agchain/organization_access.py`
- `services/platform-api/app/domain/agchain/organization_members.py`
- `services/platform-api/app/domain/agchain/permission_groups.py`
- `services/platform-api/app/domain/agchain/project_access.py`

## `web/src/pages/agchain/AgchainSettingsPage.tsx`

```tsx
import { Navigate } from 'react-router-dom';

export default function AgchainSettingsPage() {
  return <Navigate to="/app/agchain/settings/organization/members" replace />;
}
```

## `web/src/components/layout/AgchainShellLayout.tsx`

```tsx
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AgchainSettingsNav } from '@/components/agchain/settings/AgchainSettingsNav';
import { useAuth } from '@/auth/AuthContext';
import { AGCHAIN_NAV_SECTIONS } from '@/components/agchain/AgchainLeftNav';
import { AgchainOrganizationSwitcher } from '@/components/agchain/AgchainOrganizationSwitcher';
import { AgchainProjectSwitcher } from '@/components/agchain/AgchainProjectSwitcher';
import { LeftRailShadcn as AgchainChromeRail } from '@/components/shell/LeftRailShadcn';
import { TopCommandBar } from '@/components/shell/TopCommandBar';
import { AgchainWorkspaceProvider } from '@/contexts/AgchainWorkspaceContext';
import { styleTokens } from '@/lib/styleTokens';

const AGCHAIN_SIDEBAR_WIDTH_KEY = 'agchain.shell.sidebar_width';
const AGCHAIN_RAIL_2_WIDTH = 224;
const AGCHAIN_HEADER_HEIGHT = styleTokens.shell.headerHeight;
const AGCHAIN_SETTINGS_PATH_PREFIX = '/app/agchain/settings';

function readStoredWidth(): number {
  if (typeof window === 'undefined') return styleTokens.shell.navbarWidth;
  const raw = window.localStorage.getItem(AGCHAIN_SIDEBAR_WIDTH_KEY);
  if (!raw) return styleTokens.shell.navbarWidth;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return styleTokens.shell.navbarWidth;
  return Math.max(styleTokens.shell.navbarMinWidth, Math.min(parsed, styleTokens.shell.navbarMaxWidth));
}

export function AgchainShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => readStoredWidth());
  const isResizingRef = useRef(false);

  const showRail2 = location.pathname.startsWith(AGCHAIN_SETTINGS_PATH_PREFIX);
  const rail1Width = sidebarWidth;
  const totalRailWidth = rail1Width + (showRail2 ? AGCHAIN_RAIL_2_WIDTH : 0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isResizingRef.current = true;
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(
        styleTokens.shell.navbarMinWidth,
        Math.min(startWidth + delta, styleTokens.shell.navbarMaxWidth),
      );
      setSidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth((current) => {
        window.localStorage.setItem(AGCHAIN_SIDEBAR_WIDTH_KEY, String(current));
        return current;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth]);

  const mainStyle: CSSProperties = {
    position: 'absolute',
    insetBlockStart: `${AGCHAIN_HEADER_HEIGHT}px`,
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    insetInlineStart: `${totalRailWidth}px`,
    overflow: 'auto',
    backgroundColor: 'var(--background)',
  };

  return (
    <AgchainWorkspaceProvider>
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <header
        data-testid="agchain-top-header"
        style={{
          position: 'fixed',
          insetInlineStart: `${totalRailWidth}px`,
          insetInlineEnd: 0,
          top: 0,
          height: `${AGCHAIN_HEADER_HEIGHT}px`,
          zIndex: 30,
          backgroundColor: 'var(--chrome, var(--background))',
        }}
        >
          <TopCommandBar
            onToggleNav={() => {}}
            hideProjectSwitcher
            hideSearch
          />
        <div
          data-testid="agchain-shell-top-divider"
          aria-hidden
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetInlineEnd: 0,
            bottom: 0,
            height: '1px',
            backgroundColor: 'var(--sidebar-border)',
          }}
        />
      </header>

      <aside
        data-testid="agchain-platform-rail"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetBlock: 0,
          width: `${rail1Width}px`,
          borderInlineEnd: '1px solid var(--border)',
          backgroundColor: 'var(--chrome, var(--background))',
          zIndex: 20,
        }}
      >
          <AgchainChromeRail
          userLabel={profile?.display_name || profile?.email || user?.email}
          onSignOut={handleSignOut}
          navSections={AGCHAIN_NAV_SECTIONS}
          headerBrand={(
            <span className="inline-flex items-baseline text-sm font-semibold uppercase tracking-[0.2em]">
              <span className="text-sidebar-foreground">Block</span>
              <span className="text-primary">Data</span>
              <span className="ml-1.5 text-sidebar-foreground">Bench</span>
            </span>
          )}
          headerContent={(
            <div className="flex w-full flex-col gap-2">
              <AgchainOrganizationSwitcher />
              <AgchainProjectSwitcher />
            </div>
          )}
        />
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            insetInlineEnd: -2,
            width: 4,
            cursor: 'col-resize',
            zIndex: 21,
          }}
          className="group"
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-primary/30" />
        </div>
      </aside>

      {showRail2 && (
        <aside
          data-testid="agchain-secondary-rail"
          style={{
            position: 'fixed',
            top: `${AGCHAIN_HEADER_HEIGHT}px`,
            bottom: 0,
            insetInlineStart: `${rail1Width}px`,
            width: `${AGCHAIN_RAIL_2_WIDTH}px`,
            zIndex: 19,
          }}
        >
          <AgchainSettingsNav />
        </aside>
      )}

      <main style={mainStyle}>
        <div data-testid="agchain-shell-frame" className="h-full min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
    </AgchainWorkspaceProvider>
  );
}
```

## `web/src/components/agchain/settings/AgchainSettingsNav.tsx`

```tsx
import { useMemo, useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconApi,
  IconBuilding,
  IconCreditCard,
  IconKey,
  IconLock,
  IconSettings,
  IconShield,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AgchainSettingsSearch } from './AgchainSettingsSearch';

export type AgchainSettingsNavItem = {
  id: string;
  label: string;
  path: string;
  icon: Icon;
  limited?: boolean;
};

export type AgchainSettingsNavGroup = {
  id: string;
  label: string;
  items: AgchainSettingsNavItem[];
};

const AGCHAIN_SETTINGS_NAV: AgchainSettingsNavGroup[] = [
  {
    id: 'organization',
    label: 'Organization',
    items: [
      { id: 'organization-members', label: 'Members', path: '/app/agchain/settings/organization/members', icon: IconUsers },
      { id: 'organization-permission-groups', label: 'Permission Groups', path: '/app/agchain/settings/organization/permission-groups', icon: IconShield },
      { id: 'organization-api-keys', label: 'API Keys', path: '/app/agchain/settings/organization/api-keys', icon: IconApi, limited: true },
      { id: 'organization-ai-providers', label: 'AI Providers', path: '/app/agchain/settings/organization/ai-providers', icon: IconKey, limited: true },
    ],
  },
  {
    id: 'project',
    label: 'Project',
    items: [
      { id: 'project-general', label: 'General', path: '/app/agchain/settings/project/general', icon: IconSettings, limited: true },
      { id: 'project-members', label: 'Members', path: '/app/agchain/settings/project/members', icon: IconUsers, limited: true },
      { id: 'project-access', label: 'Access', path: '/app/agchain/settings/project/access', icon: IconLock, limited: true },
      { id: 'project-benchmark-definition', label: 'Benchmark Definition', path: '/app/agchain/settings/project/benchmark-definition', icon: IconAdjustmentsHorizontal },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { id: 'personal-preferences', label: 'Preferences', path: '/app/agchain/settings/personal/preferences', icon: IconBuilding, limited: true },
      { id: 'personal-credentials', label: 'Credentials', path: '/app/agchain/settings/personal/credentials', icon: IconCreditCard, limited: true },
    ],
  },
];

function matchesPath(itemPath: string, pathname: string) {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function AgchainSettingsNav() {
  const location = useLocation();
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return AGCHAIN_SETTINGS_NAV;

    return AGCHAIN_SETTINGS_NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(normalized)),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <nav
      aria-label="AGChain settings navigation"
      data-testid="agchain-settings-nav"
      className="flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-accent"
    >
      <div className="border-b border-sidebar-border px-3 py-3">
        <AgchainSettingsSearch value={query} onChange={setQuery} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-5">
          {filteredGroups.map((group) => (
            <section key={group.id} aria-label={group.label}>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.label}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = matchesPath(item.path, location.pathname);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-foreground/75 hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      <ItemIcon size={15} stroke={1.75} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.limited ? (
                        <span className="rounded-full border border-border/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Soon
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredGroups.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">No settings match your search.</div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
```

## `web/src/components/agchain/settings/AgchainSettingsPlaceholderLayout.tsx`

```tsx
import { AgchainPageHeader } from '@/components/agchain/AgchainPageHeader';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

type AgchainSettingsPlaceholderLayoutProps = {
  title: string;
  description: string;
  note: string;
  eyebrow: string;
  meta?: string;
};

export function AgchainSettingsPlaceholderLayout({
  title,
  description,
  note,
  eyebrow,
  meta,
}: AgchainSettingsPlaceholderLayoutProps) {
  return (
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="space-y-6">
          <AgchainPageHeader
            title={title}
            description={description}
            eyebrow={eyebrow}
            meta={meta}
          />

          <div className="rounded-2xl border border-dashed border-border/60 bg-background/30 px-4 py-5">
            <p className="text-sm leading-7 text-muted-foreground">{note}</p>
            <div className="mt-4 inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Coming soon
            </div>
          </div>
        </div>
      </section>
    </AgchainPageFrame>
  );
}
```

## `web/src/components/agchain/settings/AgchainSettingsPlaceholderPage.tsx`

```tsx
import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';
import { AgchainSettingsPlaceholderLayout } from './AgchainSettingsPlaceholderLayout';

type AgchainSettingsPlaceholderPageProps = {
  scope: 'organization' | 'project' | 'personal';
  title: string;
  description: string;
  note: string;
};

export function AgchainSettingsPlaceholderPage({
  scope,
  title,
  description,
  note,
}: AgchainSettingsPlaceholderPageProps) {
  const scopeState = useAgchainScopeState(scope === 'project' ? 'project' : 'organization');

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading settings workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain settings unavailable"
          description="Failed to load AGChain workspace context."
          action={(
            <button
              type="button"
              onClick={() => void scopeState.reload()}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retry
            </button>
          )}
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue into AGChain settings."
        />
      </AgchainPageFrame>
    );
  }

  if (scope === 'project' && scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="Choose an AGChain project"
          description="Project settings are scoped to the selected AGChain project or evaluation. Pick a project from the registry before opening project-specific settings."
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  const eyebrow =
    scope === 'organization'
      ? 'Organization settings'
      : scope === 'project'
        ? 'Project settings'
        : 'Personal settings';

  const meta =
    scopeState.kind === 'ready' && scope === 'project'
      ? `Current project: ${scopeState.focusedProject.project_name ?? scopeState.focusedProject.benchmark_name ?? 'Selected project'}`
      : `Current organization: ${scopeState.selectedOrganization.display_name}`;

  return (
    <AgchainSettingsPlaceholderLayout
      title={title}
      description={description}
      note={note}
      eyebrow={eyebrow}
      meta={meta}
    />
  );
}
```

## `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx`

```tsx
import { useState } from 'react';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainPageHeader } from '@/components/agchain/AgchainPageHeader';
import { InviteOrganizationMembersModal } from '@/components/agchain/settings/InviteOrganizationMembersModal';
import { OrganizationMembersTable } from '@/components/agchain/settings/OrganizationMembersTable';
import { Button } from '@/components/ui/button';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useAgchainOrganizationMembers } from '@/hooks/agchain/useAgchainOrganizationMembers';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

export default function AgchainOrganizationMembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const scopeState = useAgchainScopeState('organization');
  const {
    items,
    permissionGroups,
    search,
    statusFilter,
    loading,
    error,
    inviteError,
    inviteResults,
    creatingInvite,
    updatingMemberId,
    setSearch,
    setStatusFilter,
    inviteMembers,
    updateMembershipStatus,
    reload,
  } = useAgchainOrganizationMembers();

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading settings workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain settings unavailable"
          description="Failed to load AGChain workspace context."
          action={(
            <button
              type="button"
              onClick={() => void scopeState.reload()}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retry
            </button>
          )}
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue into AGChain settings."
        />
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="space-y-6">
          <div className="border-b border-border/60 pb-6">
            <AgchainPageHeader
              title="Organization Members"
              description="Manage membership for the current AGChain organization, including protected owners and invited teammates."
              eyebrow="Organization settings"
              meta={`Current organization: ${scopeState.selectedOrganization.display_name}`}
              action={(
                <Button type="button" onClick={() => setInviteOpen(true)}>
                  Invite
                </Button>
              )}
            />

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <div className="min-w-[18rem] flex-1">
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  htmlFor="organization-members-search"
                >
                  Find members
                </label>
                <input
                  id="organization-members-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Find members"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  placeholder="Find members"
                />
              </div>

              <div className="w-40">
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                  htmlFor="organization-members-status"
                >
                  Show
                </label>
                <select
                  id="organization-members-status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'active' | 'disabled' | 'all')}
                  aria-label="Show members by status"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading organization members...</p>
            ) : null}

            {!loading && error ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {!loading && !error && !items.length ? (
              <p className="text-sm text-muted-foreground">
                No organization members match the current filters yet.
              </p>
            ) : null}

            {!loading && !error && items.length ? (
              <OrganizationMembersTable
                items={items}
                updatingMemberId={updatingMemberId}
                onUpdateMembershipStatus={updateMembershipStatus}
              />
            ) : null}
          </div>
        </div>
      </section>

      <InviteOrganizationMembersModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        creating={creatingInvite}
        error={inviteError}
        results={inviteResults}
        permissionGroups={permissionGroups}
        onInvite={inviteMembers}
      />
    </AgchainPageFrame>
  );
}
```

## `web/src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx`

```tsx
import { useState } from 'react';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainPageHeader } from '@/components/agchain/AgchainPageHeader';
import { CreatePermissionGroupModal } from '@/components/agchain/settings/CreatePermissionGroupModal';
import { PermissionGroupMembersModal } from '@/components/agchain/settings/PermissionGroupMembersModal';
import { PermissionGroupPermissionsModal } from '@/components/agchain/settings/PermissionGroupPermissionsModal';
import { PermissionGroupsTable } from '@/components/agchain/settings/PermissionGroupsTable';
import { Button } from '@/components/ui/button';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useAgchainPermissionGroups } from '@/hooks/agchain/useAgchainPermissionGroups';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

export default function AgchainPermissionGroupsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedPermissionGroupId, setSelectedPermissionGroupId] = useState<string | null>(null);
  const scopeState = useAgchainScopeState('organization');
  const {
    items,
    permissionDefinitions,
    selectedGroupDetail,
    selectedGroupMembers,
    availableMembers,
    search,
    memberSearch,
    loading,
    error,
    createError,
    detailError,
    membersError,
    creating,
    detailLoading,
    membersLoading,
    addingMembers,
    removingMemberId,
    setSearch,
    createPermissionGroup,
    loadPermissionGroupDetail,
    loadPermissionGroupMembers,
    addGroupMembers,
    removeGroupMember,
    reload,
  } = useAgchainPermissionGroups();

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading settings workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain settings unavailable"
          description="Failed to load AGChain workspace context."
          action={(
            <button
              type="button"
              onClick={() => void scopeState.reload()}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retry
            </button>
          )}
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue into AGChain settings."
        />
      </AgchainPageFrame>
    );
  }

  async function handleOpenPermissions(permissionGroupId: string) {
    setMembersOpen(false);
    setCreateOpen(false);
    setSelectedPermissionGroupId(permissionGroupId);
    await loadPermissionGroupDetail(permissionGroupId);
    setPermissionsOpen(true);
  }

  async function handleOpenMembers(permissionGroupId: string) {
    setPermissionsOpen(false);
    setCreateOpen(false);
    setSelectedPermissionGroupId(permissionGroupId);
    await loadPermissionGroupMembers(permissionGroupId);
    setMembersOpen(true);
  }

  async function handleCreatePermissionGroup(payload: Parameters<typeof createPermissionGroup>[0]) {
    await createPermissionGroup(payload);
    setCreateOpen(false);
  }

  async function handleMembersSearch(nextSearch: string) {
    if (!selectedPermissionGroupId) {
      return;
    }
    await loadPermissionGroupMembers(selectedPermissionGroupId, nextSearch);
  }

  async function handleAddMembers(organizationMemberIds: string[]) {
    if (!selectedPermissionGroupId) {
      return;
    }
    await addGroupMembers(selectedPermissionGroupId, organizationMemberIds);
  }

  async function handleRemoveMember(organizationMemberId: string) {
    if (!selectedPermissionGroupId) {
      return;
    }
    await removeGroupMember(selectedPermissionGroupId, organizationMemberId);
  }

  return (
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="space-y-6">
          <div className="border-b border-border/60 pb-6">
            <AgchainPageHeader
              title="Permission Groups"
              description="Inspect protected system groups and create bounded organization-level permission groups for the current AGChain organization."
              eyebrow="Organization settings"
              meta={`Current organization: ${scopeState.selectedOrganization.display_name}`}
              action={(
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  Create permission group
                </Button>
              )}
            />

            <div className="mt-5 max-w-md">
              <label
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                htmlFor="permission-groups-search"
              >
                Find permission groups
              </label>
              <input
                id="permission-groups-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Find permission groups"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                placeholder="Find permission groups"
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading permission groups...</p>
            ) : null}

            {!loading && error ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {!loading && !error && !items.length ? (
              <p className="text-sm text-muted-foreground">
                No permission groups match the current search yet.
              </p>
            ) : null}

            {!loading && !error && items.length ? (
              <PermissionGroupsTable
                items={items}
                onViewPermissions={(permissionGroupId) => void handleOpenPermissions(permissionGroupId)}
                onManageMembers={(permissionGroupId) => void handleOpenMembers(permissionGroupId)}
              />
            ) : null}
          </div>
        </div>
      </section>

      {createOpen ? (
        <CreatePermissionGroupModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          creating={creating}
          error={createError}
          definitions={permissionDefinitions}
          onCreate={handleCreatePermissionGroup}
        />
      ) : null}

      {permissionsOpen ? (
        <PermissionGroupPermissionsModal
          open={permissionsOpen}
          onOpenChange={setPermissionsOpen}
          loading={detailLoading}
          error={detailError}
          detail={selectedGroupDetail}
        />
      ) : null}

      {membersOpen ? (
        <PermissionGroupMembersModal
          open={membersOpen}
          onOpenChange={setMembersOpen}
          loading={membersLoading}
          adding={addingMembers}
          removingMemberId={removingMemberId}
          error={membersError}
          search={memberSearch}
          onSearchChange={(value) => void handleMembersSearch(value)}
          membersData={selectedGroupMembers}
          availableMembers={availableMembers}
          onAddMembers={handleAddMembers}
          onRemoveMember={handleRemoveMember}
        />
      ) : null}
    </AgchainPageFrame>
  );
}
```

## `web/src/pages/agchain/AgchainBenchmarksPage.tsx`

```tsx
import { AgchainBenchmarkToolBag } from '@/components/agchain/benchmarks/AgchainBenchmarkToolBag';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { Link } from 'react-router-dom';
import { AgchainBenchmarkStepInspector } from '@/components/agchain/benchmarks/AgchainBenchmarkStepInspector';
import { AgchainBenchmarkStepsList } from '@/components/agchain/benchmarks/AgchainBenchmarkStepsList';
import { AgchainBenchmarkWorkbenchHeader } from '@/components/agchain/benchmarks/AgchainBenchmarkWorkbenchHeader';
import { useAgchainBenchmarkSteps } from '@/hooks/agchain/useAgchainBenchmarkSteps';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { AgchainPageFrame } from './AgchainPageFrame';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SplitterRoot, SplitterPanel, SplitterResizeTrigger } from '@/components/ui/splitter';

const SECTIONS = [
  { key: 'steps', label: 'Steps' },
  { key: 'questions', label: 'Questions' },
  { key: 'context', label: 'Context' },
  { key: 'state', label: 'State' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'models', label: 'Models' },
  { key: 'runner', label: 'Runner' },
  { key: 'validation', label: 'Validation' },
  { key: 'runs', label: 'Runs' },
];

export default function AgchainBenchmarksPage() {
  const scopeState = useAgchainScopeState('project');
  const {
    benchmark,
    currentVersion,
    counts,
    steps,
    selectedStepId,
    selectedStep,
    canEdit,
    loading,
    mutating,
    error,
    dirtyOrder,
    toolRefs,
    resolvedTools,
    availableTools,
    dirtyToolBag,
    selectStep,
    moveStep,
    saveOrder,
    createStep,
    updateSelectedStep,
    deleteSelectedStep,
    addToolRef,
    updateToolRef,
    moveToolRef,
    removeToolRef,
    saveToolBag,
  } = useAgchainBenchmarkSteps();

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain workspace unavailable"
          description="Failed to load AGChain workspace context."
          action={(
            <button
              type="button"
              onClick={() => void scopeState.reload()}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retry
            </button>
          )}
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          eyebrow="Benchmark definition"
          title="Choose an AGChain project"
          description="Benchmark definition is a child page of the selected AGChain project or evaluation. Pick a project from the registry before editing its benchmark steps."
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  const focusedProject = scopeState.focusedProject;

  return (
    <AgchainPageFrame className="gap-6 py-8" data-testid="agchain-benchmark-definition-page">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Selected AGChain project
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Benchmark definition</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {focusedProject?.project_name ?? focusedProject?.benchmark_name ?? 'Selected project'} owns this benchmark
          definition page. Benchmarks remain child resources under the selected project, and the multi-project registry
          lives at the projects route, not here.
        </p>
      </section>

      <AgchainBenchmarkWorkbenchHeader
        benchmark={benchmark}
        currentVersion={currentVersion}
        counts={counts}
        canEdit={canEdit}
        mutating={mutating}
        onCreateStep={createStep}
      />

      {error ? (
        <section className="rounded-3xl border border-destructive/40 bg-destructive/5 px-6 py-4 text-sm text-destructive">
          {error}
        </section>
      ) : null}

      <Tabs defaultValue="steps" onValueChange={() => {}} className="grid gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="self-start rounded-3xl border border-border/70 bg-card/70 shadow-sm p-2">
          <TabsList className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <TabsTrigger
                key={s.key}
                value={s.key}
                className="w-full justify-start rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:font-semibold"
              >
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <div>
          <TabsContent value="steps">
            <div className="space-y-6">
              <SplitterRoot
                panels={[{ id: 'list', minSize: 30 }, { id: 'inspector', minSize: 25 }]}
                defaultSize={[60, 40]}
                className="min-h-[24rem]"
              >
                <SplitterPanel id="list">
                  <AgchainBenchmarkStepsList
                    steps={steps}
                    selectedStepId={selectedStepId}
                    canEdit={canEdit}
                    loading={loading}
                    mutating={mutating}
                    dirtyOrder={dirtyOrder}
                    onSelect={selectStep}
                    onMove={moveStep}
                    onSaveOrder={saveOrder}
                  />
                </SplitterPanel>
                <SplitterResizeTrigger id="list:inspector" aria-label="Resize steps and inspector" />
                <SplitterPanel id="inspector">
                  <AgchainBenchmarkStepInspector
                    selectedStep={selectedStep}
                    canEdit={canEdit}
                    loading={loading}
                    mutating={mutating}
                    onSave={updateSelectedStep}
                    onDelete={deleteSelectedStep}
                  />
                </SplitterPanel>
              </SplitterRoot>

              <AgchainBenchmarkToolBag
                toolRefs={toolRefs}
                resolvedTools={resolvedTools}
                availableTools={availableTools}
                canEdit={canEdit && currentVersion?.version_status === 'draft'}
                loading={loading}
                mutating={mutating}
                dirty={dirtyToolBag}
                onAdd={addToolRef}
                onChange={updateToolRef}
                onMove={moveToolRef}
                onRemove={removeToolRef}
                onSave={saveToolBag}
              />
            </div>
          </TabsContent>

          {SECTIONS.filter((s) => s.key !== 'steps').map((s) => (
            <TabsContent key={s.key} value={s.key}>
              <section className="rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground">{s.label}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {s.label} remains a child placeholder of the selected AGChain project in this phase. The live surface
                  implemented in this plan is Steps.
                </p>
              </section>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </AgchainPageFrame>
  );
}
```

## `web/src/components/agchain/AgchainBenchmarkNav.tsx`

```tsx
import { Link, useLocation } from 'react-router-dom';
import {
  IconActivity,
  IconAtom2,
  IconChartBar,
  IconClipboardList,
  IconDatabase,
  IconFileText,
  IconLayoutDashboard,
  IconPlayerPlay,
  IconTestPipe,
  type Icon,
} from '@tabler/icons-react';

type BenchmarkSection = { label: string; icon: Icon; hash: string };

const BENCHMARK_SECTIONS: BenchmarkSection[] = [
  { label: 'Steps',      icon: IconClipboardList,  hash: '#steps' },
  { label: 'Questions',  icon: IconFileText,        hash: '#questions' },
  { label: 'Context',    icon: IconLayoutDashboard, hash: '#context' },
  { label: 'State',      icon: IconDatabase,        hash: '#state' },
  { label: 'Scoring',    icon: IconChartBar,        hash: '#scoring' },
  { label: 'Models',     icon: IconAtom2,           hash: '#models' },
  { label: 'Runner',     icon: IconPlayerPlay,      hash: '#runner' },
  { label: 'Validation', icon: IconTestPipe,        hash: '#validation' },
  { label: 'Runs',       icon: IconActivity,        hash: '#runs' },
];

export function AgchainBenchmarkNav() {
  const { hash } = useLocation();
  const activeHash = hash || '#steps';
  const basePath = '/app/agchain/settings/project/benchmark-definition';

  return (
    <nav
      aria-label="Benchmark sections"
      data-testid="agchain-benchmark-nav"
      className="flex h-full flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-border px-2 py-3"
      style={{ backgroundColor: 'var(--sidebar-accent)' }}
    >
      <div className="flex flex-col space-y-0 px-1">
        {BENCHMARK_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isActive = activeHash === section.hash;
          return (
            <Link
              key={section.hash}
              to={`${basePath}${section.hash}`}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-2.5 rounded-md px-2 h-7 text-[13px] transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-semibold'
                  : 'font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground',
              ].join(' ')}
            >
              <SectionIcon size={14} stroke={1.75} className="shrink-0" />
              <span className="truncate">{section.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## `services/platform-api/app/api/routes/agchain_settings.py`

```python
from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, Query
from opentelemetry import metrics, trace
from pydantic import BaseModel, Field

from app.auth.dependencies import require_user_auth
from app.auth.principals import AuthPrincipal
from app.domain.agchain.organization_members import (
    create_organization_invites,
    list_organization_members,
    update_organization_membership_status,
)
from app.domain.agchain.permission_groups import (
    add_permission_group_members,
    create_permission_group,
    get_permission_group,
    get_permission_group_definitions,
    list_permission_group_members,
    list_permission_groups,
    remove_permission_group_member,
)
from app.observability.contract import safe_attributes, set_span_attributes


router = APIRouter(prefix="/agchain/settings/organizations/{organization_id}", tags=["agchain-settings"])
logger = logging.getLogger("agchain-settings")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

members_list_counter = meter.create_counter("platform.agchain.settings.members.list.count")
members_invite_counter = meter.create_counter("platform.agchain.settings.members.invite.count")
members_update_counter = meter.create_counter("platform.agchain.settings.members.update.count")
permission_groups_list_counter = meter.create_counter("platform.agchain.settings.permission_groups.list.count")
permission_groups_create_counter = meter.create_counter("platform.agchain.settings.permission_groups.create.count")
permission_groups_members_add_counter = meter.create_counter("platform.agchain.settings.permission_groups.members.add.count")
permission_groups_members_remove_counter = meter.create_counter("platform.agchain.settings.permission_groups.members.remove.count")
members_list_duration_ms = meter.create_histogram("platform.agchain.settings.members.list.duration_ms")
permission_groups_list_duration_ms = meter.create_histogram("platform.agchain.settings.permission_groups.list.duration_ms")


class OrganizationMemberInvitationsRequest(BaseModel):
    emails: list[str] = Field(min_length=1)
    permission_group_ids: list[str] = Field(default_factory=list)


class OrganizationMemberStatusUpdateRequest(BaseModel):
    membership_status: str


class PermissionGroupCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    permission_keys: list[str] = Field(default_factory=list)


class PermissionGroupMembersAddRequest(BaseModel):
    organization_member_ids: list[str] = Field(min_length=1)


@router.get("/permission-definitions", summary="List AGChain permission definitions")
async def get_permission_definitions_route(
    organization_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    return get_permission_group_definitions(
        user_id=auth.user_id,
        organization_id=organization_id,
    )


@router.get("/members", summary="List AGChain organization members")
async def list_organization_members_route(
    organization_id: str,
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.settings.members.list") as span:
        result = list_organization_members(
            user_id=auth.user_id,
            organization_id=organization_id,
            search=search,
            status=status,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "row_count": len(result["items"]),
            "latency_ms": duration_ms,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        members_list_counter.add(1, safe_attributes(attrs))
        members_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/member-invitations", summary="Create pending AGChain organization invitations")
async def create_organization_member_invitations_route(
    organization_id: str,
    body: OrganizationMemberInvitationsRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.members.invite") as span:
        result = create_organization_invites(
            user_id=auth.user_id,
            organization_id=organization_id,
            emails=body.emails,
            permission_group_ids=body.permission_group_ids,
        )
        outcome_counts = {
            "invite_created_count": sum(1 for item in result["results"] if item["outcome"] == "invite_created"),
            "already_pending_count": sum(1 for item in result["results"] if item["outcome"] == "already_pending"),
            "already_member_count": sum(1 for item in result["results"] if item["outcome"] == "already_member"),
            "invalid_email_count": sum(1 for item in result["results"] if item["outcome"] == "invalid_email"),
        }
        attrs = {
            "organization_id_present": True,
            "email_count": len(body.emails),
            **outcome_counts,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        members_invite_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.settings.members.invite.completed",
            extra=safe_attributes(attrs),
        )
        return result


@router.patch("/members/{organization_member_id}", summary="Update AGChain organization membership status")
async def update_organization_membership_status_route(
    organization_id: str,
    organization_member_id: str,
    body: OrganizationMemberStatusUpdateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.members.update") as span:
        result = update_organization_membership_status(
            user_id=auth.user_id,
            organization_id=organization_id,
            organization_member_id=organization_member_id,
            membership_status=body.membership_status,
        )
        attrs = {
            "organization_id_present": True,
            "organization_member_id_present": True,
            "membership_status": body.membership_status,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        members_update_counter.add(1, safe_attributes(attrs))
        return result


@router.get("/permission-groups", summary="List AGChain organization permission groups")
async def list_permission_groups_route(
    organization_id: str,
    search: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.settings.permission_groups.list") as span:
        result = list_permission_groups(
            user_id=auth.user_id,
            organization_id=organization_id,
            search=search,
        )
        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        attrs = {
            "organization_id_present": True,
            "row_count": len(result["items"]),
            "latency_ms": duration_ms,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_list_counter.add(1, safe_attributes(attrs))
        permission_groups_list_duration_ms.record(duration_ms, safe_attributes(attrs))
        return result


@router.post("/permission-groups", summary="Create an AGChain organization permission group")
async def create_permission_group_route(
    organization_id: str,
    body: PermissionGroupCreateRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.create") as span:
        result = create_permission_group(
            user_id=auth.user_id,
            organization_id=organization_id,
            name=body.name,
            description=body.description,
            permission_keys=body.permission_keys,
        )
        attrs = {
            "organization_id_present": True,
            "permission_key_count": len(body.permission_keys),
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_create_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.settings.permission_groups.created",
            extra={
                "permission_group_id": result["group"]["permission_group_id"],
                "is_system_group": result["group"]["is_system_group"],
                **safe_attributes(attrs),
            },
        )
        return result


@router.get("/permission-groups/{permission_group_id}", summary="Get AGChain organization permission group detail")
async def get_permission_group_route(
    organization_id: str,
    permission_group_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.get") as span:
        result = get_permission_group(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "result": "success",
        }
        set_span_attributes(span, attrs)
        return result


@router.get("/permission-groups/{permission_group_id}/members", summary="List AGChain permission group members")
async def list_permission_group_members_route(
    organization_id: str,
    permission_group_id: str,
    search: str | None = Query(default=None),
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.members.list") as span:
        result = list_permission_group_members(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
            search=search,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "row_count": len(result["items"]),
            "result": "success",
        }
        set_span_attributes(span, attrs)
        return result


@router.post("/permission-groups/{permission_group_id}/members", summary="Add AGChain permission group members")
async def add_permission_group_members_route(
    organization_id: str,
    permission_group_id: str,
    body: PermissionGroupMembersAddRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.members.add") as span:
        result = add_permission_group_members(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
            organization_member_ids=body.organization_member_ids,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "requested_member_count": len(body.organization_member_ids),
            "added_count": result["added_count"],
            "already_present_count": result["already_present_count"],
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_members_add_counter.add(1, safe_attributes(attrs))
        return result


@router.delete("/permission-groups/{permission_group_id}/members/{organization_member_id}", summary="Remove AGChain permission group member")
async def remove_permission_group_member_route(
    organization_id: str,
    permission_group_id: str,
    organization_member_id: str,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.settings.permission_groups.members.remove") as span:
        result = remove_permission_group_member(
            user_id=auth.user_id,
            organization_id=organization_id,
            permission_group_id=permission_group_id,
            organization_member_id=organization_member_id,
        )
        attrs = {
            "organization_id_present": True,
            "permission_group_id_present": True,
            "organization_member_id_present": True,
            "removed": result["removed"],
            "result": "success",
        }
        set_span_attributes(span, attrs)
        permission_groups_members_remove_counter.add(1, safe_attributes(attrs))
        return result
```

## `services/platform-api/app/domain/agchain/organization_access.py`

```python
from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.infra.supabase_client import get_supabase_admin


OWNERS_SYSTEM_GROUP_KIND = "owners"

V1_ORGANIZATION_PERMISSION_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "permission_key": "organization.settings.manage",
        "label": "Manage settings",
        "description": "Manage organization-wide AGChain settings.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.members.read",
        "label": "Read members",
        "description": "View organization members and group assignments.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.members.invite",
        "label": "Invite members",
        "description": "Create pending organization invitations.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.members.remove",
        "label": "Remove members",
        "description": "Disable or reactivate organization memberships.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.permission_groups.read",
        "label": "Read permission groups",
        "description": "View permission groups and assigned grants.",
        "user_assignable": True,
    },
    {
        "permission_key": "organization.permission_groups.manage",
        "label": "Manage permission groups",
        "description": "Create groups and manage group membership.",
        "user_assignable": True,
    },
)

V1_PROJECT_PERMISSION_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "permission_key": "project.create",
        "label": "Create projects",
        "description": "Create AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.read",
        "label": "Read projects",
        "description": "Read AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.update",
        "label": "Update projects",
        "description": "Update AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.delete",
        "label": "Delete projects",
        "description": "Delete AGChain projects inside this organization.",
        "user_assignable": False,
    },
    {
        "permission_key": "project.manage_access",
        "label": "Manage project access",
        "description": "Manage project membership and project access posture.",
        "user_assignable": False,
    },
)

OWNERS_DEFAULT_PERMISSION_KEYS: frozenset[str] = frozenset(
    definition["permission_key"]
    for definition in (*V1_ORGANIZATION_PERMISSION_DEFINITIONS, *V1_PROJECT_PERMISSION_DEFINITIONS)
)


def get_permission_definitions() -> dict[str, list[dict[str, Any]]]:
    return {
        "organization_permissions": [dict(item) for item in V1_ORGANIZATION_PERMISSION_DEFINITIONS],
        "project_permissions": [dict(item) for item in V1_PROJECT_PERMISSION_DEFINITIONS],
        "protected_system_groups": [
            {
                "system_group_kind": OWNERS_SYSTEM_GROUP_KIND,
                "name": "Owners",
                "deletable": False,
                "last_member_removable": False,
            }
        ],
    }


def _load_organization_row(*, organization_id: str, sb) -> dict[str, Any] | None:
    return (
        sb.table("agchain_organizations")
        .select("*")
        .eq("organization_id", organization_id)
        .maybe_single()
        .execute()
        .data
    )


def load_active_organization_membership(*, user_id: str, organization_id: str, sb=None) -> dict[str, Any] | None:
    admin = sb or get_supabase_admin()
    return (
        admin.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .maybe_single()
        .execute()
        .data
    )


def _load_permission_keys_for_member(*, organization_id: str, organization_member_id: str, sb) -> set[str]:
    group_memberships = (
        sb.table("agchain_permission_group_memberships")
        .select("*")
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
        or []
    )
    if not group_memberships:
        return set()

    group_ids = {
        row["permission_group_id"]
        for row in group_memberships
        if row.get("permission_group_id")
    }
    if not group_ids:
        return set()

    groups = (
        sb.table("agchain_permission_groups")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    valid_group_ids = {
        row["permission_group_id"]
        for row in groups
        if row.get("permission_group_id") in group_ids
    }
    if not valid_group_ids:
        return set()

    grants = sb.table("agchain_permission_group_grants").select("*").execute().data or []
    return {
        str(row["permission_key"])
        for row in grants
        if row.get("permission_group_id") in valid_group_ids and row.get("permission_key")
    }


def require_organization_membership(*, user_id: str, organization_id: str, sb=None) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    organization = _load_organization_row(organization_id=organization_id, sb=admin)
    membership = load_active_organization_membership(
        user_id=user_id,
        organization_id=organization_id,
        sb=admin,
    )
    if organization is None or membership is None:
        raise HTTPException(status_code=403, detail="Organization access denied")

    permission_keys = _load_permission_keys_for_member(
        organization_id=organization_id,
        organization_member_id=str(membership["organization_member_id"]),
        sb=admin,
    )

    return {
        "organization": organization,
        "organization_member": membership,
        "permission_keys": permission_keys,
    }


def require_organization_permission(
    *,
    user_id: str,
    organization_id: str,
    permission_key: str,
    sb=None,
) -> dict[str, Any]:
    context = require_organization_membership(user_id=user_id, organization_id=organization_id, sb=sb)
    if permission_key not in context["permission_keys"]:
        raise HTTPException(status_code=403, detail="Organization access denied")
    return context
```

## `services/platform-api/app/domain/agchain/organization_members.py`

```python
from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException

from app.domain.agchain.organization_access import (
    OWNERS_SYSTEM_GROUP_KIND,
    require_organization_permission,
)
from app.infra.supabase_client import get_supabase_admin


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
INVITE_EXPIRY_DAYS = 7


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _isoformat(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def _normalize_email(value: str) -> str | None:
    normalized = value.strip().lower()
    if not normalized or not EMAIL_RE.match(normalized):
        return None
    return normalized


def _hash_invite_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _load_profiles_by_user_id(*, sb) -> dict[str, dict[str, Any]]:
    profiles = sb.table("profiles").select("*").execute().data or []
    return {
        str(row["id"]): row
        for row in profiles
        if row.get("id")
    }


def _load_groups_for_organization(*, organization_id: str, sb) -> dict[str, dict[str, Any]]:
    groups = (
        sb.table("agchain_permission_groups")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    return {
        str(row["permission_group_id"]): row
        for row in groups
        if row.get("permission_group_id")
    }


def _load_group_memberships_for_org_members(*, organization_member_ids: set[str], sb) -> list[dict[str, Any]]:
    if not organization_member_ids:
        return []
    memberships = sb.table("agchain_permission_group_memberships").select("*").execute().data or []
    return [
        row
        for row in memberships
        if str(row.get("organization_member_id")) in organization_member_ids
    ]


def _build_group_map(
    *,
    organization_member_ids: set[str],
    groups_by_id: dict[str, dict[str, Any]],
    sb,
) -> dict[str, list[dict[str, Any]]]:
    group_map: dict[str, list[dict[str, Any]]] = {member_id: [] for member_id in organization_member_ids}
    for row in _load_group_memberships_for_org_members(organization_member_ids=organization_member_ids, sb=sb):
        member_id = str(row["organization_member_id"])
        group = groups_by_id.get(str(row.get("permission_group_id")))
        if group is None:
            continue
        group_map.setdefault(member_id, []).append(
            {
                "permission_group_id": str(group["permission_group_id"]),
                "name": str(group["name"]),
                "is_system_group": bool(group.get("is_system_group", False)),
                "system_group_kind": group.get("system_group_kind"),
            }
        )
    for groups in group_map.values():
        groups.sort(key=lambda item: (0 if item["system_group_kind"] == OWNERS_SYSTEM_GROUP_KIND else 1, item["name"].lower()))
    return group_map


def _load_member_row(*, organization_id: str, organization_member_id: str, sb) -> dict[str, Any] | None:
    rows = (
        sb.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def _count_active_owner_members(*, organization_id: str, sb) -> int:
    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    owner_group_ids = {
        group_id
        for group_id, group in groups_by_id.items()
        if group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
    }
    if not owner_group_ids:
        return 0

    owner_member_ids = {
        str(row["organization_member_id"])
        for row in (sb.table("agchain_permission_group_memberships").select("*").execute().data or [])
        if str(row.get("permission_group_id")) in owner_group_ids and row.get("organization_member_id")
    }
    if not owner_member_ids:
        return 0

    return sum(
        1
        for row in (sb.table("agchain_organization_members").select("*").execute().data or [])
        if row.get("organization_id") == organization_id
        and row.get("membership_status") == "active"
        and str(row.get("organization_member_id")) in owner_member_ids
    )


def _member_is_owner(*, organization_id: str, organization_member_id: str, sb) -> bool:
    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    owner_group_ids = {
        group_id
        for group_id, group in groups_by_id.items()
        if group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
    }
    return any(
        str(row.get("organization_member_id")) == organization_member_id and str(row.get("permission_group_id")) in owner_group_ids
        for row in (sb.table("agchain_permission_group_memberships").select("*").execute().data or [])
    )


def list_organization_members(
    *,
    user_id: str,
    organization_id: str,
    search: str | None = None,
    status: str | None = None,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    access = require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.members.read",
        sb=admin,
    )

    rows = (
        admin.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    if status in {"active", "disabled"}:
        rows = [row for row in rows if row.get("membership_status") == status]

    profiles_by_user_id = _load_profiles_by_user_id(sb=admin)
    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    group_map = _build_group_map(
        organization_member_ids={str(row["organization_member_id"]) for row in rows if row.get("organization_member_id")},
        groups_by_id=groups_by_id,
        sb=admin,
    )

    normalized_search = search.strip().lower() if search else ""
    items = []
    for row in rows:
        organization_member_id = str(row["organization_member_id"])
        profile = profiles_by_user_id.get(str(row.get("user_id")), {})
        email = str(profile.get("email") or "")
        display_name = str(profile.get("display_name") or email or "")
        if normalized_search and normalized_search not in email.lower() and normalized_search not in display_name.lower():
            continue
        groups = group_map.get(organization_member_id, [])
        items.append(
            {
                "organization_member_id": organization_member_id,
                "organization_id": str(row["organization_id"]),
                "user_id": str(row["user_id"]),
                "email": email,
                "display_name": display_name,
                "membership_role": str(row["membership_role"]),
                "membership_status": str(row["membership_status"]),
                "created_at": row.get("created_at"),
                "group_count": len(groups),
                "groups": groups,
            }
        )

    return {
        "organization": {
            "organization_id": str(access["organization"]["organization_id"]),
            "organization_slug": str(access["organization"].get("organization_slug") or ""),
            "display_name": str(access["organization"].get("display_name") or ""),
            "is_personal": bool(access["organization"].get("is_personal", False)),
        },
        "items": items,
    }


def create_organization_invites(
    *,
    user_id: str,
    organization_id: str,
    emails: list[str],
    permission_group_ids: list[str],
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.members.invite",
        sb=admin,
    )

    groups_by_id = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    unknown_group_ids = [group_id for group_id in permission_group_ids if group_id not in groups_by_id]
    if unknown_group_ids:
        raise HTTPException(status_code=400, detail="Unknown permission group")

    profiles = _load_profiles_by_user_id(sb=admin)
    member_email_to_id = {
        _normalize_email(str(profile.get("email") or "")): member["organization_member_id"]
        for member in (admin.table("agchain_organization_members").select("*").eq("organization_id", organization_id).execute().data or [])
        for profile in [profiles.get(str(member.get("user_id")), {})]
        if _normalize_email(str(profile.get("email") or "")) is not None
    }
    pending_invites = (
        admin.table("agchain_organization_invites")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("invite_status", "pending")
        .execute()
        .data
        or []
    )
    pending_by_email = {
        str(row["invited_email_normalized"]): row
        for row in pending_invites
        if row.get("invited_email_normalized")
    }

    results = []
    for raw_email in emails:
        normalized_email = _normalize_email(raw_email)
        if normalized_email is None:
            results.append(
                {
                    "email": raw_email,
                    "outcome": "invalid_email",
                    "invite_id": None,
                    "invite_status": None,
                    "expires_at": None,
                    "permission_group_ids": [],
                    "error_code": "invalid_email",
                }
            )
            continue

        if normalized_email in member_email_to_id:
            results.append(
                {
                    "email": normalized_email,
                    "outcome": "already_member",
                    "invite_id": None,
                    "invite_status": None,
                    "expires_at": None,
                    "permission_group_ids": [],
                    "error_code": None,
                }
            )
            continue

        existing_invite = pending_by_email.get(normalized_email)
        if existing_invite is not None:
            results.append(
                {
                    "email": normalized_email,
                    "outcome": "already_pending",
                    "invite_id": str(existing_invite["organization_invite_id"]),
                    "invite_status": str(existing_invite["invite_status"]),
                    "expires_at": existing_invite.get("expires_at"),
                    "permission_group_ids": permission_group_ids,
                    "error_code": None,
                }
            )
            continue

        raw_token = secrets.token_urlsafe(32)
        invite_token_hash = _hash_invite_token(raw_token)
        now = _utcnow()
        expires_at = now + timedelta(days=INVITE_EXPIRY_DAYS)
        inserted = (
            admin.table("agchain_organization_invites")
            .insert(
                {
                    "organization_id": organization_id,
                    "invited_email": normalized_email,
                    "invited_email_normalized": normalized_email,
                    "invite_token_hash": invite_token_hash,
                    "invited_by_user_id": user_id,
                    "invite_status": "pending",
                    "expires_at": _isoformat(expires_at),
                    "accepted_at": None,
                    "revoked_at": None,
                    "created_at": _isoformat(now),
                    "updated_at": _isoformat(now),
                }
            )
            .execute()
            .data[0]
        )
        for permission_group_id in permission_group_ids:
            admin.table("agchain_organization_invite_group_assignments").insert(
                {
                    "organization_invite_id": inserted["organization_invite_id"],
                    "permission_group_id": permission_group_id,
                    "created_at": _isoformat(now),
                }
            ).execute()

        results.append(
            {
                "email": normalized_email,
                "outcome": "invite_created",
                "invite_id": str(inserted["organization_invite_id"]),
                "invite_status": "pending",
                "expires_at": inserted["expires_at"],
                "permission_group_ids": permission_group_ids,
                "error_code": None,
            }
        )

    return {
        "ok": True,
        "organization_id": organization_id,
        "results": results,
    }


def update_organization_membership_status(
    *,
    user_id: str,
    organization_id: str,
    organization_member_id: str,
    membership_status: str,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.members.remove",
        sb=admin,
    )

    if membership_status not in {"active", "disabled"}:
        raise HTTPException(status_code=400, detail="Invalid membership status")

    member = _load_member_row(organization_id=organization_id, organization_member_id=organization_member_id, sb=admin)
    if member is None:
        raise HTTPException(status_code=404, detail="Organization member not found")

    if membership_status == "disabled" and member.get("membership_status") == "active":
        if _member_is_owner(organization_id=organization_id, organization_member_id=organization_member_id, sb=admin):
            if _count_active_owner_members(organization_id=organization_id, sb=admin) <= 1:
                raise HTTPException(status_code=409, detail="At least one owner must remain active")

    now = _isoformat(_utcnow())
    updated = (
        admin.table("agchain_organization_members")
        .update(
            {
                "membership_status": membership_status,
                "updated_at": now,
            }
        )
        .eq("organization_id", organization_id)
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
    )
    row = updated[0]
    return {
        "ok": True,
        "member": {
            "organization_member_id": str(row["organization_member_id"]),
            "organization_id": str(row["organization_id"]),
            "user_id": str(row["user_id"]),
            "membership_role": str(row["membership_role"]),
            "membership_status": str(row["membership_status"]),
            "updated_at": row.get("updated_at"),
        },
    }
```

## `services/platform-api/app/domain/agchain/permission_groups.py`

```python
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.domain.agchain.organization_access import (
    OWNERS_SYSTEM_GROUP_KIND,
    V1_ORGANIZATION_PERMISSION_DEFINITIONS,
    get_permission_definitions,
    require_organization_permission,
)
from app.infra.supabase_client import get_supabase_admin


GROUP_POLICY_NOTICE = (
    "Custom groups expose only organization-level grant editing in V1. "
    "Protected system groups may carry seeded project-level grants."
)
GROUP_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _slugify_group_name(value: str) -> str:
    slug = GROUP_SLUG_RE.sub("-", value.strip().lower()).strip("-")
    return slug or "permission-group"


def _user_assignable_organization_permission_keys() -> set[str]:
    return {
        str(item["permission_key"])
        for item in V1_ORGANIZATION_PERMISSION_DEFINITIONS
        if bool(item.get("user_assignable"))
    }


def _load_groups_for_organization(*, organization_id: str, sb) -> list[dict[str, Any]]:
    return (
        sb.table("agchain_permission_groups")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )


def _load_group_by_id(*, organization_id: str, permission_group_id: str, sb) -> dict[str, Any] | None:
    groups = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    for group in groups:
        if str(group.get("permission_group_id")) == permission_group_id:
            return group
    return None


def _load_group_grants(*, permission_group_ids: set[str], sb) -> list[dict[str, Any]]:
    if not permission_group_ids:
        return []
    grants = sb.table("agchain_permission_group_grants").select("*").execute().data or []
    return [
        row
        for row in grants
        if str(row.get("permission_group_id")) in permission_group_ids
    ]


def _load_group_memberships(*, permission_group_ids: set[str], sb) -> list[dict[str, Any]]:
    if not permission_group_ids:
        return []
    memberships = sb.table("agchain_permission_group_memberships").select("*").execute().data or []
    return [
        row
        for row in memberships
        if str(row.get("permission_group_id")) in permission_group_ids
    ]


def _load_members_for_organization(*, organization_id: str, sb) -> dict[str, dict[str, Any]]:
    rows = (
        sb.table("agchain_organization_members")
        .select("*")
        .eq("organization_id", organization_id)
        .execute()
        .data
        or []
    )
    return {
        str(row["organization_member_id"]): row
        for row in rows
        if row.get("organization_member_id")
    }


def _load_profiles_by_user_id(*, sb) -> dict[str, dict[str, Any]]:
    rows = sb.table("profiles").select("*").execute().data or []
    return {
        str(row["id"]): row
        for row in rows
        if row.get("id")
    }


def _active_owner_count(*, organization_id: str, sb) -> int:
    groups = _load_groups_for_organization(organization_id=organization_id, sb=sb)
    owner_group_ids = {
        str(group["permission_group_id"])
        for group in groups
        if group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
    }
    if not owner_group_ids:
        return 0

    owner_member_ids = {
        str(row["organization_member_id"])
        for row in _load_group_memberships(permission_group_ids=owner_group_ids, sb=sb)
        if row.get("organization_member_id")
    }
    if not owner_member_ids:
        return 0

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=sb)
    return sum(
        1
        for member_id in owner_member_ids
        if members_by_id.get(member_id, {}).get("membership_status") == "active"
    )


def get_permission_group_definitions(*, user_id: str, organization_id: str, sb=None) -> dict[str, list[dict[str, Any]]]:
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=sb,
    )
    return get_permission_definitions()


def list_permission_groups(
    *,
    user_id: str,
    organization_id: str,
    search: str | None = None,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    access = require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=admin,
    )

    groups = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    normalized_search = search.strip().lower() if search else ""
    if normalized_search:
        groups = [
            group
            for group in groups
            if normalized_search in str(group.get("name") or "").lower()
        ]

    group_ids = {str(group["permission_group_id"]) for group in groups if group.get("permission_group_id")}
    memberships = _load_group_memberships(permission_group_ids=group_ids, sb=admin)
    grants = _load_group_grants(permission_group_ids=group_ids, sb=admin)

    items = []
    for group in sorted(groups, key=lambda item: (0 if item.get("is_system_group") else 1, str(item.get("name") or "").lower())):
        permission_group_id = str(group["permission_group_id"])
        group_memberships = [
            row
            for row in memberships
            if str(row.get("permission_group_id")) == permission_group_id
        ]
        group_grants = [
            row
            for row in grants
            if str(row.get("permission_group_id")) == permission_group_id
        ]
        items.append(
            {
                "permission_group_id": permission_group_id,
                "organization_id": str(group["organization_id"]),
                "name": str(group["name"]),
                "group_slug": str(group["group_slug"]),
                "description": str(group.get("description") or ""),
                "is_system_group": bool(group.get("is_system_group", False)),
                "system_group_kind": group.get("system_group_kind"),
                "member_count": len(group_memberships),
                "organization_permission_count": sum(1 for row in group_grants if row.get("scope_type") == "organization"),
                "project_permission_count": sum(1 for row in group_grants if row.get("scope_type") == "project"),
                "created_at": group.get("created_at"),
                "updated_at": group.get("updated_at"),
            }
        )

    return {
        "organization": {
            "organization_id": str(access["organization"]["organization_id"]),
            "organization_slug": str(access["organization"].get("organization_slug") or ""),
            "display_name": str(access["organization"].get("display_name") or ""),
        },
        "items": items,
    }


def create_permission_group(
    *,
    user_id: str,
    organization_id: str,
    name: str,
    description: str,
    permission_keys: list[str],
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.manage",
        sb=admin,
    )

    valid_permission_keys = _user_assignable_organization_permission_keys()
    invalid_keys = [key for key in permission_keys if key not in valid_permission_keys]
    if invalid_keys:
        raise HTTPException(status_code=400, detail="Invalid permission key")

    group_slug = _slugify_group_name(name)
    existing_groups = _load_groups_for_organization(organization_id=organization_id, sb=admin)
    if any(str(group.get("group_slug")) == group_slug for group in existing_groups):
        raise HTTPException(status_code=409, detail="Permission group already exists")

    now = _utcnow_iso()
    permission_group_id = str(uuid4())
    inserted_group = (
        admin.table("agchain_permission_groups")
        .insert(
            {
                "permission_group_id": permission_group_id,
                "organization_id": organization_id,
                "group_slug": group_slug,
                "name": name.strip(),
                "description": description.strip(),
                "is_system_group": False,
                "system_group_kind": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        .execute()
        .data[0]
    )

    for permission_key in permission_keys:
        admin.table("agchain_permission_group_grants").insert(
            {
                "permission_group_grant_id": str(uuid4()),
                "permission_group_id": permission_group_id,
                "scope_type": "organization",
                "permission_key": permission_key,
                "created_at": now,
            }
        ).execute()

    return {
        "ok": True,
        "group": {
            "permission_group_id": permission_group_id,
            "organization_id": str(inserted_group["organization_id"]),
            "name": str(inserted_group["name"]),
            "group_slug": str(inserted_group["group_slug"]),
            "description": str(inserted_group.get("description") or ""),
            "is_system_group": False,
            "organization_permission_count": len(permission_keys),
            "project_permission_count": 0,
            "created_at": inserted_group.get("created_at"),
            "updated_at": inserted_group.get("updated_at"),
        },
    }


def get_permission_group(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    grants = _load_group_grants(permission_group_ids={permission_group_id}, sb=admin)
    organization_grants = sorted(
        str(row["permission_key"])
        for row in grants
        if str(row.get("permission_group_id")) == permission_group_id and row.get("scope_type") == "organization"
    )
    project_grants = sorted(
        str(row["permission_key"])
        for row in grants
        if str(row.get("permission_group_id")) == permission_group_id and row.get("scope_type") == "project"
    )

    return {
        "group": {
            "permission_group_id": str(group["permission_group_id"]),
            "organization_id": str(group["organization_id"]),
            "name": str(group["name"]),
            "group_slug": str(group["group_slug"]),
            "description": str(group.get("description") or ""),
            "is_system_group": bool(group.get("is_system_group", False)),
            "system_group_kind": group.get("system_group_kind"),
        },
        "grants": {
            "organization": organization_grants,
            "project": project_grants,
        },
        "group_policy_notice": GROUP_POLICY_NOTICE,
    }


def list_permission_group_members(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    search: str | None = None,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.read",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=admin)
    profiles_by_user_id = _load_profiles_by_user_id(sb=admin)
    normalized_search = search.strip().lower() if search else ""

    items = []
    for row in _load_group_memberships(permission_group_ids={permission_group_id}, sb=admin):
        member = members_by_id.get(str(row.get("organization_member_id")))
        if member is None:
            continue
        profile = profiles_by_user_id.get(str(member.get("user_id")), {})
        email = str(profile.get("email") or "")
        display_name = str(profile.get("display_name") or email or "")
        if normalized_search and normalized_search not in email.lower() and normalized_search not in display_name.lower():
            continue
        items.append(
            {
                "organization_member_id": str(member["organization_member_id"]),
                "user_id": str(member["user_id"]),
                "email": email,
                "display_name": display_name,
                "membership_role": str(member["membership_role"]),
                "membership_status": str(member["membership_status"]),
                "created_at": member.get("created_at"),
            }
        )

    return {
        "group": {
            "permission_group_id": str(group["permission_group_id"]),
            "name": str(group["name"]),
            "is_system_group": bool(group.get("is_system_group", False)),
        },
        "items": items,
    }


def add_permission_group_members(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    organization_member_ids: list[str],
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.manage",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=admin)
    unknown_member_ids = [member_id for member_id in organization_member_ids if member_id not in members_by_id]
    if unknown_member_ids:
        raise HTTPException(status_code=404, detail="Organization member not found")

    existing_memberships = _load_group_memberships(permission_group_ids={permission_group_id}, sb=admin)
    existing_member_ids = {
        str(row["organization_member_id"])
        for row in existing_memberships
        if row.get("organization_member_id")
    }

    now = _utcnow_iso()
    added_items = []
    already_present_count = 0
    for organization_member_id in organization_member_ids:
        if organization_member_id in existing_member_ids:
            already_present_count += 1
            continue
        inserted = (
            admin.table("agchain_permission_group_memberships")
            .insert(
                {
                    "permission_group_membership_id": str(uuid4()),
                    "permission_group_id": permission_group_id,
                    "organization_member_id": organization_member_id,
                    "created_at": now,
                }
            )
            .execute()
            .data[0]
        )
        added_items.append(
            {
                "organization_member_id": str(inserted["organization_member_id"]),
                "permission_group_id": str(inserted["permission_group_id"]),
            }
        )

    return {
        "ok": True,
        "added_count": len(added_items),
        "already_present_count": already_present_count,
        "items": added_items,
    }


def remove_permission_group_member(
    *,
    user_id: str,
    organization_id: str,
    permission_group_id: str,
    organization_member_id: str,
    sb=None,
) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    require_organization_permission(
        user_id=user_id,
        organization_id=organization_id,
        permission_key="organization.permission_groups.manage",
        sb=admin,
    )

    group = _load_group_by_id(organization_id=organization_id, permission_group_id=permission_group_id, sb=admin)
    if group is None:
        raise HTTPException(status_code=404, detail="Permission group not found")

    members_by_id = _load_members_for_organization(organization_id=organization_id, sb=admin)
    member = members_by_id.get(organization_member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Organization member not found")

    if (
        group.get("system_group_kind") == OWNERS_SYSTEM_GROUP_KIND
        and str(member.get("membership_status")) == "active"
        and _active_owner_count(organization_id=organization_id, sb=admin) <= 1
    ):
        raise HTTPException(status_code=409, detail="At least one owner must remain active")

    deleted = (
        admin.table("agchain_permission_group_memberships")
        .delete()
        .eq("permission_group_id", permission_group_id)
        .eq("organization_member_id", organization_member_id)
        .execute()
        .data
    )
    return {
        "ok": True,
        "removed": bool(deleted),
    }
```

## `services/platform-api/app/domain/agchain/project_access.py`

```python
from __future__ import annotations

import logging
import time
from typing import Any, Iterable

from fastapi import HTTPException
from opentelemetry import metrics, trace

from app.domain.agchain.organization_access import load_active_organization_membership
from app.infra.supabase_client import get_supabase_admin
from app.observability.contract import safe_attributes, set_span_attributes


PROJECT_ACCESS_DENIED_LOG_EVENT = "agchain.project.access_denied"

logger = logging.getLogger("agchain-project-access")
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

project_access_duration_ms = meter.create_histogram("platform.agchain.project_access.check.duration_ms")


def _load_project_row(*, project_id: str, sb=None) -> dict[str, Any] | None:
    admin = sb or get_supabase_admin()
    return (
        admin.table("user_projects")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
        .data
    )


def _load_project_membership(*, user_id: str, project_id: str, sb) -> dict[str, Any] | None:
    return (
        sb.table("agchain_project_memberships")
        .select("*")
        .eq("project_id", project_id)
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .maybe_single()
        .execute()
        .data
    )


def _load_org_admin_membership(*, user_id: str, organization_id: str, sb) -> dict[str, Any] | None:
    membership = load_active_organization_membership(
        user_id=user_id,
        organization_id=organization_id,
        sb=sb,
    )
    if membership and membership.get("membership_role") == "organization_admin":
        return membership
    return None


def _deny_project_access(*, user_id: str, project_id: str, organization_id: str | None) -> None:
    logger.info(
        PROJECT_ACCESS_DENIED_LOG_EVENT,
        extra=safe_attributes(
            {
                "project_id_present": bool(project_id),
                "organization_id_present": organization_id is not None,
                "result": "denied",
                "http.status_code": 403,
            }
        ),
    )
    raise HTTPException(status_code=403, detail="Project access denied")


def load_accessible_projects(
    *,
    user_id: str,
    organization_id: str | None = None,
    sb=None,
) -> list[dict[str, Any]]:
    admin = sb or get_supabase_admin()
    membership_rows = (
        admin.table("agchain_project_memberships")
        .select("*")
        .eq("user_id", user_id)
        .eq("membership_status", "active")
        .execute()
        .data
        or []
    )
    memberships_by_project = {
        row["project_id"]: row["membership_role"]
        for row in membership_rows
        if row.get("project_id") and row.get("membership_role")
    }

    org_admin_rows = (
        admin.table("agchain_organization_members")
        .select("*")
        .eq("user_id", user_id)
        .eq("membership_role", "organization_admin")
        .eq("membership_status", "active")
        .execute()
        .data
        or []
    )
    org_admin_ids = {
        row["organization_id"]
        for row in org_admin_rows
        if row.get("organization_id")
    }

    query = admin.table("user_projects").select("*")
    if organization_id is not None:
        query = query.eq("organization_id", organization_id)
    project_rows = query.execute().data or []

    accessible: list[dict[str, Any]] = []
    for row in project_rows:
        project_id = row.get("project_id")
        org_id = row.get("organization_id")
        membership_role = memberships_by_project.get(project_id)
        if membership_role is None and org_id in org_admin_ids:
            membership_role = "organization_admin"
        if membership_role is None:
            continue
        accessible.append({**row, "membership_role": membership_role})
    return accessible


def require_project_access(*, user_id: str, project_id: str, sb=None) -> dict[str, Any]:
    admin = sb or get_supabase_admin()
    start = time.perf_counter()
    with tracer.start_as_current_span("agchain.project_access.check") as span:
        project = _load_project_row(project_id=project_id, sb=admin)
        organization_id = project.get("organization_id") if project else None

        membership_role: str | None = None
        if project:
            membership = _load_project_membership(user_id=user_id, project_id=project_id, sb=admin)
            if membership:
                membership_role = str(membership["membership_role"])
            elif isinstance(organization_id, str):
                org_admin_membership = _load_org_admin_membership(
                    user_id=user_id,
                    organization_id=organization_id,
                    sb=admin,
                )
                if org_admin_membership:
                    membership_role = "organization_admin"

        duration_ms = max(0, int((time.perf_counter() - start) * 1000))
        set_span_attributes(
            span,
            {
                "project_id_present": True,
                "organization_id_present": organization_id is not None,
                "membership_role": membership_role,
                "result": "granted" if membership_role is not None else "denied",
                "latency_ms": duration_ms,
            },
        )
        project_access_duration_ms.record(
            duration_ms,
            safe_attributes(
                {
                    "membership_role": membership_role,
                    "result": "granted" if membership_role is not None else "denied",
                    "project_id_present": True,
                }
            ),
        )

        if project is None or membership_role is None:
            _deny_project_access(
                user_id=user_id,
                project_id=project_id,
                organization_id=organization_id if isinstance(organization_id, str) else None,
            )

        return {**project, "membership_role": membership_role}


def require_project_write_access(
    *,
    user_id: str,
    project_id: str,
    allowed_project_roles: Iterable[str] | None = None,
    sb=None,
) -> dict[str, Any]:
    project = require_project_access(user_id=user_id, project_id=project_id, sb=sb)
    membership_role = str(project["membership_role"])
    allowed_roles = set(allowed_project_roles or ("project_admin", "project_editor"))
    if membership_role == "organization_admin" or membership_role in allowed_roles:
        return project
    _deny_project_access(
        user_id=user_id,
        project_id=project_id,
        organization_id=project.get("organization_id"),
    )
```

