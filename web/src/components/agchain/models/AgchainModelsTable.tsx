import type { AgchainProviderRow } from '@/lib/agchainModelProviders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type AgchainModelsTableProps = {
  providerRows: AgchainProviderRow[];
  loading: boolean;
  selectedProviderSlug: string | null;
  onConfigure: (providerSlug: string) => void;
};

const STATUS_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  configured: 'green',
  needs_attention: 'red',
  not_configured: 'yellow',
  no_targets: 'gray',
};

const STATUS_LABEL: Record<string, string> = {
  configured: 'Configured',
  needs_attention: 'Needs attention',
  not_configured: 'Not configured',
  no_targets: 'No targets',
};

function formatLastChecked(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

export function AgchainModelsTable({
  providerRows,
  loading,
  selectedProviderSlug,
  onConfigure,
}: AgchainModelsTableProps) {
  return (
    <section className="flex flex-col rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <div className="border-b border-border/70 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Provider configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per supported provider, with curated targets and health detail available from Configure.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-6 py-3 font-medium">Provider</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Targets</th>
              <th className="px-6 py-3 font-medium">Last Checked</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Loading providers...
                </td>
              </tr>
            ) : providerRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No providers are available.
                </td>
              </tr>
            ) : (
              providerRows.map((provider) => (
                <tr
                  key={provider.provider_slug}
                  className={cn(
                    'border-b border-border/60 align-top hover:bg-accent/20',
                    selectedProviderSlug === provider.provider_slug && 'bg-accent/30',
                  )}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{provider.display_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {provider.provider_definition.supported_auth_kinds.join(', ') || 'No auth metadata'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_BADGE[provider.status] ?? 'gray'} size="sm">
                      {STATUS_LABEL[provider.status] ?? provider.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{provider.target_count}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatLastChecked(provider.last_checked_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onConfigure(provider.provider_slug)}
                      aria-label={`Configure ${provider.display_name}`}
                    >
                      Configure
                    </Button>
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
