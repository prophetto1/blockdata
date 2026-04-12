import { platformApiFetch } from '@/lib/platformApi';

export const COORDINATION_RUNTIME_DISABLED_CODE = 'coordination_runtime_disabled';

type CoordinationErrorDetail = {
  code?: string;
  message?: string;
};

type CoordinationErrorResponse = {
  detail?: CoordinationErrorDetail | string;
};

export type CoordinationSessionTypeKey =
  | 'vscode.cc.cli'
  | 'vscode.cdx.cli'
  | 'vscode.cc.ide-panel'
  | 'vscode.cdx.ide-panel'
  | 'claude-desktop.cc'
  | 'codex-app-win.cdx'
  | 'terminal.cc'
  | 'terminal.cdx'
  | 'unknown';

export type CoordinationClassificationProvenance =
  | 'launch_stamped'
  | 'runtime_observed'
  | 'configured'
  | 'inferred'
  | 'unknown';

export type CoordinationSessionClassification = {
  key: CoordinationSessionTypeKey;
  display_label: string;
  container_host: 'vscode' | 'claude-desktop' | 'codex-app-win' | 'terminal' | 'unknown';
  interaction_surface: 'cli' | 'ide-panel' | 'desktop-app' | 'unknown';
  runtime_product: 'cc' | 'cdx' | 'unknown';
  classified: boolean;
  registry_version: 1;
  reason: string | null;
  provenance: {
    key: CoordinationClassificationProvenance;
    container_host: CoordinationClassificationProvenance;
    interaction_surface: CoordinationClassificationProvenance;
    runtime_product: CoordinationClassificationProvenance;
    display_label: 'derived';
  };
};

export type CoordinationSessionClassificationSummary = {
  classified_count: number;
  unknown_count: number;
  counts_by_type: Record<CoordinationSessionTypeKey, number>;
  counts_by_provenance: Record<CoordinationClassificationProvenance, number>;
};

export type CoordinationIdentitySummary = {
  active_count: number;
  stale_count: number;
  host_count: number;
  family_counts: Record<string, number>;
  session_classification_counts: Record<CoordinationSessionTypeKey, number>;
  session_classification_unknown_count: number;
  session_classification_provenance_counts: Record<CoordinationClassificationProvenance, number>;
};

export type CoordinationStatusResponse = {
  broker: {
    state: string;
    url?: string | null;
    server?: string | null;
    error_type?: string | null;
  };
  streams: Record<string, unknown>;
  kv_buckets: Record<string, unknown>;
  presence_summary: {
    active_agents: number;
  };
  identity_summary: {
    active_count: number;
    stale_count: number;
    host_count: number;
    family_counts: Record<string, number>;
  };
  discussion_summary: {
    thread_count: number;
    pending_count: number;
    stale_count: number;
    workspace_bound_count: number;
  };
  session_classification_summary: CoordinationSessionClassificationSummary;
  hook_audit_summary: {
    state: string;
    record_count: number;
    allow_count: number;
    warn_count: number;
    block_count: number;
    error_count: number;
  };
  local_host_outbox_backlog: {
    files: number;
    events: number;
    bytes: number;
  };
  app_runtime: {
    runtime_enabled: boolean;
    host: string;
    runtime_root: string;
  };
  stream_bridge: {
    state: string;
    client_count: number;
    last_error?: string | null;
  };
};

export type CoordinationTaskSnapshotResponse = {
  task: Record<string, unknown> | null;
  claim: Record<string, unknown> | null;
  participants: Record<string, unknown>[];
  recent_events: CoordinationStreamEvent[];
  local_host_audit_file: string;
};

export type CoordinationIdentity = {
  lease_identity: string;
  identity?: string;
  host: string | null;
  family: string | null;
  session_agent_id: string | null;
  claimed_at: string | null;
  last_heartbeat_at: string | null;
  expires_at: string | null;
  stale: boolean;
  revision: number | null;
  session_classification: CoordinationSessionClassification;
};

export type CoordinationIdentityResponse = {
  summary: CoordinationIdentitySummary;
  identities: CoordinationIdentity[];
};

export type CoordinationDiscussionParticipant = {
  host: string | null;
  agent_id: string | null;
};

export type CoordinationDiscussion = {
  task_id: string;
  workspace_type: string | null;
  workspace_path: string | null;
  directional_doc: string | null;
  participants: CoordinationDiscussionParticipant[];
  pending_recipients: CoordinationDiscussionParticipant[];
  last_event_kind: string | null;
  status: 'pending' | 'acknowledged' | 'stale';
  updated_at: string | null;
};

export type CoordinationDiscussionResponse = {
  summary: CoordinationStatusResponse['discussion_summary'];
  discussions: CoordinationDiscussion[];
};

export type CoordinationControlEnvelope = {
  type: 'control';
  state: string;
  message?: string | null;
  occurred_at: string;
};

export type CoordinationStreamEvent = {
  event_id: string;
  subject: string;
  task_id: string;
  event_kind: string;
  host: string;
  agent_id: string;
  buffered: boolean;
  occurred_at: string;
  payload: Record<string, unknown>;
};

export type CoordinationStreamEnvelope = CoordinationControlEnvelope | CoordinationStreamEvent;

export class CoordinationRuntimeDisabledError extends Error {
  code = COORDINATION_RUNTIME_DISABLED_CODE;

  constructor(message = 'Coordination runtime is disabled') {
    super(message);
    this.name = 'CoordinationRuntimeDisabledError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorMessage(payload: unknown, status: number): string {
  if (isRecord(payload)) {
    const detail = payload.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
    if (isRecord(detail) && typeof detail.message === 'string' && detail.message.trim().length > 0) {
      return detail.message;
    }
  }
  return `Coordination request failed: ${status}`;
}

function isDisabledPayload(payload: unknown): payload is { detail: { code: string; message: string } } {
  if (!isRecord(payload) || !isRecord(payload.detail)) return false;
  return payload.detail.code === COORDINATION_RUNTIME_DISABLED_CODE && typeof payload.detail.message === 'string';
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { detail: await response.text().catch(() => '') } satisfies CoordinationErrorResponse;
  }
  return response.json().catch(() => null);
}

async function requireJson<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  const payload = await readJsonPayload(response);
  if (response.status === 503 && isDisabledPayload(payload)) {
    throw new CoordinationRuntimeDisabledError(payload.detail.message);
  }

  throw new Error(readErrorMessage(payload, response.status));
}

function buildCoordinationQuery(
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getCoordinationStatus(): Promise<CoordinationStatusResponse> {
  return requireJson<CoordinationStatusResponse>(
    await platformApiFetch('/admin/runtime/coordination/status'),
  );
}

export async function getCoordinationTaskSnapshot(
  taskId: string,
  options: { limit?: number } = {},
): Promise<CoordinationTaskSnapshotResponse> {
  const query = buildCoordinationQuery({ limit: options.limit });
  return requireJson<CoordinationTaskSnapshotResponse>(
    await platformApiFetch(
      `/admin/runtime/coordination/tasks/${encodeURIComponent(taskId)}${query}`,
    ),
  );
}

export async function getCoordinationIdentities(
  options: {
    host?: string;
    family?: string;
    includeStale?: boolean;
  } = {},
): Promise<CoordinationIdentityResponse> {
  const query = buildCoordinationQuery({
    host: options.host,
    family: options.family,
    include_stale: options.includeStale,
  });
  return requireJson<CoordinationIdentityResponse>(
    await platformApiFetch(`/admin/runtime/coordination/identities${query}`),
  );
}

export async function getCoordinationDiscussions(
  options: {
    taskId?: string;
    workspacePath?: string;
    status?: 'pending' | 'acknowledged' | 'stale' | 'all';
    limit?: number;
  } = {},
): Promise<CoordinationDiscussionResponse> {
  const query = buildCoordinationQuery({
    task_id: options.taskId,
    workspace_path: options.workspacePath,
    status: options.status,
    limit: options.limit,
  });
  return requireJson<CoordinationDiscussionResponse>(
    await platformApiFetch(`/admin/runtime/coordination/discussions${query}`),
  );
}

export async function openCoordinationEventStream(
  params: {
    taskId?: string;
    subjectPrefix?: string;
    limit?: number;
  } = {},
  init: RequestInit = {},
): Promise<Response> {
  const query = buildCoordinationQuery({
    task_id: params.taskId,
    subject_prefix: params.subjectPrefix,
    limit: params.limit,
  });
  return platformApiFetch(`/admin/runtime/coordination/events/stream${query}`, init);
}
