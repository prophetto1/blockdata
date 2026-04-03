import { Button } from '@/components/ui/button';
import type { AgchainOrganizationMember, AgchainOrganizationMemberStatus } from '@/lib/agchainSettings';

type OrganizationMembersTableProps = {
  items: AgchainOrganizationMember[];
  updatingMemberId: string | null;
  onUpdateMembershipStatus: (
    organizationMemberId: string,
    membershipStatus: AgchainOrganizationMemberStatus,
  ) => Promise<void>;
};

function formatMembershipStatus(status: AgchainOrganizationMemberStatus): string {
  return status === 'active' ? 'Active' : 'Disabled';
}

function formatMembershipRole(role: AgchainOrganizationMember['membership_role']): string {
  return role === 'organization_admin' ? 'Organization Admin' : 'Organization Member';
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function OrganizationMembersTable({
  items,
  updatingMemberId,
  onUpdateMembershipStatus,
}: OrganizationMembersTableProps) {
  return (
    <div role="list" className="divide-y divide-border/60">
      {items.map((item) => {
        const nextStatus: AgchainOrganizationMemberStatus =
          item.membership_status === 'active' ? 'disabled' : 'active';
        const actionLabel = nextStatus === 'disabled' ? 'Disable member' : 'Reactivate member';
        const mutating = updatingMemberId === item.organization_member_id;

        return (
          <article
            key={item.organization_member_id}
            role="listitem"
            className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(item.display_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.display_name}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      {formatMembershipRole(item.membership_role)}
                    </span>
                    <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      {formatMembershipStatus(item.membership_status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.groups.length ? (
                      item.groups.map((group) => (
                        <span
                          key={group.permission_group_id}
                          className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          {group.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No groups assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutating}
                onClick={() => void onUpdateMembershipStatus(item.organization_member_id, nextStatus)}
              >
                {mutating ? 'Updating...' : actionLabel}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
