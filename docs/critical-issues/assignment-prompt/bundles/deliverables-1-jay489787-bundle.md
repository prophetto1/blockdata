# Deliverables 1 Jay489787 Bundle

Bundled source files for review.

## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-1-jay489787\PlanDocumentPane.tsx`

`$ext
import type { ReactNode } from 'react';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import type { PlanArtifactSummary } from './planTrackerModel';

type Props = {
  artifact: PlanArtifactSummary | null;
  hasDirectory: boolean;
  loading?: boolean;
  dirty?: boolean;
  documentContent: string;
  originalContent: string;
  fileKey: string;
  viewMode?: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  onOpenDirectory?: () => void;
};

type ModeButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
};

function ModeButton({ label, active = false, disabled = true }: ModeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'rounded px-2 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function FrameMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-8">
      <div className="max-w-md space-y-3 text-center">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

function resolveFileLabel(artifact: PlanArtifactSummary | null) {
  if (!artifact) return 'No artifact selected';
  const parts = artifact.path.split('/');
  return parts[parts.length - 1] ?? artifact.title;
}

function resolveStatusLabel({
  hasDirectory,
  artifact,
  dirty,
}: {
  hasDirectory: boolean;
  artifact: PlanArtifactSummary | null;
  dirty?: boolean;
}) {
  if (!hasDirectory) return 'Directory not connected';
  if (!artifact) return 'Select a plan artifact to begin';
  if (dirty) return 'Unsaved changes';
  return 'Ready';
}

export function PlanDocumentPane({
  artifact,
  hasDirectory,
  loading = false,
  dirty = false,
  documentContent,
  originalContent,
  fileKey,
  viewMode = 'rich-text',
  onChange,
  onSave,
  onOpenDirectory,
}: Props) {
  const fileLabel = resolveFileLabel(artifact);
  const statusLabel = resolveStatusLabel({ hasDirectory, artifact, dirty });

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-foreground">Document Workspace</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Open, review, and update tracker-managed Markdown artifacts
        </div>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-mono text-xs text-foreground">{fileLabel}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{statusLabel}</div>
          </div>

          <button
            type="button"
            disabled={!artifact || !dirty || !onSave}
            onClick={onSave}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
          <ModeButton label="Edit" active />
          <ModeButton label="Preview" />
          <ModeButton label="Source" disabled={viewMode !== 'source'} />
          <ModeButton label="Diff" disabled={viewMode !== 'diff'} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {!hasDirectory ? (
          <FrameMessage
            title="Open the plans directory"
            body="Connect the approved docs/plans directory to begin browsing lifecycle-grouped plan artifacts."
            action={
              onOpenDirectory ? (
                <button
                  type="button"
                  onClick={onOpenDirectory}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Open Plans Directory
                </button>
              ) : null
            }
          />
        ) : loading ? (
          <FrameMessage
            title="Loading workspace"
            body="Reading tracker artifacts and preparing the document workspace."
          />
        ) : !artifact ? (
          <FrameMessage
            title="Select a plan artifact"
            body="Choose a plan or nested artifact from the lifecycle navigator to populate this document workspace."
          />
        ) : (
          <MdxEditorSurface
            content={documentContent}
            diffMarkdown={originalContent}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={onChange}
            onSave={onSave}
          />
        )}
      </div>
    </div>
  );
}
`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-1-jay489787\PlanMetadataPane.tsx`

`$ext
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

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-1-jay489787\PlanStateNavigator.tsx`

`$ext
import { useMemo } from 'react';

import {
  normalizeLifecycleState,
  type LifecycleState,
  type PlanArtifactSummary,
  type PlanUnit,
} from './planTrackerModel';

const LIFECYCLE_TABS: Array<{ id: LifecycleState; label: string }> = [
  { id: 'to-do', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'under-review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'implemented', label: 'Implemented' },
  { id: 'verified', label: 'Verified' },
  { id: 'closed', label: 'Closed' },
];

type PlanStateNavigatorProps = {
  activeState: LifecycleState;
  onChangeState: (state: LifecycleState) => void;
  planUnits: PlanUnit[];
  selectedPlanId: string | null;
  selectedArtifactId: string | null;
  onSelectPlan: (planId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
  hasDirectory?: boolean;
  loading?: boolean;
  error?: string;
  onOpenDirectory?: () => void;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function artifactTypeLabel(value: string) {
  return value.replace(/-/g, ' ');
}

function getArtifactTimestamp(artifact: PlanArtifactSummary) {
  return artifact.metadata.updatedAt ?? artifact.metadata.createdAt ?? null;
}

function PlaceholderPlanRow() {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <div className="space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

export function PlanStateNavigator({
  activeState,
  onChangeState,
  planUnits,
  selectedPlanId,
  selectedArtifactId,
  onSelectPlan,
  onSelectArtifact,
  hasDirectory = false,
  loading = false,
  error = '',
  onOpenDirectory,
}: PlanStateNavigatorProps) {
  const counts = useMemo(() => {
    const map = new Map<LifecycleState, number>();
    for (const tab of LIFECYCLE_TABS) {
      map.set(tab.id, 0);
    }

    for (const unit of planUnits) {
      const resolved = normalizeLifecycleState(unit.status);
      map.set(resolved, (map.get(resolved) ?? 0) + 1);
    }

    return map;
  }, [planUnits]);

  const filteredPlans = useMemo(
    () => planUnits.filter((unit) => normalizeLifecycleState(unit.status) === activeState),
    [activeState, planUnits],
  );

  const activeLabel = LIFECYCLE_TABS.find((tab) => tab.id === activeState)?.label ?? 'Current State';
  const showPlaceholderRows = !hasDirectory || (loading && planUnits.length === 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-state-navigator">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Plans</h2>
        <p className="mt-1 text-xs text-muted-foreground">Lifecycle-driven tracker view</p>
      </div>

      <div className="border-b border-border px-2 py-2">
        <div className="grid grid-cols-2 gap-1 xl:grid-cols-1">
          {LIFECYCLE_TABS.map((tab) => {
            const selected = tab.id === activeState;
            const count = hasDirectory ? counts.get(tab.id) ?? 0 : null;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeState(tab.id)}
                className={[
                  'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                <span className="font-medium">{tab.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                  {count ?? 'â€”'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {showPlaceholderRows ? (
          <div className="space-y-3">
            <PlaceholderPlanRow />
            <PlaceholderPlanRow />
            <PlaceholderPlanRow />

            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {!hasDirectory ? 'Open the plans directory' : 'Loading plan units'}
              </div>
              <div className="mt-1">
                {!hasDirectory
                  ? 'Connect docs/plans to populate lifecycle-grouped plan rows here.'
                  : 'Preparing metadata-grouped tracker rows.'}
              </div>
              {!hasDirectory && onOpenDirectory ? (
                <button
                  type="button"
                  onClick={onOpenDirectory}
                  className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Open Plans Directory
                </button>
              ) : null}
              {error ? <div className="mt-2 text-xs text-destructive">{error}</div> : null}
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div>
              <p className="text-sm font-medium text-foreground">No plans in {activeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch tabs or verify metadata normalization for this directory.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPlans.map((plan) => {
              const selectedPlan = plan.planId === selectedPlanId;

              return (
                <div
                  key={plan.planId}
                  className={[
                    'rounded-lg border transition-colors',
                    selectedPlan ? 'border-primary/30 bg-primary/5' : 'border-border bg-background',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan.planId)}
                    className="w-full px-3 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{plan.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{plan.artifacts.length} artifacts</span>
                          {plan.productArea ? <span>{plan.productArea}</span> : null}
                          {plan.functionalArea ? <span>{plan.functionalArea}</span> : null}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {normalizeLifecycleState(plan.status)}
                      </span>
                    </div>
                  </button>

                  {selectedPlan ? (
                    <div className="border-t border-border px-2 py-2">
                      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Artifacts
                      </div>

                      <div className="space-y-1">
                        {plan.artifacts.map((artifact) => {
                          const selectedArtifact = artifact.artifactId === selectedArtifactId;

                          return (
                            <button
                              key={artifact.artifactId}
                              type="button"
                              onClick={() => onSelectArtifact(artifact.artifactId)}
                              className={[
                                'flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors',
                                selectedArtifact
                                  ? 'bg-accent text-foreground'
                                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                              ].join(' ')}
                            >
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{artifact.title}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
                                    {artifactTypeLabel(artifact.artifactType)}
                                  </span>
                                  <span>v{artifact.version}</span>
                                  <span>{formatTimestamp(getArtifactTimestamp(artifact))}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-1-jay489787\PlanTracker.tsx`

`$ext
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench } from '@/components/workbench/Workbench';

import {
  PLAN_TRACKER_DEFAULT_PANES,
  PLAN_TRACKER_TABS,
  usePlanTracker,
} from './usePlanTracker';

export function Component() {
  useShellHeaderTitle({ title: 'Plan Tracker', breadcrumbs: ['Superuser'] });

  const tracker = usePlanTracker();

  return (
    <div className="h-full w-full min-h-0 p-2" data-testid="plan-tracker-shell">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Browser-local tracker workspace
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            Lifecycle navigator, document workspace, and workflow inspector
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Reads and writes tracker-managed Markdown artifacts from disk through the File System Access API.
          </div>
        </div>

        <Workbench
          tabs={PLAN_TRACKER_TABS}
          defaultPanes={PLAN_TRACKER_DEFAULT_PANES}
          saveKey="plan-tracker-layout-v2"
          renderContent={tracker.renderContent}
          hideToolbar
          maxColumns={3}
          minColumns={3}
          maxTabsPerPane={1}
          disableDrag
          lockLayout
        />
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-1-jay489787\usePlanTracker-patch.tsx`

`$ext
// ============================================================
// Deliverable 4 â€” Patch for: web/src/pages/superuser/usePlanTracker.tsx
//
// 4A. Add this import at the top of usePlanTracker.tsx
// 4B. Replace the existing renderContent with the version below
// 4C. Remove the old whole-pane empty-state branches
// ============================================================

// --- 4A: Add import ---

import { PlanDocumentPane } from './PlanDocumentPane';

// --- 4B: Replace renderContent with this version ---

const renderContent = useCallback(
  (tabId: string) => {
    const hasDirectory = Boolean(directoryHandleRef.current);

    if (tabId === 'plan-state') {
      return (
        <PlanStateNavigator
          activeState={activeState}
          onChangeState={selectState}
          planUnits={planUnits}
          selectedPlanId={selectedPlan?.planId ?? null}
          selectedArtifactId={selectedArtifact?.artifactId ?? null}
          onSelectPlan={selectPlan}
          onSelectArtifact={selectArtifact}
          hasDirectory={hasDirectory}
          loading={loading}
          error={error}
          onOpenDirectory={() => void openPlansDirectory()}
        />
      );
    }

    if (tabId === 'document') {
      return (
        <PlanDocumentPane
          artifact={selectedArtifact}
          hasDirectory={hasDirectory}
          loading={loading}
          dirty={dirty}
          documentContent={documentContent}
          originalContent={originalContent}
          fileKey={fileKey}
          viewMode={viewMode}
          onChange={setDocumentContent}
          onSave={() => void saveCurrentDocument()}
          onOpenDirectory={() => void openPlansDirectory()}
        />
      );
    }

    if (tabId === 'metadata') {
      return (
        <PlanMetadataPane
          plan={selectedPlan}
          artifact={selectedArtifact}
          dirty={dirty}
          availableActions={availableActions}
          pendingAction={pendingAction}
          onAction={(actionId) => void runWorkflowAction(actionId)}
          onCreateNote={(input) => void createNoteArtifact(input)}
          onResolvePendingAction={(choice) => void resolvePendingAction(choice)}
        />
      );
    }

    if (tabId === 'document-preview' && selectedArtifact) {
      return <PlanDocumentPreview title={selectedArtifact.title} markdown={documentContent} />;
    }

    return null;
  },
  [
    activeState,
    availableActions,
    createNoteArtifact,
    dirty,
    documentContent,
    error,
    fileKey,
    loading,
    openPlansDirectory,
    originalContent,
    pendingAction,
    planUnits,
    resolvePendingAction,
    runWorkflowAction,
    saveCurrentDocument,
    selectArtifact,
    selectPlan,
    selectState,
    selectedArtifact,
    selectedPlan,
    setDocumentContent,
    viewMode,
  ],
);

// --- 4C: Remove the old whole-pane empty-state returns ---
//
// Delete the old renderContent branches that returned:
//   - centered "Open Plans Directory" inside the left pane in place of the navigator
//   - bare "No artifact selected."
//   - bare "No metadata available."
//
// Those are the exact state-gating behaviors Phase 2 eliminates.
`$nl
