import { useMemo, useState } from 'react';

import { normalizeLifecycleState, type PlanArtifactSummary, type PlanUnit, type WorkflowActionId } from './planTrackerModel';

type WorkflowActionOption = {
  id: WorkflowActionId;
  label: string;
};

type Props = {
  plan: PlanUnit;
  artifact: PlanArtifactSummary;
  dirty?: boolean;
  availableActions?: WorkflowActionOption[];
  onAction?: (actionId: WorkflowActionId) => void;
  onCreateNote?: (input: { title: string; body: string }) => void;
  pendingAction?: { actionId: WorkflowActionId } | null;
  onResolvePendingAction?: (choice: 'save' | 'discard' | 'cancel') => void;
};

const DEFAULT_ACTIONS: WorkflowActionOption[] = [
  { id: 'reject-with-notes', label: 'Reject with Notes' },
  { id: 'approve-with-notes', label: 'Approve with Notes' },
  { id: 'create-revision', label: 'Create Revision' },
  { id: 'attach-implementation-note', label: 'Attach Implementation Note' },
  { id: 'attach-verification', label: 'Attach Verification' },
];

function Field({
  label,
  value,
}: {
  label: string;
  value: string | undefined | null;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{value && value.length > 0 ? value : '--'}</div>
    </div>
  );
}

function Badge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'status' | 'type';
}) {
  const className =
    tone === 'status'
      ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
      : tone === 'type'
        ? 'bg-muted text-muted-foreground'
        : 'bg-background text-foreground border border-border';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function PlanMetadataPane({
  plan,
  artifact,
  dirty = false,
  availableActions = DEFAULT_ACTIONS,
  onAction,
  onCreateNote,
  pendingAction = null,
  onResolvePendingAction,
}: Props) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const relatedArtifactsText = useMemo(() => {
    if (!artifact.metadata.relatedArtifacts?.length) return '--';
    return artifact.metadata.relatedArtifacts.join(', ');
  }, [artifact.metadata.relatedArtifacts]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-metadata-pane">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
        <p className="mt-1 text-xs text-muted-foreground">Metadata, workflow, and artifact-backed notes</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Summary
            </div>

            <div>
              <div className="text-base font-semibold text-foreground">{artifact.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="status">{normalizeLifecycleState(artifact.status)}</Badge>
                <Badge tone="type">{artifact.artifactType}</Badge>
                <Badge>v{artifact.version}</Badge>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Classification
            </div>

            <div className="grid gap-3">
              <Field label="Product L1" value={artifact.metadata.productL1 ?? plan.productArea} />
              <Field label="Product L2" value={artifact.metadata.productL2 ?? plan.functionalArea} />
              <Field label="Product L3" value={artifact.metadata.productL3} />
              <Field label="Plan ID" value={plan.planId} />
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Timeline
            </div>

            <div className="grid gap-3">
              <Field label="Created" value={formatDate(artifact.metadata.createdAt)} />
              <Field label="Updated" value={formatDate(artifact.metadata.updatedAt)} />
              <Field label="Supersedes" value={artifact.metadata.supersedesArtifactId} />
              <Field label="Related" value={relatedArtifactsText} />
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Workflow Actions
            </div>

            <div className="space-y-2">
              {availableActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No workflow actions available for this lifecycle state.
                </p>
              ) : (
                availableActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!onAction}
                    onClick={() => onAction?.(action.id)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                  >
                    {action.label}
                  </button>
                ))
              )}
            </div>

            {pendingAction ? (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
                <div className="text-sm font-medium text-foreground">Resolve pending action</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dirty
                    ? `Unsaved edits must be resolved before ${pendingAction.actionId}.`
                    : `Continue ${pendingAction.actionId}.`}
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium"
                    onClick={() => onResolvePendingAction?.('save')}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium"
                    onClick={() => onResolvePendingAction?.('discard')}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium"
                    onClick={() => onResolvePendingAction?.('cancel')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {dirty
                  ? 'Unsaved edits will trigger the dirty-action gate before workflow side effects occur.'
                  : 'Workflow actions update the controlling plan artifact and may create note artifacts.'}
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Notes / Action Composer
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Note title"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Write a structured note that should become a real artifact file..."
                rows={5}
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                disabled={!onCreateNote || !noteTitle.trim() || !noteBody.trim()}
                onClick={() => {
                  onCreateNote?.({ title: noteTitle.trim(), body: noteBody.trim() });
                  setNoteTitle('');
                  setNoteBody('');
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
              >
                Create note artifact
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Related Artifacts
            </div>

            {artifact.metadata.relatedArtifacts?.length ? (
              <div className="space-y-2">
                {artifact.metadata.relatedArtifacts.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No related artifacts recorded yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
