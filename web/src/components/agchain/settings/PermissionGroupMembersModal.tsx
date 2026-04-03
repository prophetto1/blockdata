import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AgchainOrganizationMember,
  AgchainPermissionGroupMembersResponse,
} from '@/lib/agchainSettings';

type PermissionGroupMembersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  adding: boolean;
  removingMemberId: string | null;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  membersData: AgchainPermissionGroupMembersResponse | null;
  availableMembers: AgchainOrganizationMember[];
  onAddMembers: (organizationMemberIds: string[]) => Promise<void>;
  onRemoveMember: (organizationMemberId: string) => Promise<void>;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export function PermissionGroupMembersModal({
  open,
  onOpenChange,
  loading,
  adding,
  removingMemberId,
  error,
  search,
  onSearchChange,
  membersData,
  availableMembers,
  onAddMembers,
  onRemoveMember,
}: PermissionGroupMembersModalProps) {
  return (
    <DialogRoot modal={false} open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open ? (
        <PermissionGroupMembersModalContent
          loading={loading}
          adding={adding}
          removingMemberId={removingMemberId}
          error={error}
          search={search}
          onSearchChange={onSearchChange}
          membersData={membersData}
          availableMembers={availableMembers}
          onAddMembers={onAddMembers}
          onRemoveMember={onRemoveMember}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </DialogRoot>
  );
}

type PermissionGroupMembersModalContentProps = Pick<
  PermissionGroupMembersModalProps,
  | 'loading'
  | 'adding'
  | 'removingMemberId'
  | 'error'
  | 'search'
  | 'onSearchChange'
  | 'membersData'
  | 'availableMembers'
  | 'onAddMembers'
  | 'onRemoveMember'
  | 'onOpenChange'
>;

function PermissionGroupMembersModalContent({
  loading,
  adding,
  removingMemberId,
  error,
  search,
  onSearchChange,
  membersData,
  availableMembers,
  onAddMembers,
  onRemoveMember,
  onOpenChange,
}: PermissionGroupMembersModalContentProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  function toggleAvailableMember(organizationMemberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(organizationMemberId)
        ? current.filter((value) => value !== organizationMemberId)
        : [...current, organizationMemberId],
    );
  }

  async function handleAddMembers() {
    if (!selectedMemberIds.length) {
      return;
    }
    await onAddMembers(selectedMemberIds);
    setSelectedMemberIds([]);
  }

  return (
    <DialogContent className="w-[44rem] max-w-[calc(100vw-2rem)]">
      <DialogCloseTrigger />
      <DialogTitle>Permission Group Members</DialogTitle>
      <DialogDescription>
        Search active organization members, add them to this group, and remove existing assignments when needed.
      </DialogDescription>
      <DialogBody>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="permission-group-members-search">
            Search members
          </label>
          <input
            id="permission-group-members-search"
            type="search"
            className={inputClass}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search members"
          />
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading permission group members...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && membersData ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="grid gap-3 rounded-md border border-border/70 bg-card/60 p-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Current Members</h3>
                <p className="text-xs text-muted-foreground">{membersData.group.name}</p>
              </div>

              {membersData.items.length ? (
                <ul className="grid gap-2">
                  {membersData.items.map((member) => (
                    <li
                      key={member.organization_member_id}
                      className="flex items-start justify-between gap-3 rounded-md border border-border/50 bg-background/60 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{member.display_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={removingMemberId === member.organization_member_id}
                        onClick={() => void onRemoveMember(member.organization_member_id)}
                        aria-label={`Remove ${member.display_name}`}
                      >
                        {removingMemberId === member.organization_member_id ? 'Removing...' : 'Remove'}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No members are assigned to this group yet.</p>
              )}
            </section>

            <section className="grid gap-3 rounded-md border border-border/70 bg-card/60 p-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Available Members</h3>
                <p className="text-xs text-muted-foreground">
                  Add active organization members who are not already assigned to this group.
                </p>
              </div>

              {availableMembers.length ? (
                <ul className="grid gap-2">
                  {availableMembers.map((member) => (
                    <li
                      key={member.organization_member_id}
                      className="rounded-md border border-border/50 bg-background/60 p-3"
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-border"
                          checked={selectedMemberIds.includes(member.organization_member_id)}
                          onChange={() => toggleAvailableMember(member.organization_member_id)}
                          aria-label={`Select ${member.display_name}`}
                        />
                        <span className="grid gap-1">
                          <span className="text-sm font-medium text-foreground">{member.display_name}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No additional active members match the current search.</p>
              )}
            </section>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        <Button type="button" disabled={adding || !selectedMemberIds.length} onClick={() => void handleAddMembers()}>
          {adding ? 'Adding...' : 'Add Selected Members'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
