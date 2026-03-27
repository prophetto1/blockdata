import type { SecretMetadata } from '@/lib/secretsApi';

type SecretsTableProps = {
  secrets: SecretMetadata[];
  loading: boolean;
  deletingId: string | null;
  onEdit: (secret: SecretMetadata) => void;
  onDelete: (secret: SecretMetadata) => void;
};

function formatKind(value: SecretMetadata['value_kind']): string {
  return value.replace(/_/g, ' ');
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function SecretsTable({
  secrets,
  loading,
  deletingId,
  onEdit,
  onDelete,
}: SecretsTableProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (secrets.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No secrets configured yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Suffix</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {secrets.map((secret) => (
              <tr key={secret.id} className="align-top">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{secret.name}</td>
                <td className="px-4 py-3 text-foreground">{formatKind(secret.value_kind)}</td>
                <td className="px-4 py-3 text-muted-foreground">{secret.value_suffix || 'Write-only'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {secret.description?.trim() ? secret.description : 'No description'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatUpdatedAt(secret.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                      aria-label={`Edit ${secret.name}`}
                      onClick={() => onEdit(secret)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                      aria-label={`Delete ${secret.name}`}
                      disabled={deletingId === secret.id}
                      onClick={() => onDelete(secret)}
                    >
                      {deletingId === secret.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
