import { useState } from 'react';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainPageHeader } from '@/components/agchain/AgchainPageHeader';
import { InviteOrganizationMembersModal } from '@/components/agchain/settings/InviteOrganizationMembersModal';
import { OrganizationMembersTable } from '@/components/agchain/settings/OrganizationMembersTable';
import { Button } from '@/components/ui/button';
import {
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectHiddenSelect,
  createListCollection,
} from '@/components/ui/select';
import { useAgchainOrganizationScopeState } from '@/hooks/agchain/useAgchainOrganizationScopeState';
import { useAgchainOrganizationMembers } from '@/hooks/agchain/useAgchainOrganizationMembers';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

export default function AgchainOrganizationMembersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const scopeState = useAgchainOrganizationScopeState();
  const statusCollection = createListCollection({
    items: [
      { label: 'All', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Disabled', value: 'disabled' },
    ],
  });

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
  } = useAgchainOrganizationMembers(
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
                <SelectRoot
                  collection={statusCollection}
                  value={[statusFilter]}
                  onValueChange={(details) => {
                    const val = details.value[0];
                    if (val) setStatusFilter(val as 'active' | 'disabled' | 'all');
                  }}
                >
                  <SelectControl>
                    <SelectTrigger className="w-full text-sm" aria-label="Show members by status">
                      <SelectValueText />
                    </SelectTrigger>
                  </SelectControl>
                  <SelectContent>
                    {statusCollection.items.map((item) => (
                      <SelectItem key={item.value} item={item}>
                        <SelectItemText>{item.label}</SelectItemText>
                        <SelectItemIndicator>&#10003;</SelectItemIndicator>
                      </SelectItem>
                    ))}
                  </SelectContent>
                  <SelectHiddenSelect />
                </SelectRoot>
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
