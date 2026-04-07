# Plan Tracker Frontend Refit Code Bundle

This bundle contains the files changed in the surgical frontend refit that moved Plan Tracker toward the approved three-column metadata-driven surface.

## Included Files

- `E:\writing-system\web\src\pages\superuser\PlanStateNavigator.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanMetadataPane.tsx`
- `E:\writing-system\web\src\pages\superuser\planTrackerModel.ts`
- `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanTracker.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanStateNavigator.test.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanTracker.test.tsx`

## PlanStateNavigator.tsx

Source: `E:\writing-system\web\src\pages\superuser\PlanStateNavigator.tsx`

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
  selectedPlanId,
  selectedArtifactId,
  onSelectPlan,
  onSelectArtifact,
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
            const count = counts.get(tab.id) ?? 0;

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
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {filteredPlans.length === 0 ? (
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
```

## PlanMetadataPane.tsx

Source: `E:\writing-system\web\src\pages\superuser\PlanMetadataPane.tsx`

`$ext
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
```

## planTrackerModel.ts

Source: `E:\writing-system\web\src\pages\superuser\planTrackerModel.ts`

`$ext
import yaml from 'js-yaml';

export type PlanArtifactType =
  | 'plan'
  | 'evaluation'
  | 'approval'
  | 'implementation-note'
  | 'verification-note'
  | 'implementation-evaluation'
  | 'status-report'
  | 'handoff'
  | 'unknown';

export type LifecycleState =
  | 'to-do'
  | 'in-progress'
  | 'under-review'
  | 'approved'
  | 'implemented'
  | 'verified'
  | 'closed';

export type PlanStatus = string;

export type PlanTrackerMetadata = {
  title: string;
  description?: string;
  planId: string;
  artifactType: PlanArtifactType;
  status: PlanStatus;
  version: number;
  createdAt?: string;
  productArea?: string;
  functionalArea?: string;
  productL1?: string;
  productL2?: string;
  productL3?: string;
  updatedAt?: string;
  priority?: string;
  owner?: string;
  reviewer?: string;
  trackerId?: string;
  tags?: string[];
  supersedesArtifactId?: string;
  relatedArtifacts?: string[];
  notes?: string;
};

export type PlanArtifactSummary = {
  artifactId: string;
  planId: string;
  title: string;
  artifactType: PlanArtifactType;
  status: PlanStatus;
  version: number;
  sequence?: number;
  path: string;
  content: string;
  body: string;
  metadata: PlanTrackerMetadata;
};

export type PlanUnit = {
  planId: string;
  title: string;
  status: PlanStatus;
  productArea?: string;
  functionalArea?: string;
  artifacts: PlanArtifactSummary[];
};

export type TrackerDocumentInput = {
  path: string;
  content: string;
};

export type WorkflowActionId =
  | 'reject-with-notes'
  | 'approve-with-notes'
  | 'create-revision'
  | 'attach-implementation-note'
  | 'attach-verification';

export function normalizeLifecycleState(status: string | undefined | null): LifecycleState {
  switch (status?.trim()) {
    case 'to-do':
    case 'draft':
      return 'to-do';
    case 'in-progress':
    case 'rejected':
      return 'in-progress';
    case 'review':
    case 'pending-approval':
    case 'under-review':
      return 'under-review';
    case 'approved':
      return 'approved';
    case 'implemented':
      return 'implemented';
    case 'verified':
      return 'verified';
    case 'closed':
    case 'superseded':
      return 'closed';
    default:
      return 'to-do';
  }
}

type ArtifactFilenameInput = {
  planStem: string;
  artifactType: Exclude<PlanArtifactType, 'unknown' | 'implementation-evaluation' | 'status-report' | 'handoff'>;
  version: number;
  sequence?: number;
};

const LEADING_FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
const VERSION_SUFFIX_RE = /(?:^|-)v(\d+)(?:-\d+)?$/i;
const DETERMINISTIC_SEQUENCE_RE = /\.(?:evaluation|approval|implementation|verification)\.(\d+)$/i;

const ARTIFACT_PATTERNS: Array<{ type: PlanArtifactType; pattern: RegExp }> = [
  { type: 'implementation-evaluation', pattern: /(?:^|-)implementation-evaluation$/i },
  { type: 'evaluation', pattern: /(?:^|-)(?:plan-)?reevaluation$/i },
  { type: 'evaluation', pattern: /(?:^|-)(?:plan-)?evaluation$/i },
  { type: 'status-report', pattern: /(?:^|-)status-report$/i },
  { type: 'handoff', pattern: /(?:^|-)(?:supplementary-)?handoff$/i },
  { type: 'approval', pattern: /(?:^|-)approval$/i },
  { type: 'implementation-note', pattern: /(?:^|-)(?:implementation-note|implementation)$/i },
  { type: 'verification-note', pattern: /(?:^|-)verification(?:-note)?$/i },
];

const ARTIFACT_SORT_WEIGHT: Record<PlanArtifactType, number> = {
  plan: 0,
  evaluation: 1,
  approval: 2,
  'implementation-note': 3,
  'implementation-evaluation': 4,
  'verification-note': 5,
  'status-report': 6,
  handoff: 7,
  unknown: 8,
};

function toPosixPath(path: string) {
  return path.replaceAll('\\', '/');
}

function fileStem(path: string) {
  const normalized = toPosixPath(path);
  const name = normalized.split('/').pop() ?? normalized;
  return name.replace(/\.(md|mdx)$/i, '');
}

function stripArtifactSuffix(stem: string) {
  let value = stem.replace(DATE_PREFIX_RE, '');

  for (const { pattern } of ARTIFACT_PATTERNS) {
    if (pattern.test(value)) {
      value = value.replace(pattern, '');
      break;
    }
  }

  return value.replace(VERSION_SUFFIX_RE, '').replace(/-+$/, '');
}

function inferVersionFromStem(stem: string) {
  const match = stem.match(VERSION_SUFFIX_RE);
  return match ? Number(match[1]) : 1;
}

function inferSequenceFromStem(stem: string) {
  const match = stem.match(DETERMINISTIC_SEQUENCE_RE);
  return match ? Number(match[1]) : undefined;
}

function inferArtifactType(stem: string): PlanArtifactType {
  const normalized = stem.replace(DATE_PREFIX_RE, '');
  for (const entry of ARTIFACT_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return entry.type;
    }
  }
  return 'plan';
}

function titleFromStem(stem: string) {
  return stripArtifactSuffix(stem)
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function readFirstHeading(body: string) {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function normalizeArtifactType(value: unknown, fallback: PlanArtifactType): PlanArtifactType {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim() as PlanArtifactType;
  if (normalized in ARTIFACT_SORT_WEIGHT) return normalized;
  return fallback;
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

export function parsePlanTrackerDocument(input: TrackerDocumentInput): PlanArtifactSummary {
  const stem = fileStem(input.path);
  const fallbackArtifactType = inferArtifactType(stem);
  const fallbackPlanId = stripArtifactSuffix(stem);
  const match = input.content.match(LEADING_FRONTMATTER_RE);
  const frontmatter = match ? ((yaml.load(match[1]) as Record<string, unknown> | undefined) ?? {}) : {};
  const body = match ? input.content.slice(match[0].length) : input.content;
  const title =
    typeof frontmatter.title === 'string' && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : readFirstHeading(body) ?? titleFromStem(stem);
  const artifactType = normalizeArtifactType(frontmatter.artifactType, fallbackArtifactType);
  const version =
    typeof frontmatter.version === 'number'
      ? frontmatter.version
      : Number(frontmatter.version ?? inferVersionFromStem(stem));
  const planId =
    typeof frontmatter.planId === 'string' && frontmatter.planId.trim() ? frontmatter.planId.trim() : fallbackPlanId;
  const status =
    typeof frontmatter.status === 'string' && frontmatter.status.trim()
      ? frontmatter.status.trim()
      : artifactType === 'plan'
        ? 'draft'
        : 'under-review';
  const sequence =
    typeof frontmatter.sequence === 'number'
      ? frontmatter.sequence
      : inferSequenceFromStem(stem);

  const metadata: PlanTrackerMetadata = {
    title,
    description: typeof frontmatter.description === 'string' ? frontmatter.description : undefined,
    planId,
    artifactType,
    status,
    version: Number.isFinite(version) && version > 0 ? version : 1,
    createdAt: typeof frontmatter.createdAt === 'string' ? frontmatter.createdAt : undefined,
    productArea: typeof frontmatter.productArea === 'string' ? frontmatter.productArea : undefined,
    functionalArea: typeof frontmatter.functionalArea === 'string' ? frontmatter.functionalArea : undefined,
    productL1: typeof frontmatter.productL1 === 'string' ? frontmatter.productL1 : undefined,
    productL2: typeof frontmatter.productL2 === 'string' ? frontmatter.productL2 : undefined,
    productL3: typeof frontmatter.productL3 === 'string' ? frontmatter.productL3 : undefined,
    updatedAt: typeof frontmatter.updatedAt === 'string' ? frontmatter.updatedAt : undefined,
    priority: typeof frontmatter.priority === 'string' ? frontmatter.priority : undefined,
    owner: typeof frontmatter.owner === 'string' ? frontmatter.owner : undefined,
    reviewer: typeof frontmatter.reviewer === 'string' ? frontmatter.reviewer : undefined,
    trackerId: typeof frontmatter.trackerId === 'string' ? frontmatter.trackerId : undefined,
    tags: normalizeTags(frontmatter.tags),
    supersedesArtifactId:
      typeof frontmatter.supersedesArtifactId === 'string' ? frontmatter.supersedesArtifactId : undefined,
    relatedArtifacts: Array.isArray(frontmatter.relatedArtifacts)
      ? frontmatter.relatedArtifacts.map((item) => String(item))
      : undefined,
    notes: typeof frontmatter.notes === 'string' ? frontmatter.notes : undefined,
  };

  return {
    artifactId: `${planId}:${toPosixPath(input.path)}`,
    planId,
    title,
    artifactType,
    status,
    version: metadata.version,
    sequence,
    path: toPosixPath(input.path),
    content: input.content,
    body,
    metadata,
  };
}

export function serializePlanTrackerDocument(metadata: PlanTrackerMetadata, body: string) {
  const frontmatter = yaml
    .dump(
      {
        title: metadata.title,
        description: metadata.description,
        planId: metadata.planId,
        artifactType: metadata.artifactType,
        status: metadata.status,
        version: metadata.version,
        createdAt: metadata.createdAt,
        productArea: metadata.productArea,
        functionalArea: metadata.functionalArea,
        productL1: metadata.productL1,
        productL2: metadata.productL2,
        productL3: metadata.productL3,
        updatedAt: metadata.updatedAt,
        priority: metadata.priority,
        owner: metadata.owner,
        reviewer: metadata.reviewer,
        trackerId: metadata.trackerId,
        tags: metadata.tags,
        supersedesArtifactId: metadata.supersedesArtifactId,
        relatedArtifacts: metadata.relatedArtifacts,
        notes: metadata.notes,
      },
      { noRefs: true, sortKeys: false, lineWidth: -1 },
    )
    .trimEnd();

  return `---\n${frontmatter}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`;
}

export function groupPlanDocuments(inputs: TrackerDocumentInput[]): PlanUnit[] {
  const groups = new Map<string, PlanArtifactSummary[]>();

  for (const input of inputs) {
    const parsed = parsePlanTrackerDocument(input);
    const existing = groups.get(parsed.planId) ?? [];
    existing.push(parsed);
    groups.set(parsed.planId, existing);
  }

  return [...groups.entries()]
    .map(([planId, artifacts]) => {
      const sortedArtifacts = artifacts.sort((left, right) => {
        const weightDelta = ARTIFACT_SORT_WEIGHT[left.artifactType] - ARTIFACT_SORT_WEIGHT[right.artifactType];
        if (weightDelta !== 0) return weightDelta;
        if (left.version !== right.version) return left.version - right.version;
        if ((left.sequence ?? 0) !== (right.sequence ?? 0)) return (left.sequence ?? 0) - (right.sequence ?? 0);
        return left.title.localeCompare(right.title);
      });

      const planArtifacts = sortedArtifacts.filter((artifact) => artifact.artifactType === 'plan');
      const canonicalPlan = planArtifacts.at(-1) ?? sortedArtifacts[0];

      return {
        planId,
        title: canonicalPlan.title,
        status: canonicalPlan.status,
        productArea: canonicalPlan.metadata.productArea,
        functionalArea: canonicalPlan.metadata.functionalArea,
        artifacts: sortedArtifacts,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function nextVersionNumber(currentVersion: number) {
  return currentVersion + 1;
}

export function derivePlanStem(path: string) {
  return stripArtifactSuffix(fileStem(path));
}

export function isTrackerMetadataComplete(artifact: PlanArtifactSummary) {
  return Boolean(
    artifact.content.match(LEADING_FRONTMATTER_RE) &&
      artifact.metadata.title.trim() &&
      artifact.metadata.description?.trim() &&
      artifact.metadata.planId.trim() &&
      artifact.metadata.artifactType &&
      artifact.metadata.status.trim() &&
      Number.isFinite(artifact.metadata.version) &&
      artifact.metadata.version > 0 &&
      (artifact.metadata.productL1?.trim() || artifact.metadata.productArea?.trim()) &&
      (artifact.metadata.productL2?.trim() || artifact.metadata.functionalArea?.trim()) &&
      artifact.metadata.updatedAt?.trim(),
  );
}

export function latestPlanArtifact(artifacts: PlanArtifactSummary[]) {
  const planArtifacts = artifacts.filter((artifact) => artifact.artifactType === 'plan');
  return planArtifacts.at(-1) ?? null;
}

export function nextArtifactSequence(artifacts: PlanArtifactSummary[], artifactType: PlanArtifactType, version: number) {
  const matchingArtifacts = artifacts.filter(
    (artifact) => artifact.artifactType === artifactType && artifact.version === version,
  );

  if (matchingArtifacts.length === 0) {
    return 1;
  }

  const currentMax = matchingArtifacts.reduce((max, artifact) => Math.max(max, artifact.sequence ?? 1), 1);
  return currentMax + 1;
}

export function workflowArtifactType(actionId: WorkflowActionId): Exclude<PlanArtifactType, 'unknown' | 'implementation-evaluation' | 'status-report' | 'handoff'> {
  switch (actionId) {
    case 'reject-with-notes':
      return 'evaluation';
    case 'approve-with-notes':
      return 'approval';
    case 'create-revision':
      return 'plan';
    case 'attach-implementation-note':
      return 'implementation-note';
    case 'attach-verification':
      return 'verification-note';
  }
}

export function workflowPlanStatus(actionId: WorkflowActionId): PlanStatus {
  switch (actionId) {
    case 'reject-with-notes':
      return 'rejected';
    case 'approve-with-notes':
      return 'approved';
    case 'create-revision':
      return 'draft';
    case 'attach-implementation-note':
      return 'in-progress';
    case 'attach-verification':
      return 'verified';
  }
}

export function workflowArtifactStatus(actionId: WorkflowActionId): PlanStatus {
  switch (actionId) {
    case 'create-revision':
      return 'draft';
    case 'reject-with-notes':
      return 'rejected';
    case 'approve-with-notes':
      return 'approved';
    case 'attach-implementation-note':
      return 'in-progress';
    case 'attach-verification':
      return 'verified';
  }
}

export function workflowArtifactTitle(
  actionId: WorkflowActionId,
  planTitle: string,
  version: number,
  sequence?: number,
) {
  switch (actionId) {
    case 'create-revision':
      return planTitle;
    case 'reject-with-notes':
      return `Evaluation v${version}.${sequence ?? 1}`;
    case 'approve-with-notes':
      return `Approval v${version}.${sequence ?? 1}`;
    case 'attach-implementation-note':
      return `Implementation Note v${version}.${sequence ?? 1}`;
    case 'attach-verification':
      return `Verification Note v${version}.${sequence ?? 1}`;
  }
}

export function buildArtifactFilename({ planStem, artifactType, version, sequence }: ArtifactFilenameInput) {
  if (artifactType === 'plan') {
    return `${planStem}.v${version}.md`;
  }

  const segmentByType: Record<Exclude<ArtifactFilenameInput['artifactType'], 'plan'>, string> = {
    evaluation: 'evaluation',
    approval: 'approval',
    'implementation-note': 'implementation',
    'verification-note': 'verification',
  };

  const sequenceNumber = sequence ?? 1;
  return `${planStem}.v${version}.${segmentByType[artifactType]}.${sequenceNumber}.md`;
}
```

## usePlanTracker.tsx

Source: `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`

`$ext
/* eslint-disable react-refresh/only-export-components */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChecklist, IconListDetails, IconNotes } from '@tabler/icons-react';

import {
  createFile,
  type FsNode,
  pickDirectory,
  readDirectory,
  readFileContent,
  restoreDirectoryHandle,
  saveDirectoryHandle,
  writeFileContent,
} from '@/lib/fs-access';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import { PlanDocumentPreview } from './PlanDocumentPreview';
import { PlanMetadataPane } from './PlanMetadataPane';
import {
  buildArtifactFilename,
  derivePlanStem,
  groupPlanDocuments,
  isTrackerMetadataComplete,
  latestPlanArtifact,
  normalizeLifecycleState,
  nextArtifactSequence,
  nextVersionNumber,
  serializePlanTrackerDocument,
  workflowArtifactStatus,
  workflowArtifactTitle,
  workflowArtifactType,
  workflowPlanStatus,
  type LifecycleState,
  type PlanArtifactSummary,
  type PlanTrackerMetadata,
  type PlanUnit,
  type WorkflowActionId,
} from './planTrackerModel';
import { PlanStateNavigator } from './PlanStateNavigator';

export const PLAN_TRACKER_TABS = [
  { id: 'plan-state', label: 'Plans', icon: IconChecklist },
  { id: 'document', label: 'Document', icon: IconNotes },
  { id: 'metadata', label: 'Metadata', icon: IconListDetails },
];

export const PLAN_TRACKER_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['plan-state'], activeTab: 'plan-state', width: 26 },
  { id: 'pane-2', tabs: ['document'], activeTab: 'document', width: 52 },
  { id: 'pane-3', tabs: ['metadata'], activeTab: 'metadata', width: 22 },
]);

function flattenMarkdownNodes(nodes: FsNode[]): FsNode[] {
  const results: FsNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'file' && (node.extension === '.md' || node.extension === '.mdx')) {
      results.push(node);
      continue;
    }
    if (node.kind === 'directory' && node.children) {
      results.push(...flattenMarkdownNodes(node.children));
    }
  }

  return results;
}

function findDefaultArtifact(plan: PlanUnit | null) {
  return plan?.artifacts[0] ?? null;
}

type PendingWorkflowAction = {
  actionId: WorkflowActionId;
};

type PendingActionChoice = 'save' | 'discard' | 'cancel';

type PendingActionResolution = {
  actionId: string | null;
  shouldProceed: boolean;
  resolution: PendingActionChoice;
};

type UsePlanTrackerResult = {
  planUnits: PlanUnit[];
  selectedPlan: PlanUnit | null;
  selectedArtifact: PlanArtifactSummary | null;
  activeState: LifecycleState;
  documentContent: string;
  dirty: boolean;
  pendingAction: PendingWorkflowAction | null;
  loading: boolean;
  error: string;
  openPlansDirectory: () => Promise<void>;
  selectPlan: (planId: string) => void;
  selectArtifact: (artifactId: string) => void;
  setDocumentContent: (value: string) => void;
  requestWorkflowAction: (actionId: WorkflowActionId) => boolean;
  runWorkflowAction: (actionId: WorkflowActionId) => Promise<boolean>;
  resolvePendingAction: (choice: PendingActionChoice) => Promise<PendingActionResolution>;
  saveCurrentDocument: () => Promise<void>;
  renderContent: (tabId: string) => React.ReactNode;
};

function siblingPath(path: string, fileName: string) {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1 ? fileName : `${path.slice(0, lastSlash)}/${fileName}`;
}

function buildWorkflowArtifactBody(actionId: WorkflowActionId, title: string, planTitle: string) {
  switch (actionId) {
    case 'reject-with-notes':
      return `# ${title}\n\n## Summary\n\nAdd rejection notes for ${planTitle}.\n`;
    case 'approve-with-notes':
      return `# ${title}\n\n## Summary\n\nAdd approval notes for ${planTitle}.\n`;
    case 'attach-implementation-note':
      return `# ${title}\n\n## Summary\n\nDocument implementation progress for ${planTitle}.\n`;
    case 'attach-verification':
      return `# ${title}\n\n## Summary\n\nDocument verification notes for ${planTitle}.\n`;
    case 'create-revision':
      return `# ${planTitle}\n\nAdd the next revision details.\n`;
  }
}

export function usePlanTracker(storeKey = 'plan-tracker-dir'): UsePlanTrackerResult {
  const [planUnits, setPlanUnits] = useState<PlanUnit[]>([]);
  const [activeState, setActiveState] = useState<LifecycleState>('to-do');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [documentContent, setDocumentContentState] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileKey, setFileKey] = useState('plan-tracker-empty');
  const [pendingAction, setPendingAction] = useState<PendingWorkflowAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode] = useState<MdxViewMode>('rich-text');

  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const artifactNodeMapRef = useRef<Map<string, FsNode>>(new Map());

  const selectedPlan = useMemo(
    () => planUnits.find((plan) => plan.planId === selectedPlanId) ?? null,
    [planUnits, selectedPlanId],
  );

  const selectedArtifact = useMemo(
    () => selectedPlan?.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ?? null,
    [selectedArtifactId, selectedPlan],
  );

  const dirty = documentContent !== originalContent;

  const syncSelection = useCallback(
    (nextPlans: PlanUnit[], preferredPlanId?: string | null, preferredArtifactId?: string | null) => {
      const nextPlan =
        nextPlans.find((plan) => plan.planId === preferredPlanId) ??
        nextPlans.find((plan) => plan.planId === selectedPlanId) ??
        nextPlans[0] ??
        null;
      const nextArtifact =
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === preferredArtifactId) ??
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ??
        findDefaultArtifact(nextPlan);

      setSelectedPlanId(nextPlan?.planId ?? null);
      setSelectedArtifactId(nextArtifact?.artifactId ?? null);
      setActiveState(nextPlan ? normalizeLifecycleState(nextPlan.status) : 'to-do');
      setDocumentContentState(nextArtifact?.content ?? '');
      setOriginalContent(nextArtifact?.content ?? '');
      setFileKey(nextArtifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [selectedArtifactId, selectedPlanId],
  );

  const loadFromHandle = useCallback(
    async (handle: FileSystemDirectoryHandle, preferredPlanId?: string | null, preferredArtifactId?: string | null) => {
      setLoading(true);
      setError('');
      directoryHandleRef.current = handle;

      try {
        const tree = await readDirectory(handle);
        const markdownNodes = flattenMarkdownNodes(tree);
        const artifactNodes = new Map<string, FsNode>();
        const documents = await Promise.all(
          markdownNodes.map(async (node) => {
            const content = await readFileContent(node.handle as FileSystemFileHandle);
            return { path: node.path, content, node };
          }),
        );

        const grouped = groupPlanDocuments(documents.map(({ path, content }) => ({ path, content })));

        for (const document of documents) {
          const pathArtifactId = `${document.path.replace(/\\/g, '/')}`;
          artifactNodes.set(pathArtifactId, document.node);
        }

        const nodeMap = new Map<string, FsNode>();
        for (const plan of grouped) {
          for (const artifact of plan.artifacts) {
            const node = documents.find((entry) => entry.path.replace(/\\/g, '/') === artifact.path)?.node;
            if (node) {
              nodeMap.set(artifact.artifactId, node);
            }
          }
        }

        artifactNodeMapRef.current = nodeMap;
        setPlanUnits(grouped);
        syncSelection(grouped, preferredPlanId, preferredArtifactId);
      } catch (err) {
        setPlanUnits([]);
        setError(err instanceof Error ? err.message : 'Failed to load plans directory');
      } finally {
        setLoading(false);
      }
    },
    [syncSelection],
  );

  useEffect(() => {
    restoreDirectoryHandle(storeKey).then(async (handle) => {
      if (!handle) {
        setLoading(false);
        return;
      }

      try {
        const permissionHandle = handle as FileSystemDirectoryHandle & {
          queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
        };
        const permission = await permissionHandle.queryPermission?.({ mode: 'readwrite' });
        if (permission === 'granted') {
          await loadFromHandle(handle);
          return;
        }
      } catch {
        // fall through to unloaded state
      }

      setLoading(false);
    });
  }, [loadFromHandle, storeKey]);

  const openPlansDirectory = useCallback(async () => {
    const handle = await pickDirectory();
    await saveDirectoryHandle(handle, storeKey);
    await loadFromHandle(handle);
  }, [loadFromHandle, storeKey]);

  const selectPlan = useCallback(
    (planId: string) => {
      const plan = planUnits.find((entry) => entry.planId === planId) ?? null;
      const artifact = findDefaultArtifact(plan);
      setSelectedPlanId(plan?.planId ?? null);
      setSelectedArtifactId(artifact?.artifactId ?? null);
      setActiveState(plan ? normalizeLifecycleState(plan.status) : activeState);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [activeState, planUnits],
  );

  const selectArtifact = useCallback(
    (artifactId: string) => {
      const artifact = selectedPlan?.artifacts.find((entry) => entry.artifactId === artifactId) ?? null;
      setSelectedArtifactId(artifact?.artifactId ?? null);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [selectedPlan],
  );

  const setDocumentContent = useCallback((value: string) => {
    setDocumentContentState(value);
  }, []);

  const buildNormalizedMetadata = useCallback((
    artifact: PlanArtifactSummary,
    overrides: Partial<PlanTrackerMetadata> = {},
    planContext?: PlanUnit | null,
  ): PlanTrackerMetadata => {
    const scope = planContext ?? selectedPlan;
    const title = overrides.title ?? artifact.metadata.title ?? artifact.title;
    return {
      ...artifact.metadata,
      title,
      description:
        overrides.description ??
        artifact.metadata.description ??
        `${title} artifact for ${artifact.planId}.`,
      planId: overrides.planId ?? artifact.planId,
      artifactType: overrides.artifactType ?? artifact.artifactType,
      status: overrides.status ?? artifact.status,
      version: overrides.version ?? artifact.version,
      productArea: overrides.productArea ?? artifact.metadata.productArea ?? scope?.productArea,
      functionalArea: overrides.functionalArea ?? artifact.metadata.functionalArea ?? scope?.functionalArea,
      updatedAt: overrides.updatedAt ?? new Date().toISOString(),
      priority: overrides.priority ?? artifact.metadata.priority,
      owner: overrides.owner ?? artifact.metadata.owner,
      trackerId: overrides.trackerId ?? artifact.metadata.trackerId,
      tags: overrides.tags ?? artifact.metadata.tags,
      relatedArtifacts: overrides.relatedArtifacts ?? artifact.metadata.relatedArtifacts,
      notes: overrides.notes ?? artifact.metadata.notes,
    };
  }, [selectedPlan]);

  const writeExistingArtifact = useCallback(async (
    artifact: PlanArtifactSummary,
    metadata: PlanTrackerMetadata,
    body?: string,
  ) => {
    const node = artifactNodeMapRef.current.get(artifact.artifactId);
    if (!node || node.kind !== 'file') {
      throw new Error('Tracker artifact is not writable.');
    }

    const content = serializePlanTrackerDocument(metadata, body ?? artifact.body);
    await writeFileContent(node.handle as FileSystemFileHandle, content);
    return { node, content };
  }, []);

  const executeWorkflowAction = useCallback(async (actionId: WorkflowActionId) => {
    if (!selectedPlan || !selectedArtifact) {
      return false;
    }

    const timestamp = new Date().toISOString();
    const selectedArtifactMetadata = buildNormalizedMetadata(
      selectedArtifact,
      isTrackerMetadataComplete(selectedArtifact) ? { updatedAt: timestamp } : { updatedAt: timestamp },
      selectedPlan,
    );

    if (!isTrackerMetadataComplete(selectedArtifact)) {
      await writeExistingArtifact(selectedArtifact, selectedArtifactMetadata, documentContent);
    }

    const currentPlanArtifact =
      selectedPlan.artifacts
        .filter((artifact) => artifact.artifactType === 'plan' && artifact.version === selectedArtifact.version)
        .at(-1) ??
      latestPlanArtifact(selectedPlan.artifacts) ??
      null;

    if (actionId === 'create-revision') {
      if (!currentPlanArtifact) {
        throw new Error('No plan artifact is available to revise.');
      }

      const supersededMetadata = buildNormalizedMetadata(
        currentPlanArtifact,
        { status: 'superseded', updatedAt: timestamp },
        selectedPlan,
      );
      const currentPlanBody =
        currentPlanArtifact.artifactId === selectedArtifact.artifactId ? documentContent : currentPlanArtifact.body;
      const { node: currentPlanNode } = await writeExistingArtifact(currentPlanArtifact, supersededMetadata, currentPlanBody);
      if (!currentPlanNode.parentHandle) {
        throw new Error('Plan artifact parent directory is not writable.');
      }

      const nextVersion = nextVersionNumber(currentPlanArtifact.version);
      const fileName = buildArtifactFilename({
        planStem: derivePlanStem(currentPlanArtifact.path),
        artifactType: 'plan',
        version: nextVersion,
      });
      const newHandle = await createFile(currentPlanNode.parentHandle, fileName);
      const newMetadata = buildNormalizedMetadata(
        currentPlanArtifact,
        {
          artifactType: 'plan',
          status: workflowPlanStatus(actionId),
          version: nextVersion,
          updatedAt: timestamp,
          relatedArtifacts: [currentPlanArtifact.path],
        },
        selectedPlan,
      );
      const nextBody = currentPlanBody.trim().length > 0
        ? currentPlanBody
        : buildWorkflowArtifactBody(actionId, currentPlanArtifact.title, selectedPlan.title);
      await writeFileContent(newHandle, serializePlanTrackerDocument(newMetadata, nextBody));

      if (directoryHandleRef.current) {
        await loadFromHandle(
          directoryHandleRef.current,
          selectedPlan.planId,
          `${selectedPlan.planId}:${siblingPath(currentPlanArtifact.path, fileName)}`,
        );
      }
      return true;
    }

    const targetPlanArtifact = currentPlanArtifact ?? selectedArtifact;
    const planStatus = workflowPlanStatus(actionId);
    const artifactType = workflowArtifactType(actionId);
    const artifactVersion = targetPlanArtifact.version;
    const sequence = nextArtifactSequence(selectedPlan.artifacts, artifactType, artifactVersion);
    const artifactTitle = workflowArtifactTitle(actionId, selectedPlan.title, artifactVersion, sequence);
    const artifactBody = buildWorkflowArtifactBody(actionId, artifactTitle, selectedPlan.title);
    const artifactStatus = workflowArtifactStatus(actionId);

    const updatedPlanMetadata = buildNormalizedMetadata(
      targetPlanArtifact,
      { status: planStatus, updatedAt: timestamp },
      selectedPlan,
    );
    const targetPlanBody =
      targetPlanArtifact.artifactId === selectedArtifact.artifactId ? documentContent : targetPlanArtifact.body;
    await writeExistingArtifact(targetPlanArtifact, updatedPlanMetadata, targetPlanBody);

    const selectedArtifactNode = artifactNodeMapRef.current.get(selectedArtifact.artifactId);
    if (!selectedArtifactNode || selectedArtifactNode.kind !== 'file' || !selectedArtifactNode.parentHandle) {
      throw new Error('Selected artifact parent directory is not writable.');
    }

    const fileName = buildArtifactFilename({
      planStem: derivePlanStem(selectedArtifact.path),
      artifactType,
      version: artifactVersion,
      sequence,
    });
    const newHandle = await createFile(selectedArtifactNode.parentHandle, fileName);
    const artifactMetadata: PlanTrackerMetadata = {
      title: artifactTitle,
      description: `${artifactTitle} for ${selectedPlan.title}.`,
      planId: selectedPlan.planId,
      artifactType,
      status: artifactStatus,
      version: artifactVersion,
      productArea: selectedPlan.productArea ?? selectedArtifact.metadata.productArea,
      functionalArea: selectedPlan.functionalArea ?? selectedArtifact.metadata.functionalArea,
      updatedAt: timestamp,
      priority: selectedArtifact.metadata.priority,
      owner: selectedArtifact.metadata.owner,
      trackerId: selectedArtifact.metadata.trackerId,
      tags: selectedArtifact.metadata.tags,
      relatedArtifacts: [selectedArtifact.path],
      notes: selectedArtifact.metadata.notes,
    };
    await writeFileContent(newHandle, serializePlanTrackerDocument(artifactMetadata, artifactBody));

    if (directoryHandleRef.current) {
      await loadFromHandle(
        directoryHandleRef.current,
        selectedPlan.planId,
        `${selectedPlan.planId}:${siblingPath(selectedArtifact.path, fileName)}`,
      );
    }

    return true;
  }, [buildNormalizedMetadata, documentContent, loadFromHandle, selectedArtifact, selectedPlan, writeExistingArtifact]);

  const requestWorkflowAction = useCallback((actionId: WorkflowActionId) => {
    if (!dirty) {
      return true;
    }

    setPendingAction({ actionId });
    return false;
  }, [dirty]);

  const runWorkflowAction = useCallback(async (actionId: WorkflowActionId) => {
    if (!requestWorkflowAction(actionId)) {
      return false;
    }

    await executeWorkflowAction(actionId);
    return true;
  }, [executeWorkflowAction, requestWorkflowAction]);

  const saveCurrentDocument = useCallback(async () => {
    if (!selectedArtifact || !dirty) return;

    const node = artifactNodeMapRef.current.get(selectedArtifact.artifactId);
    if (!node || node.kind !== 'file') {
      throw new Error('Selected artifact is not writable.');
    }

    await writeFileContent(node.handle as FileSystemFileHandle, documentContent);
    setOriginalContent(documentContent);

    if (directoryHandleRef.current) {
      await loadFromHandle(directoryHandleRef.current, selectedPlan?.planId ?? null, selectedArtifact.artifactId);
    }
  }, [dirty, documentContent, loadFromHandle, selectedArtifact, selectedPlan?.planId]);

  const resolvePendingAction = useCallback(async (choice: PendingActionChoice): Promise<PendingActionResolution> => {
    const actionId = pendingAction?.actionId ?? null;
    if (!actionId) {
      return {
        actionId: null,
        shouldProceed: false,
        resolution: choice,
      };
    }

    if (choice === 'cancel') {
      setPendingAction(null);
      return {
        actionId,
        shouldProceed: false,
        resolution: 'cancel',
      };
    }

    if (choice === 'discard') {
      setDocumentContentState(originalContent);
      setPendingAction(null);
      await executeWorkflowAction(actionId);
      return {
        actionId,
        shouldProceed: true,
        resolution: 'discard',
      };
    }

    await saveCurrentDocument();
    setPendingAction(null);
    await executeWorkflowAction(actionId);
    setPendingAction(null);
    return {
      actionId,
      shouldProceed: true,
      resolution: 'save',
    };
  }, [executeWorkflowAction, originalContent, pendingAction, saveCurrentDocument]);

  const renderContent = useCallback(
    (tabId: string) => {
      if (tabId === 'plan-state') {
        if (!planUnits.length) {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading plans directoryâ€¦' : 'Open the docs/plans directory to start the tracker.'}
              </p>
              {!loading && (
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium"
                  onClick={() => void openPlansDirectory()}
                >
                  Open Plans Directory
                </button>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        }

        return (
          <PlanStateNavigator
            activeState={activeState}
            onChangeState={setActiveState}
            planUnits={planUnits}
            selectedPlanId={selectedPlan?.planId ?? null}
            selectedArtifactId={selectedArtifact?.artifactId ?? ''}
            onSelectPlan={selectPlan}
            onSelectArtifact={selectArtifact}
          />
        );
      }

      if (tabId === 'document') {
        if (!selectedArtifact) {
          return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No artifact selected.</div>;
        }

        return (
          <MdxEditorSurface
            content={documentContent}
            diffMarkdown={originalContent}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={setDocumentContent}
            onSave={() => void saveCurrentDocument()}
          />
        );
      }

      if (tabId === 'metadata') {
        if (!selectedPlan || !selectedArtifact) {
          return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No metadata available.</div>;
        }

        return (
          <PlanMetadataPane
            plan={selectedPlan}
            artifact={selectedArtifact}
            dirty={dirty}
            pendingAction={pendingAction}
            onAction={(actionId) => void runWorkflowAction(actionId)}
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
      documentContent,
      dirty,
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
      selectedArtifact,
      selectedPlan,
      setDocumentContent,
      viewMode,
    ],
  );

  return {
    planUnits,
    selectedPlan,
    selectedArtifact,
    activeState,
    documentContent,
    dirty,
    pendingAction,
    loading,
    error,
    openPlansDirectory,
    selectPlan,
    selectArtifact,
    setDocumentContent,
    requestWorkflowAction,
    runWorkflowAction,
    resolvePendingAction,
    saveCurrentDocument,
    renderContent,
  };
}
```

## PlanTracker.tsx

Source: `E:\writing-system\web\src\pages\superuser\PlanTracker.tsx`

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
```

## PlanStateNavigator.test.tsx

Source: `E:\writing-system\web\src\pages\superuser\PlanStateNavigator.test.tsx`

`$ext
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlanStateNavigator } from './PlanStateNavigator';
import type { PlanUnit } from './planTrackerModel';

function createPlan(overrides: Partial<PlanUnit> = {}): PlanUnit {
  return {
    planId: 'plan-1',
    title: 'Refactor Database Schema',
    status: 'under-review',
    productArea: 'blockdata',
    functionalArea: 'backend',
    artifacts: [
      {
        artifactId: 'plan-1:/docs/plans/refactor-database-schema.md',
        planId: 'plan-1',
        title: 'Refactor Database Schema',
        artifactType: 'plan',
        status: 'under-review',
        version: 1,
        path: 'docs/plans/refactor-database-schema.md',
        content: '# Refactor Database Schema',
        body: '# Refactor Database Schema',
        metadata: {
          title: 'Refactor Database Schema',
          planId: 'plan-1',
          artifactType: 'plan',
          status: 'under-review',
          version: 1,
          updatedAt: '2026-04-04T00:00:00Z',
        },
      },
      {
        artifactId: 'plan-1:/docs/plans/refactor-database-schema.v1.approval.1.md',
        planId: 'plan-1',
        title: 'Approval Note',
        artifactType: 'approval',
        status: 'approved',
        version: 1,
        path: 'docs/plans/refactor-database-schema.v1.approval.1.md',
        content: '# Approval Note',
        body: '# Approval Note',
        metadata: {
          title: 'Approval Note',
          planId: 'plan-1',
          artifactType: 'approval',
          status: 'approved',
          version: 1,
          updatedAt: '2026-04-04T00:00:00Z',
        },
      },
    ],
    ...overrides,
  };
}

describe('PlanStateNavigator', () => {
  it('filters plan rows by lifecycle tab and shows counts', () => {
    render(
      <PlanStateNavigator
        activeState="under-review"
        onChangeState={vi.fn()}
        planUnits={[
          createPlan(),
          createPlan({
            planId: 'plan-2',
            title: 'Implement User Authentication',
            status: 'draft',
            artifacts: [createPlan().artifacts[0]],
          }),
        ]}
        selectedPlanId={null}
        selectedArtifactId={null}
        onSelectPlan={vi.fn()}
        onSelectArtifact={vi.fn()}
      />,
    );

    expect(screen.getByText('Under Review')).toBeInTheDocument();
    expect(screen.getByText('Refactor Database Schema')).toBeInTheDocument();
    expect(screen.queryByText('Implement User Authentication')).not.toBeInTheDocument();
  });

  it('reveals nested artifact rows for the selected plan and notifies selection', () => {
    const onSelectArtifact = vi.fn();
    const plan = createPlan();

    render(
      <PlanStateNavigator
        activeState="under-review"
        onChangeState={vi.fn()}
        planUnits={[plan]}
        selectedPlanId="plan-1"
        selectedArtifactId={plan.artifacts[0].artifactId}
        onSelectPlan={vi.fn()}
        onSelectArtifact={onSelectArtifact}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /approval note/i }));

    expect(screen.getByText('Approval Note')).toBeInTheDocument();
    expect(onSelectArtifact).toHaveBeenCalledWith(plan.artifacts[1].artifactId);
  });
});
```

## PlanTracker.test.tsx

Source: `E:\writing-system\web\src\pages\superuser\PlanTracker.test.tsx`

`$ext
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Component as PlanTracker } from './PlanTracker';
import { SUPERUSER_NAV_SECTIONS } from '@/components/admin/AdminLeftNav';
import routerSource from '@/router.tsx?raw';

const usePlanTrackerMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('./usePlanTracker', () => ({
  usePlanTracker: (...args: unknown[]) => usePlanTrackerMock(...args),
  PLAN_TRACKER_TABS: [
    { id: 'plan-state', label: 'Plans', icon: null },
    { id: 'document', label: 'Document', icon: null },
    { id: 'metadata', label: 'Metadata', icon: null },
  ],
  PLAN_TRACKER_DEFAULT_PANES: [
    { id: 'pane-1', activeTab: 'plan-state' },
    { id: 'pane-2', activeTab: 'document' },
    { id: 'pane-3', activeTab: 'metadata' },
  ],
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: ({
    defaultPanes,
    renderContent,
  }: {
    defaultPanes: Array<{ id: string; activeTab: string }>;
    renderContent: (tabId: string) => React.ReactNode;
  }) => (
    <div data-testid="plan-tracker-workbench">
      {defaultPanes.map((pane) => (
        <section key={pane.id} data-testid={pane.id}>
          {renderContent(pane.activeTab)}
        </section>
      ))}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  usePlanTrackerMock.mockReset();
});

describe('PlanTracker', () => {
  it('renders the live three-pane shell from the tracker hook instead of fixture data', () => {
    usePlanTrackerMock.mockReturnValue({
      renderContent: (tabId: string) => <div data-testid={`content-${tabId}`}>live-{tabId}</div>,
    });

    render(<PlanTracker />);

    expect(usePlanTrackerMock).toHaveBeenCalled();
    expect(screen.getByTestId('plan-tracker-workbench')).toBeInTheDocument();
    expect(screen.getByTestId('content-plan-state')).toHaveTextContent('live-plan-state');
    expect(screen.getByTestId('content-document')).toHaveTextContent('live-document');
    expect(screen.getByTestId('content-metadata')).toHaveTextContent('live-metadata');
    expect(screen.queryByText('Fixture mode only. Workflow actions stay unwired until the live tracker hook is introduced.')).not.toBeInTheDocument();
  });

  it('mounts at the dedicated superuser route and exposes a dev-only nav entry', () => {
    usePlanTrackerMock.mockReturnValue({
      renderContent: (tabId: string) => <div data-testid={`content-${tabId}`}>live-{tabId}</div>,
    });

    const memoryRouter = createMemoryRouter(
      [{ path: '/app/superuser/plan-tracker', element: <PlanTracker /> }],
      { initialEntries: ['/app/superuser/plan-tracker'] },
    );

    render(<RouterProvider router={memoryRouter} />);

    expect(screen.getByTestId('plan-tracker-workbench')).toBeInTheDocument();

    const devOnlySection = SUPERUSER_NAV_SECTIONS.find((section) => section.label === 'DEV ONLY');
    expect(devOnlySection?.items.some((item) => item.path === '/app/superuser/plan-tracker')).toBe(true);

    expect(routerSource).toContain("path: 'plan-tracker'");
  });
});
```
