import { buildPlatformApiUrl, resolvePlatformApiTarget } from '@/lib/platformApi';
import { collectClientDiagnostics, type BootstrapDiagnosisKind, type BootstrapProbeStatus, type OperationalReadinessBootstrapProbe, type OperationalReadinessBootstrapState, type OperationalReadinessSnapshot } from '@/lib/operationalReadiness';
import { supabase } from '@/lib/supabase';

type ProbeResult = {
  status: Exclude<BootstrapProbeStatus, 'pending'>;
  summary: string;
  detail: string;
  targetUrl: string;
  httpStatusCode: number | null;
};

type ClassificationInput = {
  frontendOrigin: string;
  platformApiTarget: string;
  baseMode: OperationalReadinessBootstrapState['base_mode'];
  healthProbe: ProbeResult;
  readinessRouteProbe: ProbeResult;
  authTokenPresent: boolean;
  snapshotResult: ProbeResult;
  likelyTargetMismatch: boolean;
};

type LoadOperationalReadinessWithBootstrapOptions = {
  loadSnapshot: (platformApiTarget?: string) => Promise<OperationalReadinessSnapshot>;
  fetchImpl?: typeof fetch;
};

export type LoadOperationalReadinessWithBootstrapResult = {
  bootstrap: OperationalReadinessBootstrapState;
  snapshot: OperationalReadinessSnapshot | null;
  clientDiagnostics: ReturnType<typeof collectClientDiagnostics>;
};

function probeLabel(probeId: OperationalReadinessBootstrapProbe['probe_id']): string {
  switch (probeId) {
    case 'frontend_origin':
      return 'Frontend origin';
    case 'platform_api_target':
      return 'Platform API target';
    case 'health_probe':
      return 'Health probe';
    case 'readiness_route_probe':
      return 'Readiness route probe';
    case 'auth_token_probe':
      return 'Auth token probe';
    case 'snapshot_request':
      return 'Snapshot request';
  }
}

function createProbe(
  probe_id: OperationalReadinessBootstrapProbe['probe_id'],
  status: BootstrapProbeStatus,
  summary: string,
  detail: string,
  extras: {
    target_url?: string;
    http_status_code?: number | null;
  } = {},
): OperationalReadinessBootstrapProbe {
  return {
    probe_id,
    label: probeLabel(probe_id),
    status,
    summary,
    detail,
    target_url: extras.target_url,
    http_status_code: extras.http_status_code,
  };
}

function probePath(targetUrl: string): string {
  return new URL(targetUrl, typeof window === 'undefined' ? 'http://localhost' : window.location.origin).pathname;
}

function extractHttpStatusFromError(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? Number(match[1]) : null;
}

async function runProbe(fetchImpl: typeof fetch, targetUrl: string): Promise<ProbeResult> {
  try {
    const response = await fetchImpl(targetUrl);
    return {
      status: response.ok ? 'ok' : 'fail',
      summary: `${probePath(targetUrl)} returned ${response.status}.`,
      detail: `GET ${probePath(targetUrl)} returned ${response.status}.`,
      targetUrl,
      httpStatusCode: response.status,
    };
  } catch (error) {
    return {
      status: 'fail',
      summary: 'Request failed before a response returned.',
      detail: error instanceof Error ? error.message : String(error),
      targetUrl,
      httpStatusCode: null,
    };
  }
}

async function resolveLocalAuthTokenPresence(): Promise<{
  tokenPresent: boolean;
  detail: string;
}> {
  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) {
    return {
      tokenPresent: false,
      detail: sessionResult.error.message,
    };
  }

  const tokenPresent = Boolean(sessionResult.data.session?.access_token);
  return {
    tokenPresent,
    detail: tokenPresent ? 'A local access token is present.' : 'The browser session has no local access token.',
  };
}

function isLikelyLocalTargetMismatch(platformApiTarget: string, baseMode: OperationalReadinessBootstrapState['base_mode']): boolean {
  if (baseMode !== 'absolute_direct') return false;

  try {
    const parsed = new URL(platformApiTarget);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    return isLocalHost && parsed.port !== '' && parsed.port !== '8000';
  } catch {
    return false;
  }
}

function diagnosisCopy(kind: BootstrapDiagnosisKind): {
  title: string;
  summary: string;
} {
  switch (kind) {
    case 'platform_api_unreachable':
      return {
        title: 'Platform API unreachable',
        summary: 'The browser could not reach the configured platform API target.',
      };
    case 'readiness_route_missing':
      return {
        title: 'Readiness route unavailable on current backend target',
        summary: 'The backend target responded to health checks but did not expose the readiness route.',
      };
    case 'auth_missing':
      return {
        title: 'Authentication required before loading readiness snapshot',
        summary: 'The readiness route exists, but no local auth token is available yet.',
      };
    case 'auth_rejected':
      return {
        title: 'Authentication rejected',
        summary: 'A local token exists, but the backend rejected the authenticated readiness request.',
      };
    case 'snapshot_http_error':
      return {
        title: 'Readiness snapshot returned an HTTP error',
        summary: 'Bootstrap checks passed, but the authenticated readiness snapshot returned an unexpected HTTP error.',
      };
    case 'preflight_or_cors_failure':
      return {
        title: 'Preflight or CORS failure',
        summary: 'The direct platform API target appears reachable, but the browser could not complete the authenticated snapshot request.',
      };
    case 'target_mismatch':
      return {
        title: 'Platform API target mismatch',
        summary: 'The configured direct platform API target does not match the expected local backend target.',
      };
    case 'unknown_transport_failure':
      return {
        title: 'Unknown transport failure',
        summary: 'The browser failed before a useful backend response could be classified.',
      };
    case 'ready':
      return {
        title: 'Ready',
        summary: 'Bootstrap checks passed and the readiness snapshot is authoritative.',
      };
  }
}

export function resolvePlatformApiDiagnosticsTarget(): {
  frontendOrigin: string;
  platformApiTarget: string;
  baseMode: OperationalReadinessBootstrapState['base_mode'];
  likelyTargetMismatch: boolean;
} {
  const frontendOrigin = typeof window === 'undefined' ? 'unknown' : window.location.origin;
  const { platformApiTarget, baseMode } = resolvePlatformApiTarget();
  return {
    frontendOrigin,
    platformApiTarget,
    baseMode,
    likelyTargetMismatch: isLikelyLocalTargetMismatch(platformApiTarget, baseMode),
  };
}

export function classifyBootstrapDiagnosis(input: ClassificationInput): OperationalReadinessBootstrapState {
  let diagnosisKind: BootstrapDiagnosisKind;

  if (input.likelyTargetMismatch && input.healthProbe.status === 'fail') {
    diagnosisKind = 'target_mismatch';
  } else if (input.healthProbe.status === 'fail') {
    diagnosisKind = 'platform_api_unreachable';
  } else if (input.readinessRouteProbe.httpStatusCode === 404) {
    diagnosisKind = 'readiness_route_missing';
  } else if (
    (input.readinessRouteProbe.httpStatusCode === 401 || input.readinessRouteProbe.httpStatusCode === 403) &&
    !input.authTokenPresent
  ) {
    diagnosisKind = 'auth_missing';
  } else if (input.snapshotResult.httpStatusCode === 401 || input.snapshotResult.httpStatusCode === 403) {
    diagnosisKind = 'auth_rejected';
  } else if (
    input.baseMode === 'absolute_direct' &&
    input.healthProbe.status === 'ok' &&
    input.snapshotResult.status === 'fail' &&
    input.snapshotResult.httpStatusCode === null
  ) {
    diagnosisKind = 'preflight_or_cors_failure';
  } else if (input.snapshotResult.status === 'fail' && input.snapshotResult.httpStatusCode !== null) {
    diagnosisKind = 'snapshot_http_error';
  } else if (input.snapshotResult.status === 'fail') {
    diagnosisKind = 'unknown_transport_failure';
  } else {
    diagnosisKind = 'ready';
  }

  const copy = diagnosisCopy(diagnosisKind);
  const readinessRouteIsExpectedAuthGate =
    diagnosisKind === 'ready' &&
    (input.readinessRouteProbe.httpStatusCode === 401 || input.readinessRouteProbe.httpStatusCode === 403);
  const readinessRouteProbe = readinessRouteIsExpectedAuthGate
    ? {
        ...input.readinessRouteProbe,
        status: 'ok' as const,
        summary: 'Route is auth-gated as expected.',
        detail:
          'The unauthenticated route probe returned an auth gate, and the authenticated snapshot request succeeded.',
      }
    : input.readinessRouteProbe;

  return {
    diagnosis_kind: diagnosisKind,
    diagnosis_title: copy.title,
    diagnosis_summary: copy.summary,
    snapshot_available: diagnosisKind === 'ready',
    base_mode: input.baseMode,
    frontend_origin: input.frontendOrigin,
    platform_api_target: input.platformApiTarget,
    probes: [
      createProbe('frontend_origin', 'ok', 'Current browser origin', input.frontendOrigin),
      createProbe(
        'platform_api_target',
        input.likelyTargetMismatch ? 'warn' : 'ok',
        input.baseMode === 'relative_proxy' ? 'Relative proxy target' : 'Absolute direct target',
        input.platformApiTarget,
      ),
      createProbe(
        'health_probe',
        input.healthProbe.status,
        input.healthProbe.summary,
        input.healthProbe.detail,
        {
          target_url: input.healthProbe.targetUrl,
          http_status_code: input.healthProbe.httpStatusCode,
        },
      ),
      createProbe(
        'readiness_route_probe',
        readinessRouteProbe.status,
        readinessRouteProbe.summary,
        readinessRouteProbe.detail,
        {
          target_url: readinessRouteProbe.targetUrl,
          http_status_code: readinessRouteProbe.httpStatusCode,
        },
      ),
      createProbe(
        'auth_token_probe',
        input.authTokenPresent ? 'ok' : 'fail',
        input.authTokenPresent ? 'Local token available' : 'No token available',
        input.authTokenPresent
          ? 'The browser session has a local access token.'
          : 'The browser session has no local access token.',
      ),
      createProbe(
        'snapshot_request',
        input.snapshotResult.status,
        input.snapshotResult.summary,
        input.snapshotResult.detail,
        {
          target_url: input.snapshotResult.targetUrl,
          http_status_code: input.snapshotResult.httpStatusCode,
        },
      ),
    ],
  };
}

export async function loadOperationalReadinessWithBootstrap({
  loadSnapshot,
  fetchImpl = fetch,
}: LoadOperationalReadinessWithBootstrapOptions): Promise<LoadOperationalReadinessWithBootstrapResult> {
  const { frontendOrigin, platformApiTarget, baseMode, likelyTargetMismatch } =
    resolvePlatformApiDiagnosticsTarget();
  const defaultProxyTarget = '/platform-api';

  let effectivePlatformApiTarget = platformApiTarget;
  let effectiveBaseMode = baseMode;
  let healthProbe = await runProbe(fetchImpl, buildPlatformApiUrl('/health', effectivePlatformApiTarget));

  if (
    baseMode === 'absolute_direct' &&
    healthProbe.status === 'fail' &&
    platformApiTarget !== defaultProxyTarget
  ) {
    const proxyHealthProbe = await runProbe(fetchImpl, buildPlatformApiUrl('/health', defaultProxyTarget));
    if (proxyHealthProbe.status === 'ok') {
      effectivePlatformApiTarget = defaultProxyTarget;
      effectiveBaseMode = 'relative_proxy';
      healthProbe = proxyHealthProbe;
    }
  }

  const readinessUrl = buildPlatformApiUrl('/admin/runtime/readiness?surface=all', effectivePlatformApiTarget);
  const readinessRouteProbe =
    healthProbe.status === 'ok'
      ? await runProbe(fetchImpl, readinessUrl)
      : {
          status: 'skipped',
          summary: 'Skipped until health succeeds.',
          detail: 'The health probe did not succeed, so route probing was skipped.',
          targetUrl: readinessUrl,
          httpStatusCode: null,
        } satisfies ProbeResult;
  const authState = await resolveLocalAuthTokenPresence();

  let snapshot: OperationalReadinessSnapshot | null = null;
  let snapshotResult: ProbeResult;

  if (healthProbe.status !== 'ok') {
    snapshotResult = {
      status: 'skipped',
      summary: 'Skipped until bootstrap passes.',
      detail: 'The authenticated snapshot request was not attempted.',
      targetUrl: readinessUrl,
      httpStatusCode: null,
    };
  } else if (readinessRouteProbe.httpStatusCode === 404) {
    snapshotResult = {
      status: 'skipped',
      summary: 'Skipped because the route was missing.',
      detail: 'The authenticated snapshot request was not attempted.',
      targetUrl: readinessUrl,
      httpStatusCode: null,
    };
  } else if (
    (readinessRouteProbe.httpStatusCode === 401 || readinessRouteProbe.httpStatusCode === 403) &&
    !authState.tokenPresent
  ) {
    snapshotResult = {
      status: 'skipped',
      summary: 'Skipped until auth exists.',
      detail: 'The authenticated snapshot request was not attempted.',
      targetUrl: readinessUrl,
      httpStatusCode: null,
    };
  } else {
    try {
      snapshot = await loadSnapshot(effectivePlatformApiTarget);
      snapshotResult = {
        status: 'ok',
        summary: 'Readiness snapshot loaded',
        detail: 'Authenticated readiness snapshot returned 200.',
        targetUrl: readinessUrl,
        httpStatusCode: 200,
      };
    } catch (error) {
      const httpStatusCode = extractHttpStatusFromError(error);
      snapshotResult = {
        status: 'fail',
        summary:
          httpStatusCode === null
            ? 'The snapshot request failed before a response returned.'
            : `The snapshot request returned ${httpStatusCode}.`,
        detail: error instanceof Error ? error.message : String(error),
        targetUrl: readinessUrl,
        httpStatusCode,
      };
    }
  }

  const bootstrap = classifyBootstrapDiagnosis({
    frontendOrigin,
    platformApiTarget: effectivePlatformApiTarget,
    baseMode: effectiveBaseMode,
    healthProbe,
    readinessRouteProbe,
    authTokenPresent: authState.tokenPresent,
    snapshotResult,
    likelyTargetMismatch: effectivePlatformApiTarget === defaultProxyTarget ? false : likelyTargetMismatch,
  });

  return {
    bootstrap,
    snapshot,
    clientDiagnostics: collectClientDiagnostics(bootstrap),
  };
}
