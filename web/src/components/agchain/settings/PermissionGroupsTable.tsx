import { Button } from '@/components/ui/button';
import type { AgchainPermissionGroup } from '@/lib/agchainSettings';

type PermissionGroupsTableProps = {
  items: AgchainPermissionGroup[];
  onViewPermissions: (permissionGroupId: string) => void;
  onManageMembers: (permissionGroupId: string) => void;
};

export function PermissionGroupsTable({
  items,
  onViewPermissions,
  onManageMembers,
}: PermissionGroupsTableProps) {
  return (
    <div role="list" className="divide-y divide-border/60">
      {items.map((item) => (
        <article
          key={item.permission_group_id}
          role="listitem"
          className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              {item.is_system_group ? (
                <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  System group
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.description || 'No description yet.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {item.member_count} member{item.member_count === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {item.organization_permission_count} org grant{item.organization_permission_count === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {item.project_permission_count} project grant{item.project_permission_count === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewPermissions(item.permission_group_id)}
              aria-label={`View permissions for ${item.name}`}
            >
              View permissions
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onManageMembers(item.permission_group_id)}
              aria-label={`Manage members for ${item.name}`}
            >
              Manage members
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
