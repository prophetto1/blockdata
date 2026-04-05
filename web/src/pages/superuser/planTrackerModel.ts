import yaml from 'js-yaml';

export type PlanArtifactType =
  | 'plan'
  | 'review-note'
  | 'approval-note'
  | 'implementation-note'
  | 'verification-note'
  | 'closure-note'
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
  updatedAt?: string;
  productArea?: string;
  functionalArea?: string;
  productL1?: string;
  productL2?: string;
  productL3?: string;
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
  | 'start-work'
  | 'submit-for-review'
  | 'send-back'
  | 'approve'
  | 'mark-implementing'
  | 'mark-implemented'
  | 'request-verification'
  | 'close';

export type WorkflowActionOption = {
  id: WorkflowActionId;
  label: string;
};

type ArtifactFilenameInput = {
  planStem: string;
  artifactType: Exclude<PlanArtifactType, 'unknown'>;
  version: number;
  sequence?: number;
};

const LEADING_FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
const DOT_FILENAME_RE =
  /^(?<stem>.+)\.v(?<version>\d+)(?:\.(?<segment>review|evaluation|approval|implementation|verification|closure)\.(?<sequence>\d+))?$/i;
const VERSION_SUFFIX_RE = /(?:^|[-_.])v(\d+)(?:[-_.]\d+)?$/i;
const SEQUENCE_SUFFIX_RE = /\.(?:review|evaluation|approval|implementation|verification|closure)\.(\d+)$/i;

const LIFECYCLE_RANK: Record<LifecycleState, number> = {
  'to-do': 0,
  'in-progress': 1,
  'under-review': 2,
  approved: 3,
  implemented: 4,
  verified: 5,
  closed: 6,
};

const ARTIFACT_SORT_WEIGHT: Record<PlanArtifactType, number> = {
  plan: 0,
  'review-note': 1,
  'approval-note': 2,
  'implementation-note': 3,
  'verification-note': 4,
  'closure-note': 5,
  unknown: 6,
};

const LEGACY_SUFFIX_PATTERNS: Array<{ type: PlanArtifactType; pattern: RegExp }> = [
  { type: 'closure-note', pattern: /(?:^|[-_.])(?:closure(?:-note)?)$/i },
  { type: 'verification-note', pattern: /(?:^|[-_.])(?:verification(?:-note)?|handoff)$/i },
  { type: 'implementation-note', pattern: /(?:^|[-_.])(?:implementation(?:-note)?|implementation-evaluation|status-report)$/i },
  { type: 'approval-note', pattern: /(?:^|[-_.])approval(?:-note)?$/i },
  { type: 'review-note', pattern: /(?:^|[-_.])(?:plan-)?reevaluation$/i },
  { type: 'review-note', pattern: /(?:^|[-_.])(?:plan-)?evaluation$/i },
  { type: 'review-note', pattern: /(?:^|[-_.])review-note$/i },
];

function toPosixPath(path: string) {
  return path.replaceAll('\\', '/');
}

function fileStem(path: string) {
  const normalized = toPosixPath(path);
  const name = normalized.split('/').pop() ?? normalized;
  return name.replace(/\.(md|mdx)$/i, '');
}

function normalizeStem(stem: string) {
  return stem.replace(DATE_PREFIX_RE, '');
}

function dotSegmentToArtifactType(segment: string | undefined): PlanArtifactType {
  switch (segment?.toLowerCase()) {
    case 'review':
    case 'evaluation':
      return 'review-note';
    case 'approval':
      return 'approval-note';
    case 'implementation':
      return 'implementation-note';
    case 'verification':
      return 'verification-note';
    case 'closure':
      return 'closure-note';
    default:
      return 'plan';
  }
}

function inferArtifactTypeFromStem(stem: string): PlanArtifactType {
  const normalized = normalizeStem(stem);
  const dotted = normalized.match(DOT_FILENAME_RE);
  if (dotted?.groups?.segment) {
    return dotSegmentToArtifactType(dotted.groups.segment);
  }

  for (const entry of LEGACY_SUFFIX_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      return entry.type;
    }
  }

  return 'plan';
}

function stripArtifactSuffix(stem: string) {
  const normalized = normalizeStem(stem);
  const dotted = normalized.match(DOT_FILENAME_RE);
  if (dotted?.groups?.stem) {
    return dotted.groups.stem;
  }

  let value = normalized;
  for (const entry of LEGACY_SUFFIX_PATTERNS) {
    if (entry.pattern.test(value)) {
      value = value.replace(entry.pattern, '');
      break;
    }
  }

  return value.replace(VERSION_SUFFIX_RE, '').replace(/[-_.]+$/, '');
}

function inferVersionFromStem(stem: string) {
  const normalized = normalizeStem(stem);
  const dotted = normalized.match(DOT_FILENAME_RE);
  if (dotted?.groups?.version) {
    return Number(dotted.groups.version);
  }

  const match = normalized.match(VERSION_SUFFIX_RE);
  return match ? Number(match[1]) : 1;
}

function inferSequenceFromStem(stem: string) {
  const normalized = normalizeStem(stem);
  const dotted = normalized.match(DOT_FILENAME_RE);
  if (dotted?.groups?.sequence) {
    return Number(dotted.groups.sequence);
  }

  const match = normalized.match(SEQUENCE_SUFFIX_RE);
  return match ? Number(match[1]) : undefined;
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

function compareIsoDesc(left?: string, right?: string) {
  const leftValue = left ? Date.parse(left) : 0;
  const rightValue = right ? Date.parse(right) : 0;
  return rightValue - leftValue;
}

function compareArtifactsForDisplay(left: PlanArtifactSummary, right: PlanArtifactSummary) {
  const weightDelta = ARTIFACT_SORT_WEIGHT[left.artifactType] - ARTIFACT_SORT_WEIGHT[right.artifactType];
  if (weightDelta !== 0) return weightDelta;
  if (left.version !== right.version) return left.version - right.version;
  if ((left.sequence ?? 0) !== (right.sequence ?? 0)) return (left.sequence ?? 0) - (right.sequence ?? 0);
  return left.path.localeCompare(right.path);
}

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

export function normalizeArtifactType(
  value: unknown,
  fallback: PlanArtifactType = 'unknown',
): PlanArtifactType {
  if (typeof value !== 'string') return fallback;

  switch (value.trim().toLowerCase()) {
    case 'plan':
      return 'plan';
    case 'review-note':
    case 'evaluation':
    case 'reevaluation':
      return 'review-note';
    case 'approval-note':
    case 'approval':
      return 'approval-note';
    case 'implementation-note':
    case 'implementation':
    case 'implementation-evaluation':
    case 'status-report':
      return 'implementation-note';
    case 'verification-note':
    case 'verification':
    case 'handoff':
      return 'verification-note';
    case 'closure-note':
    case 'closure':
      return 'closure-note';
    case 'unknown':
      return 'unknown';
    default:
      return fallback;
  }
}

export function parsePlanTrackerDocument(input: TrackerDocumentInput): PlanArtifactSummary {
  const stem = fileStem(input.path);
  const fallbackArtifactType = inferArtifactTypeFromStem(stem);
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
      ? normalizeLifecycleState(frontmatter.status).toString()
      : artifactType === 'plan'
        ? 'to-do'
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
    updatedAt: typeof frontmatter.updatedAt === 'string' ? frontmatter.updatedAt : undefined,
    productArea: typeof frontmatter.productArea === 'string' ? frontmatter.productArea : undefined,
    functionalArea: typeof frontmatter.functionalArea === 'string' ? frontmatter.functionalArea : undefined,
    productL1: typeof frontmatter.productL1 === 'string' ? frontmatter.productL1 : undefined,
    productL2: typeof frontmatter.productL2 === 'string' ? frontmatter.productL2 : undefined,
    productL3: typeof frontmatter.productL3 === 'string' ? frontmatter.productL3 : undefined,
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
        status: normalizeLifecycleState(metadata.status),
        version: metadata.version,
        productL1: metadata.productL1,
        productL2: metadata.productL2,
        productL3: metadata.productL3,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        owner: metadata.owner,
        reviewer: metadata.reviewer,
        tags: metadata.tags,
        supersedesArtifactId: metadata.supersedesArtifactId,
        relatedArtifacts: metadata.relatedArtifacts,
        notes: metadata.notes,
        productArea: metadata.productArea,
        functionalArea: metadata.functionalArea,
        priority: metadata.priority,
        trackerId: metadata.trackerId,
      },
      { noRefs: true, sortKeys: false, lineWidth: -1 },
    )
    .trimEnd();

  return `---\n${frontmatter}\n---\n${body.startsWith('\n') ? body : `\n${body}`}`;
}

export function resolveControllingArtifact(plan: PlanUnit): PlanArtifactSummary | null {
  const normalizedPlanArtifacts = plan.artifacts
    .filter((artifact) => normalizeArtifactType(artifact.artifactType) === 'plan')
    .slice()
    .sort((left, right) => {
      if (left.version !== right.version) return right.version - left.version;

      const updatedDelta = compareIsoDesc(left.metadata.updatedAt, right.metadata.updatedAt);
      if (updatedDelta !== 0) return updatedDelta;

      const createdDelta = compareIsoDesc(left.metadata.createdAt, right.metadata.createdAt);
      if (createdDelta !== 0) return createdDelta;

      return left.path.localeCompare(right.path);
    });

  if (normalizedPlanArtifacts.length > 0) {
    return normalizedPlanArtifacts[0];
  }

  const legacySorted = plan.artifacts
    .slice()
    .sort((left, right) => {
      if (left.version !== right.version) return right.version - left.version;

      const lifecycleDelta =
        LIFECYCLE_RANK[normalizeLifecycleState(right.status)] -
        LIFECYCLE_RANK[normalizeLifecycleState(left.status)];
      if (lifecycleDelta !== 0) return lifecycleDelta;

      const updatedDelta = compareIsoDesc(left.metadata.updatedAt, right.metadata.updatedAt);
      if (updatedDelta !== 0) return updatedDelta;

      const createdDelta = compareIsoDesc(left.metadata.createdAt, right.metadata.createdAt);
      if (createdDelta !== 0) return createdDelta;

      return left.path.localeCompare(right.path);
    });

  return legacySorted[0] ?? null;
}

export function resolveControllingLifecycleState(plan: PlanUnit): LifecycleState {
  const controlling = resolveControllingArtifact(plan);
  return normalizeLifecycleState(controlling?.status ?? plan.status);
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
      const sortedArtifacts = artifacts.slice().sort(compareArtifactsForDisplay);
      const controllingArtifact = resolveControllingArtifact({
        planId,
        title: sortedArtifacts[0]?.title ?? planId,
        status: sortedArtifacts[0]?.status ?? 'to-do',
        productArea: undefined,
        functionalArea: undefined,
        artifacts: sortedArtifacts,
      });

      return {
        planId,
        title: controllingArtifact?.title ?? sortedArtifacts[0]?.title ?? planId,
        status: resolveControllingLifecycleState({
          planId,
          title: controllingArtifact?.title ?? sortedArtifacts[0]?.title ?? planId,
          status: controllingArtifact?.status ?? sortedArtifacts[0]?.status ?? 'to-do',
          productArea: controllingArtifact?.metadata.productArea,
          functionalArea: controllingArtifact?.metadata.functionalArea,
          artifacts: sortedArtifacts,
        }),
        productArea: controllingArtifact?.metadata.productArea,
        functionalArea: controllingArtifact?.metadata.functionalArea,
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
      artifact.metadata.planId.trim() &&
      artifact.metadata.artifactType &&
      artifact.metadata.status.trim() &&
      Number.isFinite(artifact.metadata.version) &&
      artifact.metadata.version > 0 &&
      artifact.metadata.productL1?.trim() &&
      artifact.metadata.productL2?.trim() &&
      artifact.metadata.productL3?.trim() &&
      artifact.metadata.createdAt?.trim() &&
      artifact.metadata.updatedAt?.trim(),
  );
}

export function latestPlanArtifact(artifacts: PlanArtifactSummary[]) {
  const unit: PlanUnit = {
    planId: artifacts[0]?.planId ?? '',
    title: artifacts[0]?.title ?? '',
    status: artifacts[0]?.status ?? 'to-do',
    artifacts,
  };

  const controlling = resolveControllingArtifact(unit);
  return controlling?.artifactType === 'plan' ? controlling : artifacts.filter((artifact) => artifact.artifactType === 'plan').slice().sort((left, right) => {
    if (left.version !== right.version) return right.version - left.version;
    const updatedDelta = compareIsoDesc(left.metadata.updatedAt, right.metadata.updatedAt);
    if (updatedDelta !== 0) return updatedDelta;
    const createdDelta = compareIsoDesc(left.metadata.createdAt, right.metadata.createdAt);
    if (createdDelta !== 0) return createdDelta;
    return left.path.localeCompare(right.path);
  })[0] ?? null;
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

export function hasApprovalForCurrentLineage(plan: PlanUnit): boolean {
  const controlling = resolveControllingArtifact(plan);
  if (!controlling) return false;

  return plan.artifacts.some(
    (artifact) =>
      normalizeArtifactType(artifact.artifactType) === 'approval-note' &&
      artifact.version === controlling.version,
  );
}

export function getAvailableWorkflowActions(plan: PlanUnit): WorkflowActionOption[] {
  const state = resolveControllingLifecycleState(plan);

  switch (state) {
    case 'to-do':
      return [{ id: 'start-work', label: 'Start Work' }];
    case 'in-progress':
      return hasApprovalForCurrentLineage(plan)
        ? [
            { id: 'submit-for-review', label: 'Submit for Review' },
            { id: 'mark-implemented', label: 'Mark Implemented' },
          ]
        : [{ id: 'submit-for-review', label: 'Submit for Review' }];
    case 'under-review':
      return [
        { id: 'send-back', label: 'Send Back' },
        { id: 'approve', label: 'Approve' },
      ];
    case 'approved':
      return [{ id: 'mark-implementing', label: 'Mark Implementing' }];
    case 'implemented':
      return [{ id: 'request-verification', label: 'Request Verification' }];
    case 'verified':
      return [{ id: 'close', label: 'Close' }];
    case 'closed':
    default:
      return [];
  }
}

export function workflowArtifactType(actionId: WorkflowActionId): Exclude<PlanArtifactType, 'unknown'> {
  switch (actionId) {
    case 'start-work':
    case 'submit-for-review':
      return 'plan';
    case 'send-back':
      return 'review-note';
    case 'approve':
      return 'approval-note';
    case 'mark-implementing':
    case 'mark-implemented':
      return 'implementation-note';
    case 'request-verification':
      return 'verification-note';
    case 'close':
      return 'closure-note';
  }
}

export function workflowPlanStatus(actionId: WorkflowActionId): LifecycleState {
  switch (actionId) {
    case 'start-work':
      return 'in-progress';
    case 'submit-for-review':
      return 'under-review';
    case 'send-back':
      return 'in-progress';
    case 'approve':
      return 'approved';
    case 'mark-implementing':
      return 'in-progress';
    case 'mark-implemented':
      return 'implemented';
    case 'request-verification':
      return 'verified';
    case 'close':
      return 'closed';
  }
}

export function workflowArtifactStatus(actionId: WorkflowActionId): LifecycleState {
  return workflowPlanStatus(actionId);
}

export function workflowArtifactTitle(
  actionId: WorkflowActionId,
  planTitle: string,
  version: number,
  sequence?: number,
) {
  const suffix = `v${version}.${sequence ?? 1}`;

  switch (actionId) {
    case 'start-work':
    case 'submit-for-review':
      return planTitle;
    case 'send-back':
      return `Review Note ${suffix}`;
    case 'approve':
      return `Approval Note ${suffix}`;
    case 'mark-implementing':
    case 'mark-implemented':
      return `Implementation Note ${suffix}`;
    case 'request-verification':
      return `Verification Note ${suffix}`;
    case 'close':
      return `Closure Note ${suffix}`;
  }
}

export function noteArtifactTypeForState(state: LifecycleState): Exclude<PlanArtifactType, 'plan' | 'unknown' | 'closure-note'> {
  switch (state) {
    case 'to-do':
    case 'in-progress':
    case 'under-review':
      return 'review-note';
    case 'approved':
    case 'implemented':
      return 'implementation-note';
    case 'verified':
    case 'closed':
    default:
      return 'verification-note';
  }
}

export function buildArtifactFilename({ planStem, artifactType, version, sequence }: ArtifactFilenameInput) {
  if (artifactType === 'plan') {
    return `${planStem}.v${version}.md`;
  }

  const segmentByType: Record<Exclude<ArtifactFilenameInput['artifactType'], 'plan'>, string> = {
    'review-note': 'review',
    'approval-note': 'approval',
    'implementation-note': 'implementation',
    'verification-note': 'verification',
    'closure-note': 'closure',
  };

  const sequenceNumber = sequence ?? 1;
  return `${planStem}.v${version}.${segmentByType[artifactType]}.${sequenceNumber}.md`;
}
