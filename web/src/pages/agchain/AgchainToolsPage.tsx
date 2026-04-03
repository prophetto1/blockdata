import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { Button } from '@/components/ui/button';
import {
  ComboboxRoot,
  ComboboxControl,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemText,
  useListCollection,
  useFilter,
} from '@/components/ui/combobox';
import {
  SelectRoot,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectHiddenSelect,
  createListCollection,
} from '@/components/ui/select';
import { AgchainToolEditorDialog } from '@/components/agchain/tools/AgchainToolEditorDialog';
import { AgchainToolInspector } from '@/components/agchain/tools/AgchainToolInspector';
import { AgchainToolsTable } from '@/components/agchain/tools/AgchainToolsTable';
import type { AgchainToolEditorState } from '@/components/agchain/tools/AgchainToolSourceEditor';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useAgchainTools } from '@/hooks/agchain/useAgchainTools';
import type { AgchainToolMutationPayload } from '@/lib/agchainTools';
import { AgchainPageFrame } from './AgchainPageFrame';


function editorStateToPayload(draft: AgchainToolEditorState): AgchainToolMutationPayload {
  const toolConfigJsonb: Record<string, unknown> = {};

  if (draft.sourceKind === 'custom') {
    toolConfigJsonb.implementation_kind = draft.implementationKind;
    toolConfigJsonb.implementation_ref = draft.implementationRef;
  } else if (draft.sourceKind === 'bridged') {
    toolConfigJsonb.bridge_name = draft.bridgeName;
    toolConfigJsonb.implementation_ref = draft.implementationRef;
  } else {
    toolConfigJsonb.transport_type = draft.transportType;
    if (draft.transportType === 'stdio') {
      toolConfigJsonb.command = draft.command;
      toolConfigJsonb.args = [];
    } else {
      toolConfigJsonb.url = draft.url;
      toolConfigJsonb.headers_secret_slots = [];
    }
  }

  return {
    sourceKind: draft.sourceKind,
    toolName: draft.toolName,
    displayName: draft.displayName,
    description: draft.description,
    approvalMode: draft.approvalMode,
    versionLabel: draft.versionLabel,
    inputSchemaJsonb: { type: 'object' },
    outputSchemaJsonb: { type: 'string' },
    toolConfigJsonb,
    parallelCallsAllowed: draft.parallelCallsAllowed,
  };
}

export default function AgchainToolsPage() {
  const scopeState = useAgchainScopeState('project');
  const [search, setSearch] = useState('');
  const [sourceKindFilter, setSourceKindFilter] = useState<string>('all');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const {
    items,
    secrets,
    listLoading,
    detailLoading,
    mutating,
    error,
    detailError,
    sourceKindOptions,
    selectedToolKey,
    selectedRow,
    selectedDetail,
    selectTool,
    closeInspector,
    createTool,
    updateSelectedTool,
    publishSelectedTool,
    archiveSelectedTool,
  } = useAgchainTools();

  const sourceKindFilterCollection = useMemo(() => createListCollection({
    items: [
      { label: 'All source kinds', value: 'all' },
      { label: 'builtin', value: 'builtin' },
      ...sourceKindOptions.map((sk) => ({ label: sk, value: sk })),
    ],
  }), [sourceKindOptions]);

  const { contains } = useFilter({ sensitivity: 'base' });

  const { collection: searchCollection, filter: filterSearch } = useListCollection({
    initialItems: items.map((row) => ({
      label: row.display_name,
      value: row.tool_id ?? row.tool_ref ?? row.tool_name,
    })),
    filter: contains,
  });

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((row) => {
      if (sourceKindFilter !== 'all' && row.source_kind !== sourceKindFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [row.display_name, row.tool_name, row.description, row.tool_ref ?? '']
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [items, search, sourceKindFilter]);

  async function handleSubmit(draft: AgchainToolEditorState) {
    setDialogError(null);
    try {
      const payload = editorStateToPayload(draft);
      if (editorMode === 'create') {
        await createTool(payload);
      } else {
        await updateSelectedTool(payload);
      }
      setEditorOpen(false);
    } catch (nextError) {
      setDialogError(nextError instanceof Error ? nextError.message : 'Tool save failed');
    }
  }

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-4 py-6">
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-4 py-6">
        <AgchainEmptyState
          title="AGChain tools unavailable"
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
      <AgchainPageFrame className="gap-4 py-6">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-4 py-6">
        <AgchainEmptyState
          title="Choose a project"
          description="Select a focused AGChain project before managing project-owned tool definitions."
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
    <AgchainPageFrame className="gap-4 py-6">
      <section className="rounded-3xl border border-border/70 bg-card/70 px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain project</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Tools</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          Manage the merged tool registry for {scopeState.focusedProject.project_name ?? scopeState.focusedProject.benchmark_name ?? 'this project'}: built-in catalog rows stay read-only while
          project-authored definitions can be versioned, published, and attached to benchmark tool bags.
        </p>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/70 px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <ComboboxRoot
              collection={searchCollection}
              inputValue={search}
              onInputValueChange={(details) => {
                setSearch(details.inputValue);
                filterSearch(details.inputValue);
              }}
              onValueChange={(details) => {
                const val = details.value[0];
                if (val) {
                  const row = items.find((r) => (r.tool_id ?? r.tool_ref ?? r.tool_name) === val);
                  if (row) selectTool(row);
                }
              }}
              openOnClick
              className="flex-1"
            >
              <ComboboxControl>
                <ComboboxInput placeholder="Search tools" />
              </ComboboxControl>
              <ComboboxContent>
                {searchCollection.items.map((item) => (
                  <ComboboxItem key={item.value} item={item}>
                    <ComboboxItemText>{item.label}</ComboboxItemText>
                  </ComboboxItem>
                ))}
              </ComboboxContent>
            </ComboboxRoot>
            <SelectRoot
              collection={sourceKindFilterCollection}
              value={[sourceKindFilter]}
              onValueChange={(details) => {
                const val = details.value[0];
                if (val) setSourceKindFilter(val);
              }}
              className="w-auto"
            >
              <SelectControl>
                <SelectTrigger className="h-9 min-w-[10rem] text-sm" aria-label="Filter source kind">
                  <SelectValueText />
                </SelectTrigger>
              </SelectControl>
              <SelectContent>
                {sourceKindFilterCollection.items.map((item) => (
                  <SelectItem key={item.value} item={item}>
                    <SelectItemText>{item.label}</SelectItemText>
                    <SelectItemIndicator>&#10003;</SelectItemIndicator>
                  </SelectItem>
                ))}
              </SelectContent>
              <SelectHiddenSelect />
            </SelectRoot>
          </div>

          <Button
            type="button"
            onClick={() => {
              setDialogError(null);
              setEditorMode('create');
              setEditorOpen(true);
            }}
          >
            Add tool
          </Button>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </section>

      <AgchainToolsTable
        rows={filteredRows}
        loading={listLoading}
        selectedToolKey={selectedToolKey}
        onInspect={(row) => selectTool(row)}
      />

      <AgchainToolInspector
        open={Boolean(selectedRow)}
        row={selectedRow}
        detail={selectedDetail}
        loading={detailLoading}
        error={detailError}
        saving={mutating}
        onOpenChange={(open) => {
          if (!open) {
            closeInspector();
          }
        }}
        onEdit={() => {
          setDialogError(null);
          setEditorMode('edit');
          setEditorOpen(true);
        }}
        onPublish={publishSelectedTool}
        onArchive={archiveSelectedTool}
      />

      <AgchainToolEditorDialog
        open={editorOpen}
        mode={editorMode}
        detail={editorMode === 'edit' ? selectedDetail : null}
        sourceKindOptions={sourceKindOptions}
        secrets={secrets}
        submitting={mutating}
        error={dialogError}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setDialogError(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </AgchainPageFrame>
  );
}
