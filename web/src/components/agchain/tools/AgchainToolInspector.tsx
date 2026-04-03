import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { AgchainToolDetailResponse, AgchainToolRegistryRow } from '@/lib/agchainTools';

type AgchainToolInspectorProps = {
  open: boolean;
  row: AgchainToolRegistryRow | null;
  detail: AgchainToolDetailResponse | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onPublish: () => Promise<void>;
  onArchive: () => Promise<void>;
};

const SOURCE_BADGE: Record<string, 'blue' | 'teal' | 'violet' | 'orange' | 'gray'> = {
  builtin: 'blue',
  custom: 'teal',
  bridged: 'violet',
  mcp_server: 'orange',
};

const STATUS_BADGE: Record<string, 'green' | 'yellow' | 'gray'> = {
  published: 'green',
  draft: 'yellow',
  archived: 'gray',
};

type AgchainToolInspectorContentProps = {
  row: AgchainToolRegistryRow;
  detail: AgchainToolDetailResponse | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onEdit: () => void;
  onPublish: () => Promise<void>;
  onArchive: () => Promise<void>;
};

export function AgchainToolInspectorContent({
  row,
  detail,
  loading,
  error,
  saving,
  onEdit,
  onPublish,
  onArchive,
}: AgchainToolInspectorContentProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card/70 p-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={SOURCE_BADGE[row.source_kind] ?? 'gray'} size="sm">
            {row.source_kind}
          </Badge>
          <Badge variant={row.read_only ? 'gray' : 'secondary'} size="sm">
            {row.read_only ? 'Read-only built-in' : 'Project-authored'}
          </Badge>
        </div>

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Runtime ref</dt>
            <dd className="mt-1 font-mono text-foreground">{row.tool_ref ?? 'Unpublished draft'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Approval mode</dt>
            <dd className="mt-1 text-foreground">{row.approval_mode}</dd>
          </div>
        </dl>

        {!row.read_only ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onEdit}>
              Edit tool
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void onPublish()}>
              Publish latest
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void onArchive()}>
              Archive tool
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Version history
        </h3>

        {row.read_only ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Built-in catalog entries do not have project-side version history.
          </p>
        ) : loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading tool detail...</p>
        ) : error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : detail?.versions.length ? (
          <div className="mt-3 space-y-3">
            {detail.versions.map((version) => (
              <article key={version.tool_version_id} className="rounded-xl border border-border/70 bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{version.version_label}</p>
                  <Badge variant={STATUS_BADGE[version.status] ?? 'gray'} size="sm">
                    {version.status}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Parallel calls</p>
                    <p className="mt-1 text-foreground">
                      {version.parallel_calls_allowed ? 'Allowed' : 'Not allowed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Discovery</p>
                    <p className="mt-1 text-foreground">
                      {version.discovered_tools?.length
                        ? `${version.discovered_tools.length} child tools`
                        : 'No discovery metadata'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No versions have been created for this tool yet.</p>
        )}
      </section>
    </div>
  );
}

export function AgchainToolInspector({
  open,
  row,
  detail,
  loading,
  error,
  saving,
  onOpenChange,
  onEdit,
  onPublish,
  onArchive,
}: AgchainToolInspectorProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {row ? (
          <>
            <SheetHeader>
              <SheetTitle>{row.display_name}</SheetTitle>
              <SheetDescription>{row.description || 'No description has been added yet.'}</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <AgchainToolInspectorContent
                row={row}
                detail={detail}
                loading={loading}
                error={error}
                saving={saving}
                onEdit={onEdit}
                onPublish={onPublish}
                onArchive={onArchive}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
