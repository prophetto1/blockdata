import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { AgchainModelInspector } from '@/components/agchain/models/AgchainModelInspector';
import { AgchainModelsTable } from '@/components/agchain/models/AgchainModelsTable';
import { AgchainModelsToolbar } from '@/components/agchain/models/AgchainModelsToolbar';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { useAgchainModels } from '@/hooks/agchain/useAgchainModels';
import { AgchainPageFrame } from './AgchainPageFrame';

export default function AgchainModelsPage() {
  const [search, setSearch] = useState('');
  const { focusedProject, loading: focusLoading } = useAgchainProjectFocus();
  const {
    items,
    providers,
    selectedModelId,
    selectedModel,
    recentHealthChecks,
    providerDefinition,
    listLoading,
    providersLoading,
    detailLoading,
    mutating,
    refreshing,
    error,
    detailError,
    selectModel,
    createModel,
    updateSelectedModel,
    refreshSelectedModelHealth,
  } = useAgchainModels();

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.label, item.provider_display_name, item.qualified_model, item.model_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [items, search]);

  if (!focusLoading && !focusedProject) {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain project</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Choose an AGChain project</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Models is a child page of the selected AGChain project or evaluation. Pick a project from the registry
            before editing model targets for its benchmark package.
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
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected AGChain project</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Models</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {(focusedProject?.benchmark_name ?? 'Selected project')} owns this models page. Model targets, provider
          readiness, and health checks stay scoped to the focused AGChain project or evaluation.
        </p>
      </section>

      <AgchainModelsToolbar
        providers={providers}
        search={search}
        onSearchChange={setSearch}
        onCreate={createModel}
        creating={mutating}
        error={error}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,0.95fr)]">
        <AgchainModelsTable
          items={filteredItems}
          loading={listLoading || providersLoading}
          selectedModelId={selectedModelId}
          onSelect={selectModel}
        />
        <AgchainModelInspector
          selectedModel={selectedModel}
          providers={providers}
          providerDefinition={providerDefinition}
          recentHealthChecks={recentHealthChecks}
          loading={detailLoading}
          error={detailError}
          saving={mutating}
          refreshing={refreshing}
          onRefresh={refreshSelectedModelHealth}
          onUpdate={updateSelectedModel}
        />
      </div>
    </AgchainPageFrame>
  );
}
