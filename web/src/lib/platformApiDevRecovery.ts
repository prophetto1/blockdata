export const PLATFORM_API_DEV_STATUS_ROUTE = '/__admin/platform-api/status';
export const PLATFORM_API_DEV_RECOVER_ROUTE = '/__admin/platform-api/recover';

export type PlatformApiDevListener = {
  running: boolean;
  pid: number | null;
  started_at: string | null;
  command_line: string | null;
  parent_pid: number | null;
  source: string;
};

export type PlatformApiDevLaunchHygiene = {
  approved_bootstrap: string;
  provenance_basis: string;
  env_loaded: boolean;
  repo_root_match: boolean;
  state_file_present: boolean;
  state_path: string | null;
  state_written_at: string | null;
};

export type PlatformApiDevStatus = {
  available_action: string;
  port: number;
  listener: PlatformApiDevListener;
  launch_hygiene: PlatformApiDevLaunchHygiene;
  last_probe: {
    health_ok: boolean;
    ready_ok: boolean;
    detail: string;
  };
  result: 'ok' | 'warn' | 'fail' | 'unknown';
};

export type PlatformApiDevRecoveryStep = {
  step: string;
  ok: boolean;
  pid?: number | null;
  status_code?: number | null;
  detail: string;
};

export type PlatformApiDevRecoveryResult = {
  ok: boolean;
  result: 'ok' | 'fail';
  action: string;
  listener_before: PlatformApiDevListener;
  listener_after: PlatformApiDevListener;
  steps: PlatformApiDevRecoveryStep[];
  health_status_code: number | null;
  ready_status_code: number | null;
  failure_reason: string | null;
  state: PlatformApiDevStatus;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload.failure_reason === 'string' && payload.failure_reason.trim()) {
    return payload.failure_reason;
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail;
  }

  return fallback;
}

async function requestJson(path: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(path, init);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(messageFromPayload(payload, `${init.method ?? 'GET'} ${path} failed: ${response.status}`));
  }

  return payload;
}

export function isPlatformApiDevRecoveryEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export async function loadPlatformApiDevRecoveryStatus(): Promise<PlatformApiDevStatus> {
  const payload = await requestJson(PLATFORM_API_DEV_STATUS_ROUTE, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  return payload as PlatformApiDevStatus;
}

export async function recoverPlatformApi(): Promise<PlatformApiDevRecoveryResult> {
  const payload = (await requestJson(PLATFORM_API_DEV_RECOVER_ROUTE, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })) as PlatformApiDevRecoveryResult;

  if (!payload.ok) {
    throw new Error(messageFromPayload(payload, 'Platform API recovery failed.'));
  }

  return payload;
}
