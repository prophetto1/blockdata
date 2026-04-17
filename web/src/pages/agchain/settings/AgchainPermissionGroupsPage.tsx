import { useState } from 'react';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainPageHeader } from '@/components/agchain/AgchainPageHeader';
import { CreatePermissionGroupModal } from '@/components/agchain/settings/CreatePermissionGroupModal';
import { PermissionGroupMembersModal } from '@/components/agchain/settings/PermissionGroupMembersModal';
import { PermissionGroupPermissionsModal } from '@/components/agchain/settings/PermissionGroupPermissionsModal';
import { PermissionGroupsTable } from '@/components/agchain/settings/PermissionGroupsTable';
import { Button } from '@/components/ui/button';
import { useAgchainOrganizationScopeState } from '@/hooks/agchain/useAgchainOrganizationScopeState';
import { useAgchainPermissionGroups } from '@/hooks/agchain/useAgchainPermissionGroups';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

export default function AgchainPermissionGroupsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedPermissionGroupId, setSelectedPermissionGroupId] = useState<string | null>(null);
  const scopeState = useAgchainOrganizationScopeState();
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
  } = useAgchainPermissionGroups(
    scopeState.kind === 'ready' ? scopeState.selectedOrganizationId : null,
  );

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
