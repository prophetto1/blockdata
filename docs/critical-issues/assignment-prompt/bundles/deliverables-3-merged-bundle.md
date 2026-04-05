# Deliverables 3 Merged Bundle

Bundled source files for review.

## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-3-merged\PlanDocumentPane.tsx`

`$ext
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import type { PlanArtifactSummary } from './planTrackerModel';

type Props = {
  artifact: PlanArtifactSummary | null;
  content: string;
  diffMarkdown: string;
  fileKey: string;
  viewMode: MdxViewMode;
  dirty: boolean;
  hasDirectory: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onOpenPlansDirectory: () => void;
};

const VIEW_MODE_OPTIONS = [
  { value: 'rich-text', label: 'Edit' },
  { value: 'preview', label: 'Preview' },
  { value: 'source', label: 'Source' },
  { value: 'diff', label: 'Diff' },
];

function resolveStatusLabel({
  hasDirectory,
  artifact,
  dirty,
}: {
  hasDirectory: boolean;
  artifact: PlanArtifactSummary | null;
  dirty: boolean;
}) {
  if (!hasDirectory) return 'Directory not connected';
  if (!artifact) return 'Select a plan artifact to begin';
  if (dirty) return 'Unsaved changes';
  return 'Ready';
}

export function PlanDocumentPane({
  artifact,
  content,
  diffMarkdown,
  fileKey,
  viewMode,
  dirty,
  hasDirectory,
  loading = false,
  onChange,
  onSave,
  onOpenPlansDirectory,
}: Props) {
  const title = artifact?.title ?? 'No artifact selected';
  const pathLabel = artifact?.path ?? '';
  const statusLabel = resolveStatusLabel({ hasDirectory, artifact, dirty });

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Document Workspace</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Open, review, and update tracker-managed Markdown artifacts
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPlansDirectory}
          >
            {hasDirectory ? 'Reconnect Plans Directory' : 'Open Plans Directory'}
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {pathLabel || statusLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={dirty ? 'default' : 'outline'} size="sm">
              {dirty ? 'Unsaved' : artifact ? 'Saved' : 'Idle'}
            </Badge>
            <Badge variant="outline" size="sm">
              {artifact?.artifactType ?? 'artifact pending'}
            </Badge>
            <Badge variant="outline" size="sm">
              {artifact ? `v${artifact.version}` : 'version pending'}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!artifact || !dirty}
              onClick={onSave}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <SegmentedControl
            data={VIEW_MODE_OPTIONS}
            value={viewMode}
            size="sm"
            disabled={!artifact}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {!hasDirectory ? (
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Open the plans directory</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect the approved docs/plans directory to begin browsing lifecycle-grouped plan artifacts.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onOpenPlansDirectory}
              >
                Open Plans Directory
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Loading workspace</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Reading tracker artifacts and preparing the document workspace.
              </p>
            </div>
          </div>
        ) : artifact ? (
          <MdxEditorSurface
            content={content}
            diffMarkdown={diffMarkdown}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={onChange}
            onSave={onSave}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Select a plan artifact</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a plan or nested artifact from the lifecycle navigator to populate this document workspace.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

`$nl
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-3-merged\PlanMetadataPane.tsx`

`$ext
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { normalizeLifecycleState, type PlanArtifactSummary, type PlanUnit, type WorkflowActionId } from './planTrackerModel';

type WorkflowActionOption = {
  id: WorkflowActionId;
  label: string;
};

type Props = {
  plan?: PlanUnit | null;
  artifact?: PlanArtifactSummary | null;
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

function InfoBadge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'status' | 'type';
}) {
  const variant = tone === 'status' ? 'default' : 'outline';
  return (
    <Badge variant={variant} size="sm">
      {children}
    </Badge>
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

function TagsRow({ tags, placeholder }: { tags: string[]; placeholder?: boolean }) {
  return (
    <div className="space-y-2">
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
            <Badge key={tag} variant={placeholder ? 'outline' : 'secondary'} size="sm">
              {tag}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No tags recorded yet.</p>
        )}
      </div>
    </div>
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
  const hasSelection = Boolean(plan && artifact);

  const relatedArtifacts = useMemo(
    () => artifact?.metadata.relatedArtifacts ?? [],
    [artifact?.metadata.relatedArtifacts],
  );

  const lifecycle = normalizeLifecycleState(artifact?.status);
  const summaryTitle = artifact?.title ?? 'No artifact selected';
  const owner = artifact?.metadata.owner ?? plan?.artifacts[0]?.metadata.owner ?? '--';
  const reviewer = artifact?.metadata.reviewer ?? plan?.artifacts[0]?.metadata.reviewer ?? '--';

  const tags = artifact?.metadata.tags?.length
    ? artifact.metadata.tags
    : hasSelection
      ? []
      : ['tag', 'tag'];
  const tagsArePlaceholder = !hasSelection;

  const actionsToRender = hasSelection ? availableActions : PLACEHOLDER_WORKFLOW_ACTIONS;
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
              <div className="text-base font-semibold text-foreground">{summaryTitle}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <InfoBadge tone="status">{hasSelection ? lifecycle : 'status pending'}</InfoBadge>
                <InfoBadge tone="type">{artifact?.artifactType ?? 'artifact pending'}</InfoBadge>
                <InfoBadge>{artifact ? `v${artifact.version}` : 'version pending'}</InfoBadge>
              </div>
            </div>
          </Section>

          <Section title="Classification">
            <div className="grid gap-3">
              <Field label="Product L1" value={artifact?.metadata.productL1 ?? plan?.productArea ?? '--'} editable />
              <Field label="Product L2" value={artifact?.metadata.productL2 ?? plan?.functionalArea ?? '--'} editable />
              <Field label="Product L3" value={artifact?.metadata.productL3 ?? '--'} editable />
              <Field label="Plan ID" value={plan?.planId ?? '--'} />
              <Field label="Owner" value={owner} editable />
              <Field label="Reviewer" value={reviewer} editable />
              <TagsRow tags={tags} placeholder={tagsArePlaceholder} />
            </div>
          </Section>

          <Section title="Timeline">
            <div className="grid gap-3">
              <Field label="Created" value={formatDate(artifact?.metadata.createdAt)} />
              <Field label="Updated" value={formatDate(artifact?.metadata.updatedAt)} />
              <Field label="Supersedes" value={artifact?.metadata.supersedesArtifactId ?? '--'} />
              <Field
                label="Lineage"
                value={relatedArtifacts.length ? `${relatedArtifacts.length} related artifact(s)` : '--'}
              />
            </div>
          </Section>

          <Section title="Workflow Actions">
            <div className="space-y-2">
              {actionsToRender.map((action) => {
                const enabled = hasSelection && availableActions.some((candidate) => candidate.id === action.id);

                return (
                  <Button
                    key={action.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!enabled || !onAction}
                    onClick={() => {
                      if (enabled) onAction?.(action.id);
                    }}
                    className="w-full justify-start"
                  >
                    {action.label}
                  </Button>
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
                  <Button type="button" variant="outline" size="sm" className="justify-start" onClick={() => onResolvePendingAction?.('save')}>
                    Save
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="justify-start" onClick={() => onResolvePendingAction?.('discard')}>
                    Discard
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="justify-start" onClick={() => onResolvePendingAction?.('cancel')}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {!hasSelection
                  ? 'Select a plan artifact to enable lifecycle actions and note creation.'
                  : dirty
                    ? 'Unsaved edits will trigger the dirty-action gate before workflow side effects occur.'
                    : 'Workflow actions update the controlling plan artifact and may create note artifacts.'}
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
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground opacity-80"
              />
              <Input
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Note title"
                disabled={!canCreateNote}
              />
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Write a structured note that should become a real artifact file..."
                rows={5}
                disabled={!canCreateNote}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!canCreateNote || !noteTitle.trim() || !noteBody.trim()}
                onClick={() => {
                  onCreateNote?.({ title: noteTitle.trim(), body: noteBody.trim() });
                  setNoteTitle('');
                  setNoteBody('');
                }}
              >
                Create note artifact
              </Button>
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
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-3-merged\PlanStateNavigator.tsx`

`$ext
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
  loading?: boolean;
  error?: string;
  hasDirectory?: boolean;
  selectedPlanId: string | null;
  selectedArtifactId: string | null;
  onSelectPlan: (planId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
  onOpenPlansDirectory?: () => void;
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

export function PlanStateNavigator({
  activeState,
  onChangeState,
  planUnits,
  loading = false,
  error = '',
  hasDirectory = false,
  selectedPlanId,
  selectedArtifactId,
  onSelectPlan,
  onSelectArtifact,
  onOpenPlansDirectory,
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
          <div className="space-y-3 px-2 py-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="rounded-lg border border-border bg-background px-3 py-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}

            <div className="rounded-lg border border-dashed border-border bg-background px-4 py-5">
              <p className="text-sm font-medium text-foreground">
                {!hasDirectory ? 'Open the plans directory' : 'Loading plan units'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {!hasDirectory
                  ? 'Connect docs/plans to populate lifecycle-grouped plan rows here.'
                  : 'Preparing metadata-grouped tracker rows.'}
              </p>
              {!hasDirectory && onOpenPlansDirectory ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onOpenPlansDirectory}
                >
                  Open Plans Directory
                </Button>
              ) : null}
              {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div className="w-full max-w-xs rounded-lg border border-dashed border-border bg-background px-4 py-5">
              <p className="text-sm font-medium text-foreground">No plans in {activeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch lifecycle tabs or verify metadata normalization for this directory.
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
                                'flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors',
                                selectedArtifact
                                  ? 'bg-accent text-foreground'
                                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                              ].join(' ')}
                            >
                              <div className="min-w-0">
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
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-3-merged\PlanTracker.tsx`

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
## `E:\writing-system\docs\critical-issues\assignment-prompt\deliverables-3-merged\usePlanTracker-patch.tsx`

`$ext
// ============================================================
// Deliverable 5 â€” Patch for: web/src/pages/superuser/usePlanTracker.tsx
//
// Single change: pass `loading` prop to PlanDocumentPane so the center
// pane can distinguish "loading workspace" from "no artifact selected".
//
// The current renderContent already delegates all three panes correctly
// and showLegacyPaneFallback is already disabled. No other changes needed.
// ============================================================

// In renderContent, find the 'document' tab branch (~line 707-721).
// Replace:

if (tabId === 'document') {
  return (
    <PlanDocumentPane
      artifact={selectedArtifact}
      content={documentContent}
      diffMarkdown={originalContent}
      fileKey={fileKey}
      viewMode={viewMode}
      dirty={dirty}
      hasDirectory={hasDirectory}
      onChange={setDocumentContent}
      onSave={() => void saveCurrentDocument()}
      onOpenPlansDirectory={() => void openPlansDirectory()}
    />
  );
}

// With (adds loading prop):

if (tabId === 'document') {
  return (
    <PlanDocumentPane
      artifact={selectedArtifact}
      content={documentContent}
      diffMarkdown={originalContent}
      fileKey={fileKey}
      viewMode={viewMode}
      dirty={dirty}
      hasDirectory={hasDirectory}
      loading={loading}
      onChange={setDocumentContent}
      onSave={() => void saveCurrentDocument()}
      onOpenPlansDirectory={() => void openPlansDirectory()}
    />
  );
}

// No other changes to usePlanTracker.tsx are required.
// The hook already:
//   - Sets showLegacyPaneFallback = false (line 665)
//   - Renders PlanStateNavigator, PlanDocumentPane, PlanMetadataPane unconditionally
//   - Passes nullable selectedPlan/selectedArtifact so panes handle placeholder mode internally

`$nl
