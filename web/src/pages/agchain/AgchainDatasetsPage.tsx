import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgchainPageFrame } from './AgchainPageFrame';
import { AgchainDatasetsToolbar } from '@/components/agchain/datasets/AgchainDatasetsToolbar';
import { AgchainDatasetsTable } from '@/components/agchain/datasets/AgchainDatasetsTable';
import { useAgchainDatasets } from '@/hooks/agchain/useAgchainDatasets';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

export default function AgchainDatasetsPage() {
  const { focusedProject, status, reload: reloadWorkspace } = useAgchainProjectFocus();
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

  if (status === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>
      </AgchainPageFrame>
    );
  }

  if (status === 'error') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Failed to load AGChain workspace context.</p>
          <button onClick={() => void reloadWorkspace()} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">Retry</button>
        </div>
      </AgchainPageFrame>
    );
  }

  if (status === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">No organization</h1>
          <p className="mt-3 text-sm text-muted-foreground">Select or create an organization to continue.</p>
        </section>
      </AgchainPageFrame>
    );
  }

  if (!focusedProject) {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain project</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Choose an AGChain project</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Datasets is a child page of the selected AGChain project or evaluation. Pick a project from the registry
            before working in this surface.
          </p>
          <Link
            to="/app/agchain/projects"
            className="mt-5 inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Open project registry
          </Link>
        </section>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame>
      <div className="flex flex-col gap-6 py-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Datasets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage evaluation datasets for {focusedProject.project_name ?? 'this project'}.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
