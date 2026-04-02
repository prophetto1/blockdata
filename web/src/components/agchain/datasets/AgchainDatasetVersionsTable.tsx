import type { AgchainDatasetVersionSummary } from '@/lib/agchainDatasets';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type AgchainDatasetVersionsTableProps = {
  versions: AgchainDatasetVersionSummary[];
  loading: boolean;
};

const VALIDATION_BADGE: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  pass: 'green',
  warn: 'yellow',
  fail: 'red',
  unknown: 'gray',
};

function truncateChecksum(checksum: string, maxLen = 16) {
  return checksum.length > maxLen ? `${checksum.slice(0, maxLen)}...` : checksum;
}

export function AgchainDatasetVersionsTable({ versions, loading }: AgchainDatasetVersionsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
      <ScrollArea className="min-h-0">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 font-medium">Version Label</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5 font-medium">Sample Count</th>
              <th className="px-4 py-2.5 font-medium">Checksum</th>
              <th className="px-4 py-2.5 font-medium">Validation</th>
              <th className="px-4 py-2.5 font-medium">Base Version</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading versions...
                </td>
              </tr>
            ) : versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No versions found.
                </td>
              </tr>
            ) : (
              versions.map((version) => (
                <tr key={version.dataset_version_id} className="border-b border-border/50">
                  <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                    {version.version_label}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {new Date(version.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-foreground">
                    {version.sample_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-muted-foreground">
                    {truncateChecksum(version.checksum)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={VALIDATION_BADGE[version.validation_status] ?? 'gray'} size="sm">
                      {version.validation_status.charAt(0).toUpperCase() + version.validation_status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {version.base_version_id ?? '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  );
}
