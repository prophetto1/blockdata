import { useCallback, useState } from 'react';
import { AgchainPageFrame } from './AgchainPageFrame';
import { AgchainDatasetsToolbar } from '@/components/agchain/datasets/AgchainDatasetsToolbar';
import { AgchainDatasetsTable } from '@/components/agchain/datasets/AgchainDatasetsTable';
import { useAgchainDatasets } from '@/hooks/agchain/useAgchainDatasets';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

export default function AgchainDatasetsPage() {
  const { focusedProject } = useAgchainProjectFocus();
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

  if (!focusedProject) {
    return (
      <AgchainPageFrame>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Choose a project</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a project from the sidebar to view its datasets.
            </p>
          </div>
        </div>
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
