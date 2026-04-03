import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgchainToolEditorDialog } from '@/components/agchain/tools/AgchainToolEditorDialog';
import { AgchainToolInspectorContent } from '@/components/agchain/tools/AgchainToolInspector';
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

  const scopeMessage = (() => {
    if (scopeState.kind === 'error') {
      return {
        title: 'AGChain tools unavailable',
        description: 'Failed to load AGChain workspace context.',
        action: (
          <button
            type="button"
            onClick={() => void scopeState.reload()}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Retry
          </button>
        ),
      };
    }
    if (scopeState.kind === 'no-organization') {
      return { title: 'No organization', description: 'Select or create an organization to continue.', action: undefined as React.ReactNode };
    }
    if (scopeState.kind === 'no-project') {
      return {
        title: 'Choose a project',
        description: 'Select a focused AGChain project before managing project-owned tool definitions.',
        action: (
          <Link
            to="/app/agchain/projects"
            className="inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Open project registry
          </Link>
        ),
      };
    }
    return null;
  })();

  if (scopeMessage) {
    return (
      <AgchainPageFrame className="gap-0 p-0">
        <ShellPageHeader
          title="Tools"
          description="Manage the merged tool registry."
        />
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
          <div className="flex min-h-0 flex-col items-center justify-center border-b border-border p-6 lg:border-b-0 lg:border-r">
            <AgchainEmptyState title={scopeMessage.title} description={scopeMessage.description} action={scopeMessage.action} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">No tool selected</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Select a tool from the table to inspect details, versions, and configuration.
            </p>
          </div>
        </div>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame className="gap-0 p-0">
      <ShellPageHeader
        title="Tools"
        description={scopeState.kind === 'ready'
          ? `Manage the merged tool registry for ${scopeState.focusedProject.project_name ?? scopeState.focusedProject.benchmark_name ?? 'this project'}: built-in catalog rows stay read-only while project-authored definitions can be versioned, published, and attached to benchmark tool bags.`
          : 'Manage the merged tool registry.'}
      />

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
        <div className="flex min-h-0 flex-col border-b border-border p-1 lg:border-b-0 lg:border-r">
            <AgchainToolsTable
            rows={filteredRows}
            loading={listLoading}
            selectedToolKey={selectedToolKey}
            onInspect={(row) => selectTool(row)}
            error={error}
            headerControls={(
              <div className="flex flex-col gap-3 xl:items-end">
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
              </div>
            )}
            />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {selectedRow ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {selectedRow.display_name}
                  </h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {selectedRow.description || 'No description has been added yet.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeInspector}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Close inspector"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="px-4 py-4">
                <AgchainToolInspectorContent
                  row={selectedRow}
                  detail={selectedDetail}
                  loading={detailLoading}
                  error={detailError}
                  saving={mutating}
                  onEdit={() => {
                    setDialogError(null);
                    setEditorMode('edit');
                    setEditorOpen(true);
                  }}
                  onPublish={publishSelectedTool}
                  onArchive={archiveSelectedTool}
                />
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <h2 className="text-lg font-semibold text-foreground">No tool selected</h2>
              <p className="max-w-xs text-sm text-muted-foreground">
                Select a tool from the table to inspect details, versions, and configuration.
              </p>
            </div>
          )}
        </div>
      </div>

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
