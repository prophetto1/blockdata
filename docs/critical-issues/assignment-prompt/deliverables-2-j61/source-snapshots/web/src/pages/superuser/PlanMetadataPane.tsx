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

function TagsRow({ tags }: { tags: string[] }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Tags
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" size="sm">
            {tag}
          </Badge>
        ))}
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
  const tags = artifact?.metadata.tags ?? ['tag pending', 'tag pending'];
  const metadataNotes = artifact?.metadata.notes ?? 'Notes metadata will appear here once a tracker artifact is selected.';
  const visibleActions = hasSelection
    ? availableActions
    : [
        { id: 'start-work', label: 'Start Work' },
        { id: 'submit-for-review', label: 'Submit for Review' },
        { id: 'approve', label: 'Approve' },
        { id: 'mark-implemented', label: 'Mark Implemented' },
      ];

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
              <TagsRow tags={tags} />
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
              {visibleActions.length > 0 ? (
                visibleActions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasSelection || !onAction || !availableActions.some((candidate) => candidate.id === action.id)}
                    onClick={() => onAction?.(action.id)}
                    className="w-full justify-start"
                  >
                    {action.label}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No workflow actions are available for this lifecycle state.
                </p>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => onResolvePendingAction?.('save')}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => onResolvePendingAction?.('discard')}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => onResolvePendingAction?.('cancel')}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {!hasSelection
                  ? 'Select a plan artifact to enable lifecycle actions. The workflow area stays visible so the route reads as an approval and implementation tool immediately.'
                  : dirty
                  ? 'Unsaved edits will trigger the dirty-action gate before workflow side effects occur.'
                  : 'Workflow actions update the controlling plan artifact and may create note artifacts.'}
              </p>
            )}
          </Section>

          <Section title="Notes / Action Composer">
            <div className="space-y-2">
              <Field label="Notes" value={metadataNotes} editable />
              <Input
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Note title"
                disabled={!hasSelection || !onCreateNote}
              />
              <textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Write a structured note that should become a real artifact file..."
                rows={5}
                disabled={!hasSelection || !onCreateNote}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={!hasSelection || !onCreateNote || !noteTitle.trim() || !noteBody.trim()}
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
              <p className="text-sm text-muted-foreground">No related artifacts recorded yet.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
