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
