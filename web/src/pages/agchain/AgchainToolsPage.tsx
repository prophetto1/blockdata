import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AgchainToolEditorDialog } from '@/components/agchain/tools/AgchainToolEditorDialog';
import { AgchainToolInspector } from '@/components/agchain/tools/AgchainToolInspector';
import { AgchainToolsTable } from '@/components/agchain/tools/AgchainToolsTable';
import type { AgchainToolEditorState } from '@/components/agchain/tools/AgchainToolSourceEditor';
import { useAgchainTools } from '@/hooks/agchain/useAgchainTools';
import type { AgchainToolMutationPayload } from '@/lib/agchainTools';
import { AgchainPageFrame } from './AgchainPageFrame';

const selectClass =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

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
  const [search, setSearch] = useState('');
  const [sourceKindFilter, setSourceKindFilter] = useState<string>('all');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const {
    focusedProject,
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

  if (!focusedProject) {
    return (
      <AgchainPageFrame className="gap-4 py-6">
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-border/70 bg-card/70 px-6 py-12 text-center shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a project</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Select a focused AGChain project before managing project-owned tool definitions.
            </p>
          </div>
        </div>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame className="gap-4 py-6">
      <section className="rounded-3xl border border-border/70 bg-card/70 px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain project</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Tools</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          Manage the merged tool registry for {focusedProject.project_name}: built-in catalog rows stay read-only while
          project-authored definitions can be versioned, published, and attached to benchmark tool bags.
        </p>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/70 px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <input
              className={inputClass}
              placeholder="Search tools"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
            <select
              className={selectClass}
              value={sourceKindFilter}
              onChange={(event) => setSourceKindFilter(event.currentTarget.value)}
              aria-label="Filter source kind"
            >
              <option value="all">All source kinds</option>
              <option value="builtin">builtin</option>
              {sourceKindOptions.map((sourceKind) => (
                <option key={sourceKind} value={sourceKind}>
                  {sourceKind}
                </option>
              ))}
            </select>
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
