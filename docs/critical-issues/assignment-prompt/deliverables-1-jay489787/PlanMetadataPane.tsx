import { useMemo, useState } from 'react';

import {
  normalizeLifecycleState,
  type PlanArtifactSummary,
  type PlanUnit,
  type WorkflowActionId,
} from './planTrackerModel';

type WorkflowActionOption = {
  id: WorkflowActionId;
  label: string;
};

type Props = {
  plan: PlanUnit | null;
  artifact: PlanArtifactSummary | null;
  dirty?: boolean;
  availableActions?: WorkflowActionOption[];
  onAction?: (actionId: WorkflowActionId) => void;
  onCreateNote?: (input: { title: string; body: string }) => void;
  pendingAction?: { actionId: WorkflowActionId } | null;
  onResolvePendingAction?: (choice: 'save' | 'discard' | 'cancel') => void;
};

const PLACEHOLDER_WORKFLOW_ACTIONS: WorkflowActionOption[] = [
  { id: 'start-work', label: 'Start Work' },
  { id: 'submit-for-review', label: 'Submit for Review' },
  { id: 'send-back', label: 'Send Back' },
  { id: 'approve', label: 'Approve' },
  { id: 'mark-implementing', label: 'Mark Implementing' },
  { id: 'mark-implemented', label: 'Mark Implemented' },
  { id: 'request-verification', label: 'Request Verification' },
  { id: 'close', label: 'Close' },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-background px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  editable = false,
}: {
  label: string;
  value: string | undefined | null;
  editable?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <span
          className={[
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            editable
              ? 'bg-muted text-muted-foreground'
              : 'border border-border bg-background text-muted-foreground',
          ].join(' ')}
        >
          {editable ? 'Editable' : 'Read only'}
        </span>
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
        : 'border border-border bg-background text-foreground';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function TagPill({ value, placeholder = false }: { value: string; placeholder?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium',
        placeholder
          ? 'border border-border bg-background text-muted-foreground'
          : 'bg-muted text-foreground',
      ].join(' ')}
    >
      {value}
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
  availableActions = [],
  onAction,
  onCreateNote,
  pendingAction = null,
  onResolvePendingAction,
}: Props) {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const relatedArtifacts = useMemo(
    () => artifact?.metadata.relatedArtifacts ?? [],
    [artifact?.metadata.relatedArtifacts],
  );

  const hasSelection = Boolean(plan && artifact);

  const lifecycle = artifact ? normalizeLifecycleState(artifact.status) : '--';

  const tags = artifact?.metadata.tags?.length
    ? artifact.metadata.tags
    : hasSelection
      ? []
      : ['tag', 'tag'];

  const actionsToRender = hasSelection
    ? availableActions
    : PLACEHOLDER_WORKFLOW_ACTIONS;

  const canCreateNote = Boolean(hasSelection && onCreateNote);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-metadata-pane">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Metadata, lifecycle actions, and artifact-backed notes
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <Section title="Summary">
            <div>
              <div className="text-base font-semibold text-foreground">
                {artifact?.title ?? 'No artifact selected'}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="status">{lifecycle}</Badge>
                <Badge tone="type">{artifact?.artifactType ?? 'artifact-type'}</Badge>
                <Badge>v{artifact?.version ?? '--'}</Badge>
              </div>
            </div>
          </Section>

          <Section title="Classification">
            <div className="grid gap-3">
              <Field label="Product L1" value={artifact?.metadata.productL1 ?? plan?.productArea} editable />
              <Field label="Product L2" value={artifact?.metadata.productL2 ?? plan?.functionalArea} editable />
              <Field label="Product L3" value={artifact?.metadata.productL3} editable />
              <Field label="Plan ID" value={plan?.planId} />
              <Field label="Owner" value={artifact?.metadata.owner} editable />
              <Field label="Reviewer" value={artifact?.metadata.reviewer} editable />

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Tags
                  </div>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Editable
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.length ? (
                    tags.map((tag) => (
                      <TagPill key={tag} value={tag} placeholder={!hasSelection} />
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No tags recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Timeline">
            <div className="grid gap-3">
              <Field label="Created" value={formatDate(artifact?.metadata.createdAt)} />
              <Field label="Updated" value={formatDate(artifact?.metadata.updatedAt)} />
              <Field label="Supersedes" value={artifact?.metadata.supersedesArtifactId} />
              <Field
                label="Lineage"
                value={relatedArtifacts.length ? `${relatedArtifacts.length} related artifact(s)` : '--'}
              />
            </div>
          </Section>

          <Section title="Workflow Actions">
            <div className="space-y-2">
              {actionsToRender.map((action) => {
                const enabled = hasSelection && availableActions.some((item) => item.id === action.id);

                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!enabled || !onAction}
                    onClick={() => {
                      if (enabled) onAction?.(action.id);
                    }}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {action.label}
                  </button>
                );
              })}
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
                {hasSelection
                  ? dirty
                    ? 'Unsaved edits will trigger the dirty-action gate before workflow side effects occur.'
                    : 'Workflow actions update the controlling plan artifact and may create note artifacts.'
                  : 'Select a plan artifact to enable lifecycle actions and note creation.'}
              </p>
            )}
          </Section>

          <Section title="Notes / Action Composer">
            <div className="space-y-2">
              <textarea
                readOnly
                value={artifact?.metadata.notes ?? ''}
                placeholder="Plan-level notes and context will appear here when present."
                rows={3}
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none opacity-80"
              />

              <input
                type="text"
                value={noteTitle}
                disabled={!canCreateNote}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Note title"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <textarea
                value={noteBody}
                disabled={!canCreateNote}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Write a structured note that should become a real artifact file..."
                rows={5}
                className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                disabled={!canCreateNote || !noteTitle.trim() || !noteBody.trim()}
                onClick={() => {
                  onCreateNote?.({ title: noteTitle.trim(), body: noteBody.trim() });
                  setNoteTitle('');
                  setNoteBody('');
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create note artifact
              </button>
            </div>
          </Section>

          <Section title="Related Artifacts">
            {relatedArtifacts.length ? (
              <div className="space-y-2">
                {relatedArtifacts.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {hasSelection ? (
                  <p className="text-sm text-muted-foreground">No related artifacts recorded yet.</p>
                ) : (
                  <>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      related-artifact.md
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                      review-note-v1.md
                    </div>
                  </>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
