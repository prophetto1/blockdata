import { platformApiFetch } from '@/lib/platformApi';

export const COORDINATION_RUNTIME_DISABLED_CODE = 'coordination_runtime_disabled';

type CoordinationErrorDetail = {
  code?: string;
  message?: string;
};

type CoordinationErrorResponse = {
  detail?: CoordinationErrorDetail | string;
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

function buildCoordinationQuery(params: {
  taskId?: string;
  subjectPrefix?: string;
  limit?: number;
} = {}): string {
  const searchParams = new URLSearchParams();
  if (params.taskId) searchParams.set('task_id', params.taskId);
  if (params.subjectPrefix) searchParams.set('subject_prefix', params.subjectPrefix);
  if (typeof params.limit === 'number') searchParams.set('limit', String(params.limit));
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

export async function openCoordinationEventStream(
  params: {
    taskId?: string;
    subjectPrefix?: string;
    limit?: number;
  } = {},
  init: RequestInit = {},
): Promise<Response> {
  const query = buildCoordinationQuery(params);
  return platformApiFetch(`/admin/runtime/coordination/events/stream${query}`, init);
}
