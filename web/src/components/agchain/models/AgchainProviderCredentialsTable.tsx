import { Fragment, type ReactNode } from 'react';
import { IconSearch } from '@tabler/icons-react';
import type {
  AgchainCredentialScope,
  AgchainCredentialStatus,
  AgchainScopedModelProvider,
} from '@/lib/agchainModelProviderCredentials';

type RowAction = 'Add Credential' | 'Edit' | 'Remove';

type AgchainProviderCredentialsTableProps = {
  scope: AgchainCredentialScope;
  rows: AgchainScopedModelProvider[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onOpenProvider: (providerSlug: string) => void;
  onRemoveProvider: (provider: AgchainScopedModelProvider) => void;
  header?: ReactNode;
};

function categoryLabel(category: AgchainScopedModelProvider['provider_category']) {
  return category === 'cloud_provider' ? 'Cloud providers' : 'Model providers';
}

function displayStatus(status: AgchainCredentialStatus) {
  if (status === 'not_set') return 'Not set';
  if (status === 'inherited') return 'Inherited';
  return 'Set';
}

function statusColor(status: AgchainCredentialStatus) {
  if (status === 'set') return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'inherited') return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

function getRowActions(scope: AgchainCredentialScope, status: AgchainCredentialStatus): RowAction[] {
  if (status === 'not_set') return ['Add Credential'];
  if (status === 'set') return ['Edit', 'Remove'];
  if (scope === 'project') return ['Edit'];
  return ['Edit', 'Remove'];
}

function formatLastUpdated(value: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleString();
}

export function AgchainProviderCredentialsTable({
  scope,
  rows,
  loading,
  query,
  onQueryChange,
  onOpenProvider,
  onRemoveProvider,
  header,
}: AgchainProviderCredentialsTableProps) {
  const groupedRows = rows.reduce<Map<string, AgchainScopedModelProvider[]>>((accumulator, provider) => {
    const label = categoryLabel(provider.provider_category);
    const bucket = accumulator.get(label) ?? [];
    bucket.push(provider);
    accumulator.set(label, bucket);
    return accumulator;
  }, new Map());

  return (
    <section className="rounded-3xl border border-border/80 bg-card/85 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Provider credentials</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage provider access at the {scope === 'organization' ? 'organization' : 'project'} scope.
          </p>
        </div>
        {header}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] max-w-sm flex-1">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.currentTarget.value)}
              placeholder="Search providers"
              aria-label="Search providers"
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          <button
            type="button"
            onClick={() => onQueryChange('')}
            disabled={!query.trim()}
            className={`text-xs ${
              query.trim()
                ? 'text-muted-foreground hover:text-foreground'
                : 'cursor-not-allowed text-muted-foreground/50'
            }`}
          >
            Clear all
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-auto">
            <table className="min-w-full text-left">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Credential Status</th>
                  <th className="px-3 py-2">Last Update</th>
                  <th className="w-40 px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Loading providers...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No provider rows match &quot;{query}&quot;.
                    </td>
                  </tr>
                ) : (
                  Array.from(groupedRows.entries()).map(([category, providers]) => (
                    <Fragment key={category}>
                      <tr className="border-b border-border bg-muted/25">
                        <td colSpan={4} className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {category}
                        </td>
                      </tr>
                      {providers.map((provider) => {
                        const rowActions = getRowActions(scope, provider.credential_status);
                        return (
                          <tr key={provider.provider_slug} className="border-b border-border/60 align-top hover:bg-accent/20">
                            <td className="px-3 py-3">
                              <div className="leading-tight">
                                <p className="text-sm font-medium text-foreground">{provider.display_name}</p>
                                {provider.env_var_name ? (
                                  <p className="mt-1 text-[11px] text-muted-foreground">{provider.env_var_name}</p>
                                ) : null}
                              </div>
                            </td>
                            <td className={`px-3 py-3 text-sm font-medium ${statusColor(provider.credential_status)}`}>
                              {displayStatus(provider.credential_status)}
                            </td>
                            <td className="px-3 py-3 text-sm text-muted-foreground">
                              {formatLastUpdated(provider.last_updated_at)}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                {rowActions.map((action) => {
                                  if (action === 'Remove') {
                                    return (
                                      <button
                                        key={`${provider.provider_slug}-${action}`}
                                        type="button"
                                        onClick={() => onRemoveProvider(provider)}
                                        className="text-xs text-destructive hover:underline"
                                      >
                                        {action}
                                      </button>
                                    );
                                  }
                                  return (
                                    <button
                                      key={`${provider.provider_slug}-${action}`}
                                      type="button"
                                      onClick={() => onOpenProvider(provider.provider_slug)}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      {action}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
