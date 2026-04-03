import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { AgchainDatasetsToolbar } from '@/components/agchain/datasets/AgchainDatasetsToolbar';
import { AgchainDatasetsTable } from '@/components/agchain/datasets/AgchainDatasetsTable';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useAgchainDatasets } from '@/hooks/agchain/useAgchainDatasets';
import { AgchainPageFrame } from './AgchainPageFrame';

export default function AgchainDatasetsPage() {
  const scopeState = useAgchainScopeState('project');
  const { items, loading, error } = useAgchainDatasets();

  const [search, setSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string | null>(null);
  const [validationFilter, setValidationFilter] = useState<string | null>(null);

  const filteredItems = useCallback(() => {
    let result = items;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (row) => row.name.toLowerCase().includes(lower) || row.slug.toLowerCase().includes(lower),
      );
    }
    if (sourceTypeFilter) {
      result = result.filter((row) => row.source_type === sourceTypeFilter);
    }
    if (validationFilter) {
      result = result.filter((row) => row.validation_status === validationFilter);
    }
    return result;
  }, [items, search, sourceTypeFilter, validationFilter])();

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <AgchainEmptyState
          title="AGChain datasets unavailable"
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
      <AgchainPageFrame className="gap-8 py-10">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <AgchainEmptyState
          eyebrow="AGChain project"
          title="Choose an AGChain project"
          description="Datasets is a child page of the selected AGChain project or evaluation. Pick a project from the registry before working in this surface."
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame>
      <div className="flex min-h-0 flex-1 flex-col gap-6 py-6">
        <ShellPageHeader
          title="Datasets"
          description={`Manage evaluation datasets for ${scopeState.focusedProject.project_name ?? scopeState.focusedProject.benchmark_name ?? 'this project'}.`}
        />

        {error && (
          <div className="shrink-0 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <AgchainDatasetsToolbar
          search={search}
          onSearchChange={setSearch}
          sourceTypeFilter={sourceTypeFilter}
          onSourceTypeChange={setSourceTypeFilter}
          validationFilter={validationFilter}
          onValidationChange={setValidationFilter}
        />

        <AgchainDatasetsTable items={filteredItems} loading={loading} />
      </div>
    </AgchainPageFrame>
  );
}
