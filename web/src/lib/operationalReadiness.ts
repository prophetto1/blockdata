import { platformApiFetch } from '@/lib/platformApi';

export type OperationalReadinessStatus = 'ok' | 'warn' | 'fail' | 'unknown';
export type PlatformApiBaseMode = 'relative_proxy' | 'absolute_direct';
export type BootstrapProbeStatus = 'pending' | 'ok' | 'warn' | 'fail' | 'skipped';
export type BootstrapDiagnosisKind =
  | 'platform_api_unreachable'
  | 'readiness_route_missing'
  | 'auth_missing'
  | 'auth_rejected'
  | 'snapshot_http_error'
  | 'preflight_or_cors_failure'
  | 'target_mismatch'
  | 'unknown_transport_failure'
  | 'ready';
export type BootstrapProbeId =
  | 'frontend_origin'
  | 'platform_api_target'
  | 'health_probe'
  | 'readiness_route_probe'
  | 'auth_token_probe'
  | 'snapshot_request';
export type OperationalReadinessActionability =
  | 'backend_action'
  | 'backend_probe'
  | 'external_change'
  | 'info_only';
export type OperationalReadinessCauseConfidence = 'high' | 'medium' | 'low' | null;
export type OperationalReadinessProbeKind =
  | 'readiness_check_verify'
  | 'storage_signed_upload'
  | 'supabase_admin_connectivity'
  | 'background_workers_config'
  | 'telemetry_export'
  | 'pipeline_services_browser_upload'
  | 'pipeline_services_job_execution';
export type OperationalReadinessActionKind = 'storage_browser_upload_cors_reconcile';
export type OperationalReadinessActionExecutionStatus = 'idle' | 'pending' | 'success' | 'error';

export type OperationalReadinessSummary = {
  ok: number;
  warn: number;
  fail: number;
  unknown: number;
};

export type OperationalReadinessSurfaceId = 'shared' | 'blockdata' | 'agchain';

export type OperationalReadinessDependencyRef = {
  check_id: string;
  label: string;
  status: OperationalReadinessStatus;
};

export type OperationalReadinessAvailableAction = {
  action_kind: OperationalReadinessActionKind;
  label: string;
  description: string;
  route: '/admin/runtime/storage/browser-upload-cors/reconcile';
  requires_confirmation: boolean;
};

export type OperationalReadinessActionExecutionState = {
  status: OperationalReadinessActionExecutionStatus;
  message: string | null;
};

export type OperationalReadinessCheckDetailState = {
  loading: boolean;
  verifying: boolean;
  error: string | null;
  detail: OperationalReadinessCheckDetailResponse | null;
};

export type OperationalReadinessVerifyTarget = {
  probe_kind: OperationalReadinessProbeKind;
  label: string;
  route: string;
};

export type OperationalReadinessNextStep = {
  step_kind: 'rerun_after_action' | 'inspect_dependency' | 'manual_fix' | 'escalate';
  label: string;
  description: string;
};

export type OperationalReadinessCheck = {
  check_id: string;
  surface_id: OperationalReadinessSurfaceId;
  category: 'process' | 'config' | 'credential' | 'connectivity' | 'browser-dependent' | 'observability' | 'product';
  status: OperationalReadinessStatus;
  label: string;
  summary: string;
  cause: string | null;
  cause_confidence: OperationalReadinessCauseConfidence;
  depends_on: OperationalReadinessDependencyRef[];
  blocked_by: OperationalReadinessDependencyRef[];
  available_actions: OperationalReadinessAvailableAction[];
  verify_after: OperationalReadinessVerifyTarget[];
  next_if_still_failing: OperationalReadinessNextStep[];
  actionability: OperationalReadinessActionability;
  evidence: Record<string, unknown>;
  remediation: string;
  checked_at: string;
};

export type OperationalReadinessSurface = {
  id: OperationalReadinessSurfaceId;
  label: string;
  summary: OperationalReadinessSummary;
  checks: OperationalReadinessCheck[];
};

export type OperationalReadinessSnapshot = {
  generated_at: string;
  summary: OperationalReadinessSummary;
  surfaces: OperationalReadinessSurface[];
};

export function getOperationalReadinessActionStateKey(
  checkId: string,
  actionKind: OperationalReadinessActionKind,
): string {
  return `${checkId}:${actionKind}`;
}

async function readOperationalReadinessErrorDetail(response: Response, fallback: string) {
  try {
    const body = await response.json() as { detail?: string };
    if (typeof body.detail === 'string' && body.detail.trim()) {
      return body.detail;
    }
  } catch {
    // Keep the status-derived fallback when the body cannot be parsed.
  }

  return fallback;
}

export async function executeOperationalReadinessAction(
  action: OperationalReadinessAvailableAction,
  options?: {
    platformApiTarget?: string;
    confirmed?: boolean;
  },
) {
  const response = await platformApiFetch(
    action.route,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmed: options?.confirmed ?? true }),
    },
    options?.platformApiTarget ? { platformApiTarget: options.platformApiTarget } : {},
  );

  if (!response.ok) {
    throw new Error(
      await readOperationalReadinessErrorDetail(
        response,
        `Operational readiness action failed: ${response.status}`,
      ),
    );
  }

  return response.json().catch(() => null);
}

export type OperationalReadinessProbeRun = {
  probe_run_id: string;
  probe_kind: OperationalReadinessProbeKind;
  check_id: string | null;
  result: 'ok' | 'fail' | 'error';
  duration_ms: number;
  evidence: Record<string, unknown>;
  failure_reason: string | null;
  created_at: string;
};

export type OperationalReadinessActionRun = {
  action_run_id: string;
  action_kind: OperationalReadinessActionKind;
  check_id: string | null;
  result: 'ok' | 'fail' | 'error';
  duration_ms: number;
  request: Record<string, unknown>;
  result_payload: Record<string, unknown>;
  failure_reason: string | null;
  created_at: string;
};

export type OperationalReadinessCheckDetailResponse = {
  check: OperationalReadinessCheck;
  latest_probe_run: OperationalReadinessProbeRun | null;
  latest_action_run: OperationalReadinessActionRun | null;
};

export async function getOperationalReadinessCheckDetail(
  checkId: string,
  options?: {
    platformApiTarget?: string;
  },
): Promise<OperationalReadinessCheckDetailResponse> {
  const response = await platformApiFetch(
    `/admin/runtime/readiness/checks/${encodeURIComponent(checkId)}`,
    {},
    options?.platformApiTarget ? { platformApiTarget: options.platformApiTarget } : {},
  );

  if (!response.ok) {
    throw new Error(
      await readOperationalReadinessErrorDetail(
        response,
        `Operational readiness detail request failed: ${response.status}`,
      ),
    );
  }

  return await response.json() as OperationalReadinessCheckDetailResponse;
}

export async function verifyOperationalReadinessCheck(
  checkId: string,
  options?: {
    platformApiTarget?: string;
  },
): Promise<OperationalReadinessCheckDetailResponse> {
  const response = await platformApiFetch(
    `/admin/runtime/readiness/checks/${encodeURIComponent(checkId)}/verify`,
    {
      method: 'POST',
    },
    options?.platformApiTarget ? { platformApiTarget: options.platformApiTarget } : {},
  );

  if (!response.ok) {
    throw new Error(
      await readOperationalReadinessErrorDetail(
        response,
        `Operational readiness verify request failed: ${response.status}`,
      ),
    );
  }

  return await response.json() as OperationalReadinessCheckDetailResponse;
}

export type ClientDiagnostic = {
  id: string;
  label: string;
  value: string;
  summary: string;
};

export type OperationalReadinessBootstrapProbe = {
  probe_id: BootstrapProbeId;
  label: string;
  status: BootstrapProbeStatus;
  summary: string;
  detail: string;
  target_url?: string;
  http_status_code?: number | null;
};

export type OperationalReadinessBootstrapState = {
  diagnosis_kind: BootstrapDiagnosisKind;
  diagnosis_title: string;
  diagnosis_summary: string;
  snapshot_available: boolean;
  base_mode: PlatformApiBaseMode;
  frontend_origin: string;
  platform_api_target: string;
  probes: OperationalReadinessBootstrapProbe[];
};

type LooseRecord = Record<string, unknown>;

const ZERO_SUMMARY: OperationalReadinessSummary = {
  ok: 0,
  warn: 0,
  fail: 0,
  unknown: 0,
};

const SURFACE_ORDER: Array<{ id: OperationalReadinessSurfaceId; label: string }> = [
  { id: 'shared', label: 'Shared' },
  { id: 'blockdata', label: 'BlockData' },
  { id: 'agchain', label: 'AGChain' },
];

const ALLOWED_STATUSES = new Set<OperationalReadinessStatus>(['ok', 'warn', 'fail', 'unknown']);
const ALLOWED_CONFIDENCE = new Set<Exclude<OperationalReadinessCauseConfidence, null>>(['high', 'medium', 'low']);
const ALLOWED_ACTIONABILITY = new Set<OperationalReadinessActionability>([
  'backend_action',
  'backend_probe',
  'external_change',
  'info_only',
]);
const ALLOWED_PROBE_KINDS = new Set<OperationalReadinessProbeKind>([
  'readiness_check_verify',
  'storage_signed_upload',
  'supabase_admin_connectivity',
  'background_workers_config',
  'telemetry_export',
  'pipeline_services_browser_upload',
  'pipeline_services_job_execution',
]);
const ALLOWED_ACTION_KINDS = new Set<OperationalReadinessActionKind>(['storage_browser_upload_cors_reconcile']);
const ALLOWED_STEP_KINDS = new Set<OperationalReadinessNextStep['step_kind']>([
  'rerun_after_action',
  'inspect_dependency',
  'manual_fix',
  'escalate',
]);
const ALLOWED_CATEGORIES = new Set<OperationalReadinessCheck['category']>([
  'process',
  'config',
  'credential',
  'connectivity',
  'browser-dependent',
  'observability',
  'product',
]);

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStatus(value: unknown): OperationalReadinessStatus {
  return typeof value === 'string' && ALLOWED_STATUSES.has(value as OperationalReadinessStatus)
    ? (value as OperationalReadinessStatus)
    : 'unknown';
}

function normalizeSummary(value: unknown): OperationalReadinessSummary {
  if (!isRecord(value)) return ZERO_SUMMARY;
  return {
    ok: typeof value.ok === 'number' ? value.ok : 0,
    warn: typeof value.warn === 'number' ? value.warn : 0,
    fail: typeof value.fail === 'number' ? value.fail : 0,
    unknown: typeof value.unknown === 'number' ? value.unknown : 0,
  };
}

function normalizeConfidence(value: unknown): OperationalReadinessCauseConfidence {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' && ALLOWED_CONFIDENCE.has(value as Exclude<OperationalReadinessCauseConfidence, null>)
    ? (value as Exclude<OperationalReadinessCauseConfidence, null>)
    : null;
}

function normalizeActionability(value: unknown): OperationalReadinessActionability {
  return typeof value === 'string' && ALLOWED_ACTIONABILITY.has(value as OperationalReadinessActionability)
    ? (value as OperationalReadinessActionability)
    : 'info_only';
}

function normalizeDependencyRef(value: unknown): OperationalReadinessDependencyRef | null {
  if (!isRecord(value)) return null;
  const checkId = normalizeString(value.check_id);
  const label = normalizeString(value.label);
  if (!checkId || !label) return null;
  return {
    check_id: checkId,
    label,
    status: normalizeStatus(value.status),
  };
}

function normalizeAvailableAction(value: unknown): OperationalReadinessAvailableAction | null {
  if (!isRecord(value)) return null;
  const actionKind = value.action_kind;
  const route = value.route;
  if (
    typeof actionKind !== 'string' ||
    !ALLOWED_ACTION_KINDS.has(actionKind as OperationalReadinessActionKind) ||
    route !== '/admin/runtime/storage/browser-upload-cors/reconcile'
  ) {
    return null;
  }

  return {
    action_kind: actionKind as OperationalReadinessActionKind,
    label: normalizeString(value.label),
    description: normalizeString(value.description),
    route,
    requires_confirmation: normalizeBoolean(value.requires_confirmation),
  };
}

function normalizeVerifyTarget(value: unknown): OperationalReadinessVerifyTarget | null {
  if (!isRecord(value)) return null;
  const probeKind = value.probe_kind;
  if (typeof probeKind !== 'string' || !ALLOWED_PROBE_KINDS.has(probeKind as OperationalReadinessProbeKind)) {
    return null;
  }

  return {
    probe_kind: probeKind as OperationalReadinessProbeKind,
    label: normalizeString(value.label),
    route: normalizeString(value.route),
  };
}

function normalizeNextStep(value: unknown): OperationalReadinessNextStep | null {
  if (!isRecord(value)) return null;
  const stepKind = value.step_kind;
  if (typeof stepKind !== 'string' || !ALLOWED_STEP_KINDS.has(stepKind as OperationalReadinessNextStep['step_kind'])) {
    return null;
  }

  return {
    step_kind: stepKind as OperationalReadinessNextStep['step_kind'],
    label: normalizeString(value.label),
    description: normalizeString(value.description),
  };
}

function normalizeEvidence(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function normalizeCheck(value: unknown, surfaceId: OperationalReadinessSurfaceId): OperationalReadinessCheck | null {
  if (!isRecord(value)) return null;

  const category = value.category;
  const normalizedCategory =
    typeof category === 'string' && ALLOWED_CATEGORIES.has(category as OperationalReadinessCheck['category'])
      ? (category as OperationalReadinessCheck['category'])
      : 'process';

  const checkId = normalizeString(value.check_id ?? value.id);
  const label = normalizeString(value.label);
  const summary = normalizeString(value.summary);
  if (!checkId || !label || !summary) return null;

  return {
    check_id: checkId,
    surface_id: surfaceId,
    category: normalizedCategory,
    status: normalizeStatus(value.status),
    label,
    summary,
    cause: typeof value.cause === 'string' ? value.cause : null,
    cause_confidence: normalizeConfidence(value.cause_confidence),
    depends_on: Array.isArray(value.depends_on)
      ? value.depends_on.map(normalizeDependencyRef).filter(Boolean) as OperationalReadinessDependencyRef[]
      : [],
    blocked_by: Array.isArray(value.blocked_by)
      ? value.blocked_by.map(normalizeDependencyRef).filter(Boolean) as OperationalReadinessDependencyRef[]
      : [],
    available_actions: Array.isArray(value.available_actions)
      ? value.available_actions.map(normalizeAvailableAction).filter(Boolean) as OperationalReadinessAvailableAction[]
      : [],
    verify_after: Array.isArray(value.verify_after)
      ? value.verify_after.map(normalizeVerifyTarget).filter(Boolean) as OperationalReadinessVerifyTarget[]
      : [],
    next_if_still_failing: Array.isArray(value.next_if_still_failing)
      ? value.next_if_still_failing.map(normalizeNextStep).filter(Boolean) as OperationalReadinessNextStep[]
      : [],
    actionability: normalizeActionability(value.actionability),
    evidence: normalizeEvidence(value.evidence),
    remediation: normalizeString(value.remediation),
    checked_at: normalizeString(value.checked_at),
  };
}

function normalizeSurface(value: unknown, fallback: { id: OperationalReadinessSurfaceId; label: string }): OperationalReadinessSurface {
  if (!isRecord(value)) {
    return {
      id: fallback.id,
      label: fallback.label,
      summary: ZERO_SUMMARY,
      checks: [],
    };
  }

  const id = SURFACE_ORDER.some((surface) => surface.id === value.id) ? (value.id as OperationalReadinessSurfaceId) : fallback.id;
  return {
    id,
    label: normalizeString(value.label, fallback.label),
    summary: normalizeSummary(value.summary),
    checks: Array.isArray(value.checks)
      ? value.checks.map((check) => normalizeCheck(check, id)).filter(Boolean) as OperationalReadinessCheck[]
      : [],
  };
}

function resolvePlatformApiTarget(): {
  platformApiTarget: string;
  baseMode: PlatformApiBaseMode;
} {
  const configured = import.meta.env.VITE_PLATFORM_API_URL?.trim();
  if (configured) {
    return {
      platformApiTarget: configured.replace(/\/+$/, ''),
      baseMode: 'absolute_direct',
    };
  }

  return {
    platformApiTarget: '/platform-api',
    baseMode: 'relative_proxy',
  };
}

function resolveAuthBypassMode(): string {
  return import.meta.env.VITE_AUTH_BYPASS === 'true' ? 'enabled' : 'disabled';
}

export function collectClientDiagnostics(
  bootstrap?: Pick<
    OperationalReadinessBootstrapState,
    'frontend_origin' | 'platform_api_target' | 'base_mode'
  >,
): ClientDiagnostic[] {
  const origin = bootstrap?.frontend_origin ?? (typeof window === 'undefined' ? 'unknown' : window.location.origin);
  const resolved = resolvePlatformApiTarget();
  const platformApiTarget = bootstrap?.platform_api_target ?? resolved.platformApiTarget;
  const baseMode = bootstrap?.base_mode ?? resolved.baseMode;

  return [
    {
      id: 'client.origin',
      label: 'Frontend Origin',
      value: origin,
      summary: 'Current browser origin for this session.',
    },
    {
      id: 'client.platform_api_target',
      label: 'Platform API Target',
      value: platformApiTarget,
      summary: 'Resolved platform API target for this session.',
    },
    {
      id: 'client.platform_api_base_mode',
      label: 'Platform API Base Mode',
      value: baseMode === 'relative_proxy' ? 'relative proxy' : 'absolute direct',
      summary: 'Resolved platform API base mode in the frontend.',
    },
    {
      id: 'client.auth_bypass',
      label: 'Auth Bypass Mode',
      value: resolveAuthBypassMode(),
      summary: 'Frontend auth bypass flag state.',
    },
  ];
}

export function normalizeOperationalReadinessSnapshot(
  snapshot: OperationalReadinessSnapshot,
): OperationalReadinessSnapshot {
  const rawSurfaces = Array.isArray(snapshot.surfaces) ? snapshot.surfaces : [];
  const surfacesById = new Map(
    rawSurfaces
      .map((surface) => {
        const id = isRecord(surface) && SURFACE_ORDER.some((candidate) => candidate.id === surface.id)
          ? (surface.id as OperationalReadinessSurfaceId)
          : null;
        return id ? [id, surface] as const : null;
      })
      .filter(Boolean) as Array<readonly [OperationalReadinessSurfaceId, unknown]>,
  );

  return {
    generated_at: normalizeString(snapshot.generated_at),
    summary: normalizeSummary(snapshot.summary),
    surfaces: SURFACE_ORDER.map((surface) => normalizeSurface(surfacesById.get(surface.id), surface)),
  };
}
