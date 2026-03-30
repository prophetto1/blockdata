export type OperationalReadinessStatus = 'ok' | 'warn' | 'fail' | 'unknown';

export type OperationalReadinessSummary = {
  ok: number;
  warn: number;
  fail: number;
  unknown: number;
};

export type OperationalReadinessCheck = {
  id: string;
  category: 'process' | 'config' | 'credential' | 'connectivity' | 'browser-dependent' | 'observability' | 'product';
  status: OperationalReadinessStatus;
  label: string;
  summary: string;
  evidence: Record<string, unknown>;
  remediation: string;
  checked_at: string;
};

export type OperationalReadinessSurfaceId = 'shared' | 'blockdata' | 'agchain';

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

export type ClientDiagnostic = {
  id: string;
  label: string;
  value: string;
  summary: string;
};

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

function resolvePlatformApiBaseMode(): string {
  const configured = import.meta.env.VITE_PLATFORM_API_URL;
  return configured ? `configured ${configured}` : 'relative /platform-api';
}

function resolveAuthBypassMode(): string {
  return import.meta.env.VITE_AUTH_BYPASS === 'true' ? 'enabled' : 'disabled';
}

export function collectClientDiagnostics(): ClientDiagnostic[] {
  const origin = typeof window === 'undefined' ? 'unknown' : window.location.origin;

  return [
    {
      id: 'client.origin',
      label: 'Frontend Origin',
      value: origin,
      summary: 'Current browser origin for this session.',
    },
    {
      id: 'client.platform_api_base_mode',
      label: 'Platform API Base Mode',
      value: resolvePlatformApiBaseMode(),
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
  const surfacesById = new Map(snapshot.surfaces.map((surface) => [surface.id, surface]));

  return {
    ...snapshot,
    surfaces: SURFACE_ORDER.map(({ id, label }) => {
      const surface = surfacesById.get(id);
      return surface ?? {
        id,
        label,
        summary: ZERO_SUMMARY,
        checks: [],
      };
    }),
  };
}
