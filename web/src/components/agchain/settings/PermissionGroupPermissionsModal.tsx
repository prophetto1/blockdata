import { DialogBody, DialogCloseTrigger, DialogContent, DialogDescription, DialogRoot, DialogTitle } from '@/components/ui/dialog';
import type { AgchainPermissionGroupDetailResponse } from '@/lib/agchainSettings';

type PermissionGroupPermissionsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  detail: AgchainPermissionGroupDetailResponse | null;
};

function GrantList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="grid gap-2 rounded-md border border-border/70 bg-card/60 p-3">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {items.length ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-md border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No grants stored for this scope.</p>
      )}
    </div>
  );
}

export function PermissionGroupPermissionsModal({
  open,
  onOpenChange,
  loading,
  error,
  detail,
}: PermissionGroupPermissionsModalProps) {
  return (
    <DialogRoot modal={false} open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      <DialogContent className="w-[42rem] max-w-[calc(100vw-2rem)]">
        <DialogCloseTrigger />
        <DialogTitle>Permission Group Permissions</DialogTitle>
        <DialogDescription>
          Inspect the stored organization-level and project-level grants for this AGChain permission group.
        </DialogDescription>
        <DialogBody>
          {loading ? <p className="text-sm text-muted-foreground">Loading permission group grants...</p> : null}
          {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && detail ? (
            <div className="grid gap-4">
              <div className="rounded-md border border-border/70 bg-card/60 p-4">
                <p className="text-sm font-medium text-foreground">{detail.group.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.group.description || 'No description provided.'}
                </p>
              </div>

              <GrantList title="Organization Grants" items={detail.grants.organization} />
              <GrantList title="Project Grants" items={detail.grants.project} />

              <div className="rounded-md border border-border/70 bg-card/60 p-3 text-sm text-muted-foreground">
                {detail.group_policy_notice}
              </div>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
