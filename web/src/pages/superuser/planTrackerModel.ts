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
