import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const getSessionMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

import {
  classifyBootstrapDiagnosis,
  loadOperationalReadinessWithBootstrap,
  resolvePlatformApiDiagnosticsTarget,
} from './platformApiDiagnostics';

describe('resolvePlatformApiDiagnosticsTarget', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the relative /platform-api proxy target in standard local development', () => {
    vi.stubEnv('VITE_PLATFORM_API_URL', '');

    const resolved = resolvePlatformApiDiagnosticsTarget();

    expect(resolved.frontendOrigin).toBe(window.location.origin);
    expect(resolved.platformApiTarget).toBe('/platform-api');
    expect(resolved.baseMode).toBe('relative_proxy');
    expect(resolved.likelyTargetMismatch).toBe(false);
  });

  it('normalizes absolute direct overrides and flags likely local target mismatches', () => {
    vi.stubEnv('VITE_PLATFORM_API_URL', 'http://localhost:8001/');

    const resolved = resolvePlatformApiDiagnosticsTarget();

    expect(resolved.platformApiTarget).toBe('http://localhost:8001');
    expect(resolved.baseMode).toBe('absolute_direct');
    expect(resolved.likelyTargetMismatch).toBe(true);
  });
});

describe('loadOperationalReadinessWithBootstrap', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-1',
        },
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to the local /platform-api proxy when an absolute direct target fails but the proxy path is healthy', async () => {
    vi.stubEnv('VITE_PLATFORM_API_URL', 'http://localhost:8000');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === 'http://localhost:8000/health') {
        throw new Error('Failed to fetch');
      }
      if (url === '/platform-api/health') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === '/platform-api/admin/runtime/readiness?surface=all') {
        return new Response('{"detail":"Authentication required"}', {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    let snapshotTarget: string | undefined;

    const result = await loadOperationalReadinessWithBootstrap({
      fetchImpl: fetchMock as typeof fetch,
      loadSnapshot: async (platformApiTarget?: string) => {
        snapshotTarget = platformApiTarget;
        return {
          generated_at: '2026-03-30T16:00:00Z',
          summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
          surfaces: [],
        };
      },
    });

    expect(snapshotTarget).toBe('/platform-api');
    expect(result.bootstrap.diagnosis_kind).toBe('ready');
    expect(result.bootstrap.platform_api_target).toBe('/platform-api');
    expect(result.bootstrap.base_mode).toBe('relative_proxy');
    expect(result.bootstrap.probes.find((probe) => probe.probe_id === 'readiness_route_probe')).toMatchObject({
      status: 'ok',
      summary: 'Route is auth-gated as expected.',
      http_status_code: 401,
    });
  });
});

describe('classifyBootstrapDiagnosis', () => {
  it('maps a health probe network failure to an explicit platform_api_unreachable diagnosis', () => {
    const diagnosis = classifyBootstrapDiagnosis({
      frontendOrigin: 'http://localhost:5374',
      platformApiTarget: 'http://localhost:8001',
      baseMode: 'absolute_direct',
      healthProbe: {
        status: 'fail',
        summary: 'Health probe failed before a response returned.',
        detail: 'Failed to fetch',
        targetUrl: 'http://localhost:8001/health',
        httpStatusCode: null,
      },
      readinessRouteProbe: {
        status: 'skipped',
        summary: 'Skipped until health succeeds.',
        detail: 'Health probe did not succeed.',
        targetUrl: 'http://localhost:8001/admin/runtime/readiness?surface=all',
        httpStatusCode: null,
      },
      authTokenPresent: false,
      snapshotResult: {
        status: 'skipped',
        summary: 'Skipped until bootstrap passes.',
        detail: 'The authenticated snapshot request was not attempted.',
        targetUrl: 'http://localhost:8001/admin/runtime/readiness?surface=all',
        httpStatusCode: null,
      },
      likelyTargetMismatch: false,
    });

    expect(diagnosis.diagnosis_kind).toBe('platform_api_unreachable');
    expect(diagnosis.snapshot_available).toBe(false);
    expect(diagnosis.diagnosis_title).toBe('Platform API unreachable');
  });

  it('maps health success plus readiness 404 to a readiness_route_missing diagnosis', () => {
    const diagnosis = classifyBootstrapDiagnosis({
      frontendOrigin: 'http://localhost:5374',
      platformApiTarget: '/platform-api',
      baseMode: 'relative_proxy',
      healthProbe: {
        status: 'ok',
        summary: 'Platform API reachable',
        detail: 'GET /health returned 200.',
        targetUrl: '/platform-api/health',
        httpStatusCode: 200,
      },
      readinessRouteProbe: {
        status: 'fail',
        summary: 'Readiness route returned 404.',
        detail: 'GET /admin/runtime/readiness returned 404.',
        targetUrl: '/platform-api/admin/runtime/readiness?surface=all',
        httpStatusCode: 404,
      },
      authTokenPresent: false,
      snapshotResult: {
        status: 'skipped',
        summary: 'Skipped because the route was missing.',
        detail: 'The authenticated snapshot request was not attempted.',
        targetUrl: '/platform-api/admin/runtime/readiness?surface=all',
        httpStatusCode: null,
      },
      likelyTargetMismatch: false,
    });

    expect(diagnosis.diagnosis_kind).toBe('readiness_route_missing');
    expect(diagnosis.diagnosis_title).toBe('Readiness route unavailable on current backend target');
    expect(diagnosis.snapshot_available).toBe(false);
  });

  it('treats a 401 route probe as expected when the authenticated snapshot succeeds', () => {
    const diagnosis = classifyBootstrapDiagnosis({
      frontendOrigin: 'http://localhost:5374',
      platformApiTarget: '/platform-api',
      baseMode: 'relative_proxy',
      healthProbe: {
        status: 'ok',
        summary: 'Platform API reachable',
        detail: 'GET /health returned 200.',
        targetUrl: '/platform-api/health',
        httpStatusCode: 200,
      },
      readinessRouteProbe: {
        status: 'fail',
        summary: 'GET /admin/runtime/readiness returned 401.',
        detail: 'GET /admin/runtime/readiness returned 401.',
        targetUrl: '/platform-api/admin/runtime/readiness?surface=all',
        httpStatusCode: 401,
      },
      authTokenPresent: true,
      snapshotResult: {
        status: 'ok',
        summary: 'Readiness snapshot loaded',
        detail: 'Authenticated readiness snapshot returned 200.',
        targetUrl: '/platform-api/admin/runtime/readiness?surface=all',
        httpStatusCode: 200,
      },
      likelyTargetMismatch: false,
    });

    expect(diagnosis.diagnosis_kind).toBe('ready');
    expect(diagnosis.snapshot_available).toBe(true);
    expect(diagnosis.probes.find((probe) => probe.probe_id === 'readiness_route_probe')).toMatchObject({
      status: 'ok',
      summary: 'Route is auth-gated as expected.',
      detail:
        'The unauthenticated route probe returned an auth gate, and the authenticated snapshot request succeeded.',
      http_status_code: 401,
    });
  });
});
